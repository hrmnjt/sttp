"""Generated-site regression checks. Uses only Python's standard library and Hugo."""
import base64
import faulthandler
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import re
import tempfile
import tomllib
import unittest
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET
from html import unescape
from html.parser import HTMLParser


ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.elements = []
        self.ids = []
        self.links = []
        self.aria_refs = []
        self.meta = {}
        self.schemas = []
        self.scripts = []
        self.entries = []    # ledger rows outside "backlinks", in document order
        self.backlink_rows = []  # "backlinks" rows, in document order
        self.backlinks = {}  # the same rows by kind: related-shards, related-builds
        self.navs = {}       # aria-label -> the attributes of each link inside
        self.rules = []      # the text of every labelled rule
        self.main_text = []
        self._main = False
        self._ledger = False
        self._in_backlinks = False
        self._row = None
        self._capture = None
        self._nav = None
        self._rule = None
        self._script = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = attrs.get("class", "").split()
        self.elements.append((tag, attrs))
        if "id" in attrs:
            self.ids.append(attrs["id"])
        for attribute in ("aria-labelledby", "aria-describedby"):
            self.aria_refs.extend(attrs.get(attribute, "").split())
        if tag == "nav":
            self._nav = attrs.get("aria-label")
            self.navs.setdefault(self._nav, [])
        if tag == "a" and self._nav in self.navs:
            self.navs[self._nav].append(attrs)
        if "rule-heading" in classes:
            self._rule = ""
        if tag == "section" and "backlinks" in classes:
            self._in_backlinks = True
        if tag == "main":
            self._main = True
        if tag == "meta":
            self.meta[attrs.get("name", attrs.get("property"))] = attrs.get("content")
        if tag in ("a", "link", "img"):
            self.links.append((tag, attrs))
        if tag == "script":
            self.scripts.append(attrs)
            self._script = ""
        if tag == "ol" and "ledger" in classes:
            self._ledger = True
        if self._ledger:
            if tag == "li":
                self._row = {"date": "", "kind": "", "title": "", "url": ""}
            if self._row is not None:
                if tag == "time":
                    self._row["date"] = attrs["datetime"]
                if tag == "span" and "content-kind" in classes:
                    self._capture = "kind"
                if tag == "a" and "row-title" in classes:
                    self._row["url"] = attrs["href"]
                    self._capture = "title"

    def handle_endtag(self, tag):
        if tag == "nav":
            self._nav = None
        if self._rule is not None and tag in ("h2", "h3", "p"):
            self.rules.append(" ".join(self._rule.split()))
            self._rule = None
        if tag == "section":
            self._in_backlinks = False
        if tag == "main":
            self._main = False
        if tag == "script" and self._script is not None:
            if self.scripts[-1].get("type") == "application/ld+json":
                self.schemas.append(json.loads(self._script))
            self._script = None
        if self._ledger:
            if tag in ("span", "a"):
                self._capture = None
            if tag == "li" and self._row is not None:
                if self._in_backlinks:
                    self.backlink_rows.append(self._row)
                    group = "related-%ss" % self._row["kind"].strip("[]")
                    self.backlinks.setdefault(group, []).append(self._row)
                else:
                    self.entries.append(self._row)
                self._row = None
            if tag == "ol":
                self._ledger = False

    def handle_data(self, text):
        if self._rule is not None:
            self._rule += text
        if self._main:
            self.main_text.append(text)
        if self._script is not None:
            self._script += text
        if self._row is not None and self._capture:
            self._row[self._capture] += text

    def count(self, tag, cls):
        return sum(t == tag and cls in attrs.get("class", "").split() for t, attrs in self.elements)

    def text(self):
        return " ".join(" ".join(self.main_text).split())


class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # The suite takes seconds. If it is still running after three minutes, print where
        # every thread is and stop, rather than hang until the CI job is killed.
        faulthandler.dump_traceback_later(180, exit=True)
        cls.addClassCleanup(faulthandler.cancel_dump_traceback_later)
        cls.tmp = tempfile.TemporaryDirectory(prefix="sttp-tests-")
        cls.addClassCleanup(cls.tmp.cleanup)
        cls.source = Path(cls.tmp.name) / "source"
        cls.source.mkdir()
        for directory in ("assets", "content", "data", "layouts", "static"):
            shutil.copytree(ROOT / directory, cls.source / directory)
        shutil.copy(ROOT / "hugo.toml", cls.source / "hugo.toml")
        # Interleave all stream types, with repeated headings and footnotes in WAL.
        cls.fixtures = {
            "wal/test-first.md": ('"log fixture first"', "2026-03-05", None),
            "builds/test-build.md": ('"zz build fixture"', "2026-03-04",
                                     'related_shards = ["/shards/2026-02-01-dev", "/shards/test-shard"]\n'
                                     'related_builds = ["/builds/dev"]\n'),
            "shards/test-shard.md": ('"shard fixture"', "2026-03-03",
                                     'slug = "timeline-fixture"\nlastmod = 2026-09-26\n'
                                     'related_builds = ["/builds/dev", "/builds/dev", "/builds/test-build"]\n'
                                     'related_shards = ["/shards/2026-02-01-dev", "/shards/2026-02-08-rfd"]\n'),
            "wal/test-second.md": ('"log fixture second"', "2026-03-02", None),
        }
        for name, (title, date, extra) in cls.fixtures.items():
            (cls.source / "content" / name).write_text(
                f"+++\ntitle = {title}\ndate = {date}\ndraft = true\n{extra or ''}+++\n\n"
                "## repeated heading\n\n"
                "Full entry body, not a truncated summary. A note[^1].\n\n"
                "[Jump](#repeated-heading).\n\n[^1]: Footnote text.\n\n"
                '<figure aria-labelledby="caption" aria-describedby="details">'
                '<figcaption id="caption">A caption</figcaption><p id="details">Details</p></figure>\n'
                '\n```python\nprint("fixture")\n```\n\n```\nliteral <tag> & text\n```\n'

            )
        with (cls.source / "content/builds/test-build.md").open("a") as fixture:
            fixture.write('\n{{< img-optimized src="duckdb-query.png" alt="Captioned fixture" '
                          'caption="A *captioned* fixture" >}}\n')
        # Every footnote shape: short and cited once, two paragraphs, and cited twice.
        (cls.source / "content/shards/test-notes.md").write_text(
            '+++\ntitle = "note shapes"\ndate = 2026-01-15\ndraft = true\n+++\n\n'
            'One[^a] two[^b] three[^c] and again[^c].\n\n'
            '[^a]: Short, cited once, costs $1 and keeps `$HOME`.\n'
            '[^b]: First paragraph.\n\n    Second paragraph.\n'
            '[^c]: Cited twice.\n')
        # One fence with its drawing in place, as `npm run diagrams` would leave it, and one without.
        cls.flow = "flowchart LR\n    A --> B"
        cls.flow_key = hashlib.sha256(cls.flow.encode()).hexdigest()[:16]
        drawings = cls.source / "assets/images/diagrams"
        drawings.mkdir(parents=True, exist_ok=True)
        (drawings / f"{cls.flow_key}.svg").write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 48"><rect width="120" height="48"/></svg>\n')
        (cls.source / "content/shards/test-diagrams.md").write_text(
            '+++\ntitle = "diagram shapes"\ndate = 2026-01-16\ndraft = true\n+++\n\n'
            f'```mermaid {{alt="A leads to B"}}\n{cls.flow}\n```\n\n'
            '```mermaid\ngraph TD\n    not --> drawn\n```\n')
        # An index rendering image-bearing WAL entries also needs the viewer.
        with (cls.source / "content/wal/test-first.md").open("a") as fixture:
            fixture.write('\n{{< img-optimized src="duckdb-query.png" alt="WAL image fixture" >}}\n')
        cls.release = Path(cls.tmp.name) / "release"
        cls.drafts = Path(cls.tmp.name) / "drafts"
        for output, extra in ((cls.release, []), (cls.drafts, ["--buildDrafts"])):
            result = cls.build(output, extra)
            if result.returncode:
                raise RuntimeError(result.stdout)
        cls.pages = {
            output: {p: Page(p) for p in output.rglob("*.html")}
            for output in (cls.release, cls.drafts)
        }

    @classmethod
    def build(cls, output, extra=()):
        command = [os.environ.get("HUGO_BIN", "hugo"), "--source", str(cls.source),
                   "--destination", str(output), "--cleanDestinationDir",
                   "--panicOnWarning", "--printPathWarnings", *extra]
        try:
            return subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                  text=True, timeout=60)
        except subprocess.TimeoutExpired as stuck:
            # A build takes well under a second. Name the one that hung and show what it printed.
            printed = stuck.output.decode(errors="replace") if isinstance(stuck.output, bytes) else stuck.output
            raise RuntimeError(f"hugo was still running after 60s: {' '.join(command)}\n{printed or ''}") from None

    def page(self, output, route):
        return self.pages[output][output / route]

    def test_catalog_is_one_complete_descending_timeline(self):
        for output in (self.release, self.drafts):
            entries = self.page(output, "catalog/index.html").entries
            dates = [entry["date"] for entry in entries]
            self.assertEqual(dates, sorted(dates, reverse=True))
            self.assertNotIn("0001-01-01", dates)
            urls = [entry["url"] for entry in entries]
            self.assertEqual(len(urls), len(set(urls)))
            self.assertIn("/builds/dev/", urls)
            self.assertIn("/readme/", urls)
            for directory in ("/", "/builds/", "/shards/", "/wal/", "/catalog/"):
                self.assertNotIn(directory, urls)
            dev = next(entry for entry in entries if entry["url"] == "/builds/dev/")
            self.assertEqual(dev["kind"], "[build]")
            self.assertEqual(dev["date"], "2026-09-26")  # not its February shard date
            readme = next(entry for entry in entries if entry["url"] == "/readme/")
            self.assertEqual(readme["date"], "2026-09-26")  # not September lastmod
        entries = self.page(self.drafts, "catalog/index.html").entries
        kinds = [entry["kind"] for entry in entries if "fixture" in entry["title"]]
        self.assertEqual(kinds, ["[wal]", "[build]", "[shard]", "[wal]"])

    def test_rss_and_catalog_have_identical_content_order(self):
        for output in (self.release, self.drafts):
            expected = ["https://hrmnjt.dev" + entry["url"]
                        for entry in self.page(output, "catalog/index.html").entries]
            for route in ("index.xml", "catalog/index.xml"):
                items = ET.parse(output / route).findall("./channel/item")
                self.assertEqual([item.findtext("link") for item in items], expected)
                self.assertTrue(all("0001" not in item.findtext("pubDate") for item in items))
                self.assertTrue(all(item.findtext("description") for item in items))
            # All feed/sitemap outputs must be well-formed XML.
            for path in output.rglob("*.xml"):
                ET.parse(path)
            shard_items = ET.parse(output / "shards/index.xml").findall("./channel/item")
            self.assertTrue(all("/builds/" not in item.findtext("link") for item in shard_items))

    def test_drafts_do_not_leak_into_release(self):
        release = "".join(p.read_text() for p in self.release.rglob("*.html"))
        release += (self.release / "index.xml").read_text()
        for title in ("sample: earlier note", "sample: check-in", "sample: a decision", "sample: next step"):
            self.assertNotIn(title, release)
        for title, _, _ in self.fixtures.values():
            self.assertNotIn(title.strip('"'), release)
        home = " ".join(self.page(self.release, "index.html").main_text)
        self.assertNotIn("fully committed", home)  # no empty WAL preview
        self.assertNotIn("readme", home)  # footer only, not a homepage lane
        self.assertIn("fully committed", " ".join(self.page(self.drafts, "index.html").main_text))
        for route in ("work", "readme/about", "readme/ai", "readme/privacy", "readme/licensing"):
            self.assertFalse((self.release / route).exists())
        self.assertFalse((self.release / "site.webmanifest").exists())

    def test_shared_frame_aligns_every_page(self):
        for output in (self.release, self.drafts):
            for path, page in self.pages[output].items():
                bodies = [attrs for tag, attrs in page.elements if tag == "body"]
                mains = [attrs for tag, attrs in page.elements if tag == "main"]
                self.assertEqual(len(bodies), 1)
                self.assertEqual(len(mains), 1)
                self.assertNotIn("wide-layout", bodies[0].get("class", "").split())
                route = path.relative_to(output).as_posix()
                # No page opts out of the shared left rail, including the 404.
                self.assertNotIn("class", mains[0], route)
                for tag, attrs in page.elements:
                    if tag == "article" and "aria-labelledby" not in attrs:
                        self.assertEqual(attrs.get("class"), "article-wide", route)

    def test_section_indexes_group_intro_and_decorative_mark(self):
        for output in (self.release, self.drafts):
            for section in ("shards", "builds", "wal", "catalog"):
                page = self.page(output, f"{section}/index.html")
                self.assertEqual(sum(tag == "section" and "section-index" in
                                     attrs.get("class", "").split() for tag, attrs in page.elements), 1)
                self.assertEqual(sum(tag == "div" and attrs.get("class") == "section-intro"
                                     for tag, attrs in page.elements), 1)
                marks = [attrs for tag, attrs in page.links if tag == "img"
                         and "/doodles/" in attrs.get("src", "")]
                self.assertEqual(len(marks), 1)
                self.assertIn("alt", marks[0])
                self.assertFalse(marks[0]["alt"])
                self.assertEqual(marks[0]["aria-hidden"], "true")

    def test_wide_articles_keep_prose_separate_from_page_furniture(self):
        for output in (self.release, self.drafts):
            routes = ["2026/02/08/rfd/index.html", "builds/dev/index.html",
                      "readme/index.html"]
            if output == self.drafts:
                routes.append("wal/test-first/index.html")
            for route in routes:
                page = self.page(output, route)
                self.assertEqual(sum(tag == "article" and attrs.get("class") == "article-wide"
                                     for tag, attrs in page.elements), 1)
                self.assertEqual(sum(tag == "div" and attrs.get("class") == "article-prose"
                                     for tag, attrs in page.elements), 1)
            harlequin = self.page(output, "2024/12/02/readdatawithharlequin/index.html")
            self.assertEqual(harlequin.count("figure", "article-image"), 2)

    def test_backlinks_and_source_share_one_labelled_closing_area(self):
        for output in (self.release, self.drafts):
            routes = ["2026/02/01/dev/index.html", "2026/02/08/rfd/index.html",
                      "builds/dev/index.html", "readme/index.html"]
            if output == self.drafts:
                routes.append("wal/test-first/index.html")
            for route in routes:
                page = self.page(output, route)
                self.assertEqual(page.count("footer", "article-meta"), 1)
                html = (output / route).read_text()
                start = html.index('article-meta')
                closing = html[start:html.index('</footer>', start)]
                # Labelled rules are real headings, so the closing area is navigable.
                self.assertIn(("h2", {"class": "rule-heading", "id": "article-source"}), page.elements)
                self.assertIn("article-source", closing)
                self.assertIn('aria-label="Markdown source"', closing)
                self.assertIn("[markdown] [history]", page.text())
                self.assertEqual(page.count("section", "source-trail"), 1)
                self.assertEqual(bool(page.backlink_rows), "article-backlinks" in closing)
                if page.backlink_rows:
                    self.assertIn(("h2", {"class": "rule-heading", "id": "article-backlinks"}), page.elements)
                    self.assertLess(closing.index("article-backlinks"), closing.index("article-source"))
                    self.assertLess(page.rules.index("backlinks"), page.rules.index("source"))

    def test_address_line_is_a_breadcrumb_back_to_the_section(self):
        for output in (self.release, self.drafts):
            routes = [("index.html", ["/"], "/"),
                      ("2026/02/08/rfd/index.html", ["/", "/shards/"], None),
                      ("builds/dev/index.html", ["/", "/builds/"], None),
                      ("shards/index.html", ["/", "/shards/"], "/shards/"),
                      ("catalog/index.html", ["/", "/catalog/"], "/catalog/"),
                      ("readme/index.html", ["/", "/readme/"], "/readme/"),
                      ("404.html", ["/"], None)]
            if output == self.drafts:
                routes.append(("wal/test-first/index.html", ["/", "/wal/"], None))
            for route, crumbs, current in routes:
                page = self.page(output, route)
                trail = page.navs["Breadcrumb"]
                self.assertEqual([link["href"] for link in trail], crumbs, route)
                self.assertEqual([link["href"] for link in trail if link.get("aria-current") == "page"],
                                 [current] if current else [], route)
                # The scheme is decoration; the address replaces the old back-link row.
                self.assertIn('<span aria-hidden=true>sttp://</span>', (output / route).read_text())
                self.assertEqual(page.count("p", "back-link"), 0)
                # The joke is explained once, on the home page.
                self.assertEqual(page.count("p", "protocol-expansion"), int(route == "index.html"))

    def test_home_profile_keeps_authored_strikethrough_history(self):
        for output in (self.release, self.drafts):
            page = self.page(output, "index.html")
            self.assertEqual(sum(tag == "del" for tag, _ in page.elements), 4)
            for url in ("https://www.mu-sigma.com/", "https://www.majidalfuttaim.com/",
                        "https://www.doh.gov.ae/en/"):
                self.assertIn(url, [attrs.get("href") for _, attrs in page.links])
            text = " ".join(page.main_text)
            for phrase in ("backend applications", "system programming", "wild-wild internet"):
                self.assertIn(phrase, text)

    def test_article_images_reserve_dimensions_and_link_to_full_size(self):
        for output in (self.release, self.drafts):
            for path, page in self.pages[output].items():
                links = [attrs for tag, attrs in page.links
                         if tag == "a" and attrs.get("class") == "image-fullsize"]
                for link in links:
                    images = [attrs for tag, attrs in page.links
                              if tag == "img" and attrs.get("src") == link["href"]]
                    self.assertEqual(len(images), 1)
                    image = images[0]
                    self.assertGreater(int(image["width"]), 0)
                    self.assertGreater(int(image["height"]), 0)
                    self.assertEqual(image["loading"], "lazy")
                    self.assertEqual(image["decoding"], "async")
                    self.assertIn(image["alt"], link["aria-label"])
                    self.assertTrue(link["aria-label"].startswith("View full-size image:"))
                    self.assertTrue((output / link["href"].lstrip("/")).is_file())
            harlequin = self.page(output, "2024/12/02/readdatawithharlequin/index.html")
            self.assertEqual(sum(tag == "a" and attrs.get("class") == "image-fullsize"
                                 for tag, attrs in harlequin.links), 2)

    def test_catalog_type_tokens_preserve_explicit_text_labels(self):
        for output in (self.release, self.drafts):
            page = self.page(output, "catalog/index.html")
            tokens = [attrs["data-kind"] for tag, attrs in page.elements
                      if tag == "span" and attrs.get("class") == "content-kind"]
            self.assertEqual(tokens, [entry["kind"].strip("[]") for entry in page.entries])
            self.assertTrue(set(tokens) <= {"shard", "build", "wal", "readme"})
            if output == self.drafts:
                self.assertEqual(set(tokens), {"shard", "build", "wal", "readme"})

    def test_kind_marks_are_decorative_and_take_their_label_colour(self):
        registry = tomllib.loads((ROOT / "data/kinds.toml").read_text())["kind"]
        names = {kind["name"] for kind in registry}
        self.assertEqual(names, {"shard", "build", "wal", "readme"})
        for kind in registry:
            self.assertEqual(bool(kind.get("stream")), "note" in kind, kind["section"])
            # Each kind carries its own glyph: a viewBox and a path.
            self.assertEqual(set(kind["glyph"]), {"box", "path"}, kind["section"])
        for output in (self.release, self.drafts):
            page = self.page(output, "catalog/index.html")
            marks = [attrs for tag, attrs in page.elements
                     if tag == "svg" and attrs.get("class") == "kind-mark"]
            # Every row has a glyph, readme included; the text label still names the kind.
            self.assertEqual(len(marks), len(page.entries))
            for mark in marks:
                self.assertEqual(mark["aria-hidden"], "true")
                self.assertEqual(mark["stroke"], "currentColor")
            self.assertEqual({mark["viewbox"] for mark in marks},
                             {kind["glyph"]["box"] for kind in registry
                              if f'[{kind["name"]}]' in {entry["kind"] for entry in page.entries}})
            self.assertFalse([s for s in page.scripts if s.get("src")])
            for path, other in self.pages[output].items():
                tags = [attrs["data-kind"] for tag, attrs in other.elements
                        if tag == "span" and attrs.get("class") == "content-kind"]
                self.assertTrue(set(tags) <= names, str(path))
                # Glyph and label always travel together.
                self.assertEqual(other.count("svg", "kind-mark"), len(tags), str(path))
        # The coloured set is closed at three Gruvbox entries; sketches keep the green accent.
        css = (ROOT / "assets/css/main.css").read_text()
        self.assertEqual(sorted(set(re.findall(r"--kind-[a-z]+(?=:)", css))),
                         ["--kind-build", "--kind-shard", "--kind-wal"])
        for token in ("--kind-shard", "--kind-build", "--kind-wal"):
            self.assertRegex(css.split(f"{token}: ")[1].split(";")[0], r"^var\(--gb-[a-z]+\)$")
        for sketch in ("shards", "builds", "wal", "catalog"):
            self.assertIn("#b8bb26", (ROOT / f"assets/images/doodles/{sketch}.svg").read_text())
        # Every article names its own kind first, in its date line.
        for route, kind in (("2026/02/08/rfd/index.html", "shard"), ("builds/dev/index.html", "build"),
                            ("readme/index.html", "readme")):
            tokens = [attrs["data-kind"] for tag, attrs in self.page(self.release, route).elements
                      if tag == "span" and attrs.get("class") == "content-kind"]
            self.assertEqual(tokens[0], kind, route)
        # A link declared on one post shows on both: part ii names part i.
        for route, other in (("2023/12/06/gitorg/index.html", "/2024/02/18/gitmoreorg/"),
                             ("2024/02/18/gitmoreorg/index.html", "/2023/12/06/gitorg/")):
            self.assertEqual([row["url"] for row in self.page(self.release, route).backlink_rows], [other])
        # Backlinks are one list, newest first, with the kind on each row.
        ivanti = self.page(self.release, "2026/03/06/ivanti-osascript/index.html")
        self.assertEqual([row["kind"] for row in ivanti.backlink_rows], ["[build]", "[shard]"])

    def test_header_links_every_populated_stream_and_marks_where_you_are(self):
        for output, streams in ((self.release, ["/shards/", "/builds/"]),
                                (self.drafts, ["/shards/", "/builds/", "/wal/"])):
            for route, current in (("404.html", None), ("index.html", None),
                                   ("builds/index.html", ("/builds/", "page")),
                                   ("builds/dev/index.html", ("/builds/", "true")),
                                   ("2026/02/08/rfd/index.html", ("/shards/", "true")),
                                   ("catalog/index.html", ("/catalog/", "page"))):
                page = self.page(output, route)
                primary = page.navs["Primary"]
                self.assertEqual([link["href"] for link in primary], streams + ["/catalog/"], route)
                marked = [(link["href"], link["aria-current"]) for link in primary if "aria-current" in link]
                self.assertEqual(marked, [current] if current else [], route)
                # One asterisk beside the current entry, hidden from assistive technology.
                marks = [attrs for tag, attrs in page.elements
                         if tag == "span" and attrs.get("class") == "nav-mark"]
                expected = len(marked) + int(route == "readme/index.html")
                self.assertEqual(len(marks), expected, route)
                self.assertTrue(all(mark.get("aria-hidden") == "true" for mark in marks))
                self.assertEqual([link["href"] for link in page.navs["Site"]], ["/readme/", "/index.xml"])

    def test_builds_lead_with_their_code_link(self):
        for output in (self.release, self.drafts):
            build = (output / "builds/dev/index.html").read_text()
            self.assertLess(build.index("article-lead"), build.index("article-prose"))
            footer = build[build.index("article-meta"):]
            self.assertNotIn("[code]", footer[:footer.index("</footer>")])
            self.assertIn("github.com/hrmnjt/dev", self.page(output, "builds/dev/index.html").text())
            # A shard with a repository keeps its link with the rest of its source.
            shard = (output / "2026/02/01/dev/index.html").read_text()
            self.assertNotIn("article-lead", shard)

    def test_sidenotes_stay_in_reading_order_as_notes(self):
        page = self.page(self.drafts, "builds/dolor-sit-amet/index.html")
        notes = [attrs for tag, attrs in page.elements
                 if tag == "span" and attrs.get("class") == "sidenote"]
        self.assertEqual(len(notes), 2)
        self.assertTrue(all(attrs.get("role") == "note" for attrs in notes))
        self.assertIn("Sample sidenote", " ".join(page.main_text))
        shard = " ".join(" ".join(self.page(self.release, "2026/02/08/rfd/index.html").main_text).split())
        self.assertRegex(shard, r"\[shard\] \| 2026-02-08 \| [\d,]+ words \| \d+ min read")

    def test_404_points_to_the_catalog_on_the_shared_rail(self):
        page = self.page(self.release, "404.html")
        self.assertIn("/catalog/", [attrs.get("href") for tag, attrs in page.links if tag == "a"])
        self.assertNotIn("all shards", " ".join(page.main_text))
        # A database-flavoured error, then the same thing in plain words.
        self.assertIn("ERROR: relation does not exist HINT:", page.text())
        self.assertIn("Nothing lives at this address.", page.text())

    def test_footer_keeps_licensing_caveat_separate_from_navigation(self):
        for output in (self.release, self.drafts):
            for page in self.pages[output].values():
                self.assertEqual(sum(tag == "p" and attrs.get("class") == "footer-legal"
                                     for tag, attrs in page.elements), 1)
                self.assertIn("/readme/#reuse", [attrs.get("href") for _, attrs in page.links])
                self.assertIn("https://github.com/hrmnjt/sttp/blob/main/LICENSE",
                              [attrs.get("href") for _, attrs in page.links])
                licences = [attrs.get("href") for tag, attrs in page.links
                            if tag == "a" and attrs.get("rel") == "license"]
                self.assertEqual(licences, ["https://creativecommons.org/licenses/by/4.0/"])
                self.assertNotIn("under review", (ROOT / "content/readme/_index.md").read_text())

    def test_home_leads_with_the_head_of_the_catalog_then_a_directory(self):
        for output, streams in ((self.release, 2), (self.drafts, 3)):
            home = self.page(output, "index.html")
            dated = [entry for entry in self.page(output, "catalog/index.html").entries
                     if entry["url"] != "/readme/"]
            self.assertGreater(len(dated), 8)
            self.assertEqual(home.entries, dated[:8])
            self.assertEqual(home.rules, ["recent", "sections"])
            self.assertIn("/catalog/", [attrs.get("href") for tag, attrs in home.links if tag == "a"])
            # One directory row per populated stream: its sketch, its name and its one line.
            directories = [attrs for tag, attrs in home.elements
                           if tag == "ul" and attrs.get("class") == "section-directory"]
            self.assertEqual([attrs.get("role") for attrs in directories], ["list"])
            sketches = [attrs for tag, attrs in home.links if tag == "img" and "/doodles/" in attrs["src"]]
            self.assertEqual(len(sketches), streams)
            self.assertTrue(all(not attrs["alt"] and attrs["aria-hidden"] == "true" for attrs in sketches))
            self.assertIn("sections shards Partitioned thoughts. No global ordering promised. "
                          "builds Things that escaped the scratch buffer.", home.text())
            self.assertNotRegex(home.text(), r"\d+ rows?\b")

    def test_build_layout_samples_are_preview_only(self):
        for slug in ("lorem-ipsum", "dolor-sit-amet"):
            route = f"/builds/{slug}/"
            self.assertFalse((self.release / route.lstrip("/")).exists())
            self.assertTrue((self.drafts / route.lstrip("/") / "index.html").exists())
            for directory in ("index.html", "builds/index.html", "catalog/index.html"):
                for output, present in ((self.release, False), (self.drafts, True)):
                    urls = [attrs.get("href") for tag, attrs in self.page(output, directory).links
                            if tag == "a"]
                    self.assertEqual(route in urls, present, f"{directory}: {route}")
            for output, present in ((self.release, False), (self.drafts, True)):
                items = ET.parse(output / "index.xml").findall("./channel/item")
                self.assertEqual("https://hrmnjt.dev" + route in
                                 [item.findtext("link") for item in items], present)

    def test_build_rows_keep_page_and_repository_links_distinct(self):
        for output in (self.release, self.drafts):
            page = self.page(output, "builds/index.html")
            lists = [attrs for tag, attrs in page.elements
                     if tag == "ol" and "ledger" in attrs.get("class", "").split()]
            self.assertTrue(lists)
            for attrs in lists:
                self.assertEqual(attrs.get("role"), "list")
                self.assertIn("has-notes", attrs["class"].split())
            names = [attrs for tag, attrs in page.links if tag == "a" and attrs.get("class") == "row-title"]
            sources = [attrs for tag, attrs in page.links if tag == "a" and attrs.get("class") == "row-code"]
            self.assertEqual(len(names), len(page.entries))
            self.assertIn("/builds/dev/", [attrs["href"] for attrs in names])
            self.assertIn("https://github.com/hrmnjt/dev", [attrs["href"] for attrs in sources])
            self.assertTrue(all(attrs.get("aria-label", "").startswith("Code repository for ")
                                for attrs in sources))
            for attrs in names:
                self.assertTrue(attrs["href"].startswith("/builds/"))
            self.assertIn("My Mac setup, dotfiles, and bootstrap workflow.", page.text())
            self.assertFalse(page.count("li", "build-card"))
            if output == self.release:
                self.assertEqual(len(names), 1)
            else:
                # The fixture deliberately has no repository URL: no invented code link.
                self.assertEqual(len(names), 4)
                self.assertEqual(len(sources), 3)

    def test_wal_shows_full_entries_and_unique_anchor_targets(self):
        path = self.drafts / "wal/index.html"
        page = self.pages[self.drafts][path]
        text = " ".join(page.main_text)
        self.assertEqual(text.count("Full entry body, not a truncated summary."), 2)
        self.assertEqual(len(page.ids), len(set(page.ids)))
        self.assertNotIn("repeated-heading", page.ids)
        backrefs = [attrs for tag, attrs in page.links
                    if attrs.get("class") == "footnote-backref"]
        self.assertEqual(len(backrefs), 2)
        for attrs in backrefs:
            self.assertTrue(attrs["href"].startswith("#wal-"))
            self.assertIn(attrs["href"][1:], page.ids)
            self.assertIn("Return to reference", attrs["aria-label"])
        self.assertIn("[return]", text)
        # Inside an entry printed in full, the footnotes rule sits a level below its title.
        self.assertEqual(sum(tag == "h3" and attrs.get("class") == "rule-heading"
                             for tag, attrs in page.elements), 2)

    def test_metadata_and_source_trail(self):
        for output in (self.release, self.drafts):
            for path, page in self.pages[output].items():
                for schema in page.schemas:
                    self.assertEqual(schema["description"], page.meta["description"])
                self.assertTrue(all(script.get("type") == "application/ld+json" or script.get("src")
                                    for script in page.scripts))
            shard = (output / "2026/02/01/dev/index.html").read_text()
            self.assertGreater(shard.index("Markdown source"), shard.index("article-backlinks"))
            build = self.page(output, "builds/dev/index.html")
            self.assertIn("https://github.com/hrmnjt/dev", [attrs.get("href") for _, attrs in build.links])

    def test_code_fences_have_captions_focus_and_class_based_highlighting(self):
        page = self.page(self.drafts, "wal/test-first/index.html")
        figures = [attrs for tag, attrs in page.elements
                   if tag == "figure" and attrs.get("class") == "code-block"]
        blocks = [attrs for tag, attrs in page.elements if tag == "pre"]
        self.assertEqual(len(figures), 2)
        self.assertEqual(len(blocks), 2)
        for attrs in blocks:
            self.assertEqual(attrs.get("tabindex"), "0")
            self.assertNotIn("background", attrs.get("style", ""))
        self.assertIn("chroma", blocks[0].get("class", ""))
        text = " ".join(page.main_text)
        # The python fence is captioned; the unlabelled one is not called "text".
        self.assertEqual(sum(tag == "figcaption" for tag, _ in page.elements) -
                         sum(attrs.get("id") == "caption" for _, attrs in page.elements), 1)
        self.assertNotIn("scroll long lines", text)  # language only; no blanket hint
        self.assertIn("literal <tag> & text", text)
        self.assertFalse(any(tag == "tag" for tag, _ in page.elements))

    def test_image_viewer_is_same_origin_fingerprinted_and_only_loaded_with_images(self):
        for output in (self.release, self.drafts):
            for path, page in self.pages[output].items():
                scripts = [script for script in page.scripts if script.get("src")]
                has_images = any(tag == "a" and attrs.get("class") == "image-fullsize"
                                 for tag, attrs in page.links)
                self.assertEqual(len(scripts), int(has_images), str(path))
                for script in scripts:
                    url = urlsplit(script["src"])
                    self.assertFalse(url.netloc)
                    self.assertTrue(url.path.startswith("/js/image-viewer.min."))
                    self.assertIn("defer", script)
                    data = (output / url.path.lstrip("/")).read_bytes()
                    integrity = "sha256-" + base64.b64encode(hashlib.sha256(data).digest()).decode()
                    self.assertEqual(script["integrity"], integrity)
            self.assertEqual(len([s for s in self.page(output, "index.html").scripts if s.get("src")]), 0)
        wal = self.page(self.drafts, "wal/index.html")
        self.assertEqual(len([s for s in wal.scripts if s.get("src")]), 1)
        headers = (ROOT / "static/_headers").read_text()
        self.assertIn("script-src 'self';", headers)
        # Pages allow no inline styles. Only drawings do, and they may do nothing else.
        rules, path = {}, None
        for line in headers.splitlines():
            if line.startswith("/"):
                path = line.strip()
                rules[path] = ""
            elif line.startswith("  ") and path:
                rules[path] += line + "\n"
            else:
                path = None
        self.assertIn("style-src 'self';", rules["/*"])
        self.assertNotIn("unsafe-inline", rules["/*"])
        self.assertEqual(rules["/images/diagrams/*"],
                         "  ! Content-Security-Policy\n"
                         "  Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'\n")
        self.assertEqual(headers.count("unsafe-inline"), 1)
        self.assertNotIn("script-src 'self' 'unsafe-inline'", headers)
        self.assertIn("/js/*", headers)

    def test_rfd_appendix_has_a_subordinate_heading_and_stable_anchors(self):
        for output in (self.release, self.drafts):
            page = self.page(output, "2026/02/08/rfd/index.html")
            self.assertEqual(sum(tag == "h1" for tag, _ in page.elements), 1)
            headings = {attrs.get("id"): tag for tag, attrs in page.elements
                        if tag in ("h1", "h2", "h3")}
            self.assertEqual(headings["appendix"], "h2")
            self.assertEqual(headings["rfd-template"], "h3")

    def test_source_links_are_bracketed_under_a_source_rule(self):
        for output in (self.release, self.drafts):
            shard = self.page(output, "2026/02/01/dev/index.html")
            self.assertIn("source [code] [markdown] [history]", shard.text())
            self.assertNotIn("view [", shard.text())
            self.assertNotIn("↗", shard.text())
            labels = [attrs.get("aria-label") for tag, attrs in shard.links
                      if tag == "a" and attrs.get("aria-label") in ("Markdown source", "Git history")]
            self.assertEqual(labels, ["Markdown source", "Git history"])

    def test_build_collects_every_related_shard_in_original_date_order(self):
        for output in (self.release, self.drafts):
            build = self.page(output, "builds/dev/index.html")
            entries = build.backlinks["related-shards"]
            urls = [entry["url"] for entry in entries]
            expected = ["/2026/03/06/ivanti-osascript/", "/2026/02/01/dev/"]
            if output == self.drafts:
                expected.insert(1, "/2026/03/03/timeline-fixture/")
            self.assertEqual(urls, expected)
            if output == self.drafts:
                self.assertEqual([entry["url"] for entry in build.backlinks["related-builds"]],
                                 ["/builds/test-build/"])
            else:
                self.assertNotIn("related-builds", build.backlinks)
            self.assertNotIn("main shard →", " ".join(build.main_text))
            self.assertEqual([entry["date"] for entry in entries],
                             sorted([entry["date"] for entry in entries], reverse=True))

    def test_backlinks_support_many_targets_reciprocity_and_deduplication(self):
        fixture = self.page(self.drafts, "2026/03/03/timeline-fixture/index.html")
        self.assertEqual([entry["url"] for entry in fixture.backlinks["related-builds"]],
                         ["/builds/dev/", "/builds/test-build/"])
        self.assertEqual([entry["url"] for entry in fixture.backlinks["related-shards"]],
                         ["/2026/02/08/rfd/", "/2026/02/01/dev/"])
        # Both ends declare this edge, but it appears only once on each end.
        build = self.page(self.drafts, "builds/test-build/index.html")
        self.assertEqual([entry["url"] for entry in build.backlinks["related-shards"]],
                         ["/2026/03/03/timeline-fixture/", "/2026/02/01/dev/"])
        self.assertEqual([entry["url"] for entry in build.backlinks["related-builds"]],
                         ["/builds/dev/"])
        rfd = self.page(self.drafts, "2026/02/08/rfd/index.html")
        self.assertEqual([entry["url"] for entry in rfd.backlinks["related-shards"]],
                         ["/2026/03/03/timeline-fixture/"])
        self.assertEqual(self.page(self.release, "2026/02/08/rfd/index.html").backlinks, {})
        # A shard gets an incoming build edge as well as its explicitly named build.
        dev = self.page(self.drafts, "2026/02/01/dev/index.html")
        self.assertEqual([entry["url"] for entry in dev.backlinks["related-builds"]],
                         ["/builds/dev/", "/builds/test-build/"])
        for output in (self.release, self.drafts):
            for page in self.pages[output].values():
                for entries in page.backlinks.values():
                    urls = [entry["url"] for entry in entries]
                    self.assertEqual(len(urls), len(set(urls)))
                    dates = [entry["date"] for entry in entries]
                    self.assertEqual(dates, sorted(dates, reverse=True))

    def test_ledgers_break_by_year_without_counting_rows(self):
        for output in (self.release, self.drafts):
            for route in ("catalog/index.html", "shards/index.html"):
                page = self.page(output, route)
                years = [entry["date"][:4] for entry in page.entries]
                # One labelled rule per year, in the order the rows arrive.
                self.assertEqual(page.rules, list(dict.fromkeys(years)), route)
                self.assertEqual(page.rules, sorted(page.rules, reverse=True), route)
                # The list speaks for itself; nothing on the site counts rows.
                self.assertNotRegex(page.text(), r"\d+ rows?\b")
                self.assertEqual(page.count("p", "row-count"), 0)
                lists = [attrs for tag, attrs in page.elements
                         if tag == "ol" and "ledger" in attrs.get("class", "").split()]
                self.assertEqual(len(lists), len(page.rules))
                self.assertTrue(all(attrs.get("role") == "list" for attrs in lists))
                self.assertEqual(all("has-kind" in attrs["class"].split() for attrs in lists),
                                 route.startswith("catalog"))

    def test_long_articles_list_their_sections_and_short_ones_do_not(self):
        for output in (self.release, self.drafts):
            rfd = self.page(output, "2026/02/08/rfd/index.html")
            # One copy folded under the title, one for the margin; CSS shows exactly one.
            self.assertEqual(rfd.count("details", "toc-inline"), 1)
            self.assertEqual(rfd.count("nav", "toc-margin"), 1)
            targets = [link["href"] for link in rfd.navs["On this page"]]
            self.assertEqual(len(targets), 18)
            self.assertEqual(targets[:9], targets[9:])
            self.assertEqual(targets[0], "#summary")
            for target in targets:
                self.assertIn(target[1:], rfd.ids)
            second_level = [attrs["id"] for tag, attrs in rfd.elements
                            if tag == "h2" and "id" in attrs and attrs.get("class") != "rule-heading"]
            self.assertEqual([target[1:] for target in targets[:9]], second_level)
            for route in ("2026/03/06/ivanti-osascript/index.html", "readme/index.html", "builds/dev/index.html"):
                self.assertNotIn("On this page", self.page(output, route).navs, route)

    def test_tables_scroll_inside_a_focusable_wrapper_without_inline_styles(self):
        for output in (self.release, self.drafts):
            rfd = self.page(output, "2026/02/08/rfd/index.html")
            wrappers = [attrs for tag, attrs in rfd.elements
                        if tag == "div" and attrs.get("class") == "table-scroll"]
            self.assertEqual(len(wrappers), sum(tag == "table" for tag, _ in rfd.elements))
            self.assertEqual([attrs["aria-label"] for attrs in wrappers], ["Table 1", "Table 2"])
            for attrs in wrappers:
                self.assertEqual((attrs["role"], attrs["tabindex"]), ("region", "0"))
            headers = [attrs for tag, attrs in rfd.elements if tag == "th"]
            self.assertTrue(headers)
            self.assertTrue(all(attrs.get("scope") == "col" for attrs in headers))
            # The policy in static/_headers allows no inline styles, so nothing may emit one.
            for path, page in self.pages[output].items():
                self.assertFalse([tag for tag, attrs in page.elements if "style" in attrs or tag == "style"],
                                 str(path))

    def test_only_links_that_leave_the_site_are_marked_external(self):
        for output in (self.release, self.drafts):
            for path, page in self.pages[output].items():
                for tag, attrs in page.links:
                    if tag == "a" and attrs.get("rel") == "external":
                        url = urlsplit(attrs["href"])
                        self.assertIn(url.scheme, ("http", "https"), str(path))
                        self.assertNotEqual(url.netloc, "hrmnjt.dev", str(path))
            # A link to another shard stays internal and relative.
            harlequin = self.page(output, "2024/12/02/readdatawithharlequin/index.html")
            shard = [attrs for tag, attrs in harlequin.links
                     if tag == "a" and attrs.get("href") == "/2024/10/05/readdatawithduck/"]
            # Its footnotes are set twice (margin copy and end list), so each link is too.
            self.assertEqual(len(shard), 2)
            self.assertTrue(all("rel" not in attrs for attrs in shard))
            marked = [attrs["href"] for tag, attrs in harlequin.links
                      if tag == "a" and attrs.get("rel") == "external"]
            self.assertEqual(len(marked), 4)
            self.assertEqual(len(set(marked)), 2)
            # The home introduction follows the same rule as an article.
            home = [attrs["href"] for tag, attrs in self.page(output, "index.html").links
                    if tag == "a" and attrs.get("rel") == "external"]
            self.assertEqual(len(home), 3)
        css = (ROOT / "assets/css/main.css").read_text()
        self.assertIn('a[rel~="external"]::after', css)
        self.assertNotIn('a[href^="http"]', css)

    def test_footnotes_are_bracketed_and_open_under_one_labelled_rule(self):
        for output in (self.release, self.drafts):
            route = "2024/12/02/readdatawithharlequin/index.html"
            page = self.page(output, route)
            for number in ("[1]", "[2]", "[3]"):
                self.assertIn(number, page.text())
            self.assertIn("footnotes", page.rules)
            notes = next(index for index, (tag, attrs) in enumerate(page.elements)
                         if tag == "div" and "footnotes" in attrs.get("class", "").split())
            self.assertEqual(page.elements[notes + 1], ("h2", {"class": "rule-heading"}))
            # The reference keeps its number as link text for the return label.
            self.assertIn('aria-label="Return to reference 1"', (output / route).read_text())

    def test_short_footnotes_are_also_set_as_sidenotes_beside_their_markers(self):
        for output in (self.release, self.drafts):
            route = "2024/12/02/readdatawithharlequin/index.html"
            page = self.page(output, route)
            html = (output / route).read_text()
            asides = [attrs for tag, attrs in page.elements
                      if tag == "span" and attrs.get("class") == "sidenote footnote-aside"]
            marks = [attrs for tag, attrs in page.elements
                     if tag == "span" and attrs.get("class") == "footnote-mark"]
            # One margin copy per footnote, numbered like its marker and read as a note.
            self.assertEqual([attrs["data-n"] for attrs in asides], ["1", "2", "3"])
            self.assertEqual([attrs["data-n"] for attrs in marks], ["1", "2", "3"])
            self.assertTrue(all(attrs["role"] == "note" for attrs in asides))
            self.assertTrue(all(attrs["aria-hidden"] == "true" for attrs in marks))
            # The linked marker and the end list remain for layouts without a margin,
            # tagged so the stylesheet can show exactly one of the two.
            self.assertEqual(sum(tag == "sup" and attrs.get("class") == "in-margin"
                                 for tag, attrs in page.elements), 3)
            items = [attrs for tag, attrs in page.elements
                     if tag == "li" and attrs.get("id", "").startswith("fn:")]
            self.assertEqual([(attrs["value"], attrs.get("class")) for attrs in items],
                             [("1", "in-margin"), ("2", "in-margin"), ("3", "in-margin")])
            self.assertEqual(page.count("div", "all-in-margin"), 1)
            self.assertEqual(html.count("[return]"), 3)  # only in the end list
            self.assertIn("&#8288;<sup class=in-margin id=fnref:1>", html)
            # Sidenotes proper keep their letters: the footnote copies do not count as them.
            self.assertFalse(page.count("span", "sidenote-ref"))
        shapes = self.page(self.drafts, "2026/01/15/note-shapes/index.html")
        html = (self.drafts / "2026/01/15/note-shapes/index.html").read_text()
        asides = [attrs["data-n"] for tag, attrs in shapes.elements
                  if tag == "span" and attrs.get("class") == "sidenote footnote-aside"]
        # Two paragraphs, or cited twice: an end note only, and the list keeps its numbers.
        self.assertEqual(asides, ["1"])
        items = [(attrs["value"], attrs.get("class")) for tag, attrs in shapes.elements
                 if tag == "li" and attrs.get("id", "").startswith("fn:")]
        self.assertEqual(items, [("1", "in-margin"), ("2", None), ("3", None)])
        self.assertEqual(shapes.count("div", "all-in-margin"), 0)
        # Note text is spliced in literally: a dollar sign is not a regex group.
        self.assertEqual(html.count("costs $1 and keeps <code>$HOME</code>"), 2)
        # Entries printed in full on an index have no margin to hang a note in.
        wal = (self.drafts / "wal/index.html").read_text()
        self.assertIn("footnote-ref", wal)
        self.assertNotIn("footnote-aside", wal)
        self.assertIn("footnote-aside", (self.drafts / "wal/test-first/index.html").read_text())
        css = (ROOT / "assets/css/main.css").read_text()
        self.assertIn(".footnote-mark, .sidenote.footnote-aside { display: none; }", css)
        self.assertIn("sup.in-margin, .footnotes li.in-margin, .footnotes.all-in-margin { display: none; }", css)

    def test_sidenotes_read_as_parentheses_without_the_stylesheet(self):
        page = self.page(self.drafts, "builds/dolor-sit-amet/index.html")
        # Two sidenotes and the sample's one footnote, each wrapped in hidden parentheses.
        self.assertEqual(page.count("span", "visually-hidden"), 6)
        item = next(item for item in ET.parse(self.drafts / "index.xml").findall("./channel/item")
                    if item.findtext("link").endswith("/builds/dolor-sit-amet/"))
        feed = " ".join(unescape(re.sub(r"<[^>]+>", "", item.findtext("description"))).split())
        self.assertIn("aliquet.\u2060 (Sample sidenote:", feed)
        self.assertIn("annotates.) Morbi leo", feed)

    def test_revised_dates_show_only_where_a_page_was_revised(self):
        self.assertIn("[readme] | 2026-09-26 | revised 2026-10-06",
                      self.page(self.release, "readme/index.html").text())
        self.assertIn("[shard] | 2026-03-03 | revised 2026-09-26 |",
                      self.page(self.drafts, "2026/03/03/timeline-fixture/index.html").text())
        self.assertNotIn("revised", self.page(self.release, "2026/02/08/rfd/index.html").text())

    def test_a_drawn_mermaid_fence_is_an_image_with_its_source_underneath(self):
        route = "2026/01/16/diagram-shapes/index.html"
        page = self.page(self.drafts, route)
        html = (self.drafts / route).read_text()
        self.assertEqual(page.count("figure", "diagram"), 1)
        images = [attrs for tag, attrs in page.links if tag == "img"]
        self.assertEqual(len(images), 1)
        image = images[0]
        # The same key scripts/diagrams.mjs gives the file (tests/diagrams.test.mjs pins it).
        self.assertEqual(self.flow_key, "d493232efc3c3445")
        self.assertRegex(image["src"], rf"^/images/diagrams/{self.flow_key}\.[0-9a-f]{{64}}\.svg$")
        self.assertTrue((self.drafts / image["src"].lstrip("/")).is_file())
        self.assertEqual((image["alt"], image["width"], image["height"]), ("A leads to B", "120", "48"))
        self.assertEqual((image["loading"], image["decoding"]), ("lazy", "async"))
        # The source stays on the page as the text alternative, folded away.
        self.assertEqual(page.count("details", "diagram-source"), 1)
        self.assertIn("<summary>diagram source</summary>", html)
        self.assertIn("diagram source flowchart LR A --> B", page.text())
        # A fence nobody has drawn yet is still a captioned code block.
        self.assertIn("mermaid graph TD not --> drawn", page.text())
        self.assertEqual(page.count("figure", "code-block"), 1)
        # A drawing is an image: no script, no inline style, no viewer.
        self.assertFalse([script for script in page.scripts if script.get("src")])
        self.assertFalse([tag for tag, attrs in page.elements if "style" in attrs])
        css = (ROOT / "assets/css/main.css").read_text()
        self.assertIn(".toc-inline summary, .diagram-source summary", css)

    def test_every_published_mermaid_fence_has_been_drawn(self):
        for path in self.pages[self.release]:
            self.assertNotIn("<figcaption>mermaid</figcaption>", path.read_text(),
                             f"{path.relative_to(self.release)}: run `npm run diagrams` and commit the drawing")
        rfd = self.page(self.release, "2026/02/08/rfd/index.html")
        self.assertEqual(rfd.count("figure", "diagram"), 1)
        image = next(attrs for tag, attrs in rfd.links if tag == "img")
        self.assertTrue(image["alt"].startswith("Flowchart of the RFD process"))
        self.assertRegex(image["src"], r"^/images/diagrams/[0-9a-f]{16}\.[0-9a-f]{64}\.svg$")
        self.assertTrue((self.release / image["src"].lstrip("/")).is_file())
        self.assertGreater(int(image["height"]), int(image["width"]))  # a top-down flowchart
        # A committed drawing is static: text, shapes and its own stylesheet.
        for drawing in (ROOT / "assets/images/diagrams").glob("*.svg"):
            svg = drawing.read_text()
            self.assertTrue(svg.startswith("<svg"), drawing.name)
            for forbidden in ("<script", "<foreignObject", 'href="http', "javascript:"):
                self.assertNotIn(forbidden, svg, drawing.name)

    def test_image_captions_are_optional_and_rendered_as_markdown(self):
        html = (self.drafts / "builds/test-build/index.html").read_text()
        self.assertEqual(html.count("<figcaption>A <em>captioned</em> fixture</figcaption>"), 1)
        harlequin = self.page(self.release, "2024/12/02/readdatawithharlequin/index.html")
        self.assertFalse(any(tag == "figcaption" for tag, _ in harlequin.elements))

    def test_an_empty_stream_is_unlisted_until_it_has_an_entry(self):
        self.assertEqual(self.page(self.release, "wal/index.html").meta.get("robots"), "noindex")
        self.assertNotIn("robots", self.page(self.drafts, "wal/index.html").meta)
        for output, listed in ((self.release, False), (self.drafts, True)):
            locations = [node.text for node in ET.parse(output / "sitemap.xml").iter()
                         if node.tag.endswith("loc")]
            self.assertEqual("https://hrmnjt.dev/wal/" in locations, listed)
            self.assertIn("https://hrmnjt.dev/shards/", locations)
            self.assertIn("https://hrmnjt.dev/2026/02/08/rfd/", locations)
            self.assertEqual(len(locations), len(set(locations)))

    def test_a_new_kind_is_one_registry_entry(self):
        registry = self.source / "data/kinds.toml"
        section = self.source / "content/notes"
        original = registry.read_text()
        try:
            registry.write_text(original + '\n[[kind]]\nsection = "notes"\nname = "note"\nstream = true\n'
                                'note = "Fixture stream."\nschema = "Article"\n')
            section.mkdir()
            (section / "_index.md").write_text('+++\ntitle = "notes"\n+++\n\nA fixture stream.\n')
            (section / "first.md").write_text('+++\ntitle = "note fixture"\ndate = 2026-03-07\n+++\n\nBody.\n')
            output = Path(self.tmp.name) / "registry"
            result = self.build(output)
            self.assertEqual(result.returncode, 0, result.stdout)
            home = Page(output / "index.html")
            self.assertIn("/notes/", [link["href"] for link in home.navs["Primary"]])
            self.assertIn("notes Fixture stream.", home.text())
            self.assertIn({"date": "2026-03-07", "kind": "[note]", "title": "note fixture",
                           "url": "/notes/first/"}, home.entries)
            entry = Page(output / "notes/first/index.html")
            self.assertEqual([link["href"] for link in entry.navs["Breadcrumb"]], ["/", "/notes/"])
            self.assertIn("[note] | 2026-03-07", entry.text())
            # A kind registered without a glyph shows its label alone.
            self.assertFalse(entry.count("svg", "kind-mark"))
            self.assertEqual(entry.schemas[0]["@type"], "Article")
            self.assertEqual(entry.meta["og:type"], "article")
            index = Page(output / "notes/index.html")
            self.assertEqual([row["url"] for row in index.entries], ["/notes/first/"])
        finally:
            registry.write_text(original)
            shutil.rmtree(section, ignore_errors=True)

    def test_stylesheet_follows_the_reader_not_the_screen(self):
        css = (ROOT / "assets/css/main.css").read_text()
        # Breakpoints and the frame scale with the reader's font size.
        self.assertFalse(re.findall(r"@media[^{]*\d+px", css))
        self.assertIn("max-width: calc(var(--measure) + var(--gutter) + var(--margin-col) + 2 * var(--page-pad) + 0.5rem);", css)
        # The margin column is asked of the article, so notes never push the page sideways.
        self.assertIn("@container article (min-width: calc(70ch + 2rem + 17rem))", css)
        self.assertNotIn("@media (min-width: 1100px)", css)
        # Reading aids that are easy to lose in a restyle.
        for rule in ("@media print", "main:focus { outline: none; }", 'del::before { content: " [struck out: "; }',
                     ":visited { color: var(--accent-visited); }", "overflow-wrap: break-word;",
                     ".chroma .go { color: var(--gb-fg3); }"):
            self.assertIn(rule, css)
        self.assertNotIn("table { display: block", css)
        # Body text and one smaller step; a third size has no token to reach for.
        self.assertEqual(sorted(set(re.findall(r"--fs-[a-z]+", css))), ["--fs-small"])

    def test_every_page_has_one_title_and_every_image_an_alt(self):
        # The measured report checks these in a browser; this keeps them checked without one.
        for output in (self.release, self.drafts):
            for path, page in self.pages[output].items():
                route = str(path.relative_to(output))
                self.assertEqual(sum(tag == "h1" for tag, _ in page.elements), 1, route)
                levels = [int(tag[1]) for tag, _ in page.elements if tag in ("h1", "h2", "h3", "h4", "h5", "h6")]
                for previous, level in zip(levels, levels[1:]):
                    self.assertLessEqual(level, previous + 1, f"{route}: a heading level is skipped")
                for tag, attrs in page.links:
                    if tag == "img":
                        self.assertIn("alt", attrs, f"{route}: {attrs.get('src')}")

    def test_notes_take_the_margin_and_blocks_say_when_they_need_the_width(self):
        margins = lambda page: [attrs.get("data-margin") for tag, attrs in page.elements
                                if tag == "article" and attrs.get("class") == "article-wide"]
        for output in (self.release, self.drafts):
            # Footnotes set as sidenotes claim the margin; a page without notes leaves it free.
            self.assertEqual(margins(self.page(output, "2024/12/02/readdatawithharlequin/index.html")), ["notes"])
            self.assertEqual(margins(self.page(output, "2023/12/06/gitorg/index.html")), ["notes"])
            self.assertEqual(margins(self.page(output, "2026/02/08/rfd/index.html")), [None])
            self.assertEqual(margins(self.page(output, "builds/dev/index.html")), [None])
            # A block is marked wide only when its content is wider than the text column.
            classes = lambda page, name: [attrs["class"] for tag, attrs in page.elements
                                          if tag == "figure" and name in attrs.get("class", "").split()]
            harlequin = self.page(output, "2024/12/02/readdatawithharlequin/index.html")
            self.assertEqual(classes(harlequin, "article-image"), ["article-image", "article-image wide"])
            self.assertEqual(classes(self.page(output, "2026/02/08/rfd/index.html"), "code-block"), ["code-block wide"])
            gitorg = classes(self.page(output, "2023/12/06/gitorg/index.html"), "code-block")
            self.assertEqual((gitorg.count("code-block"), gitorg.count("code-block wide")), (7, 2))
        self.assertEqual(margins(self.page(self.drafts, "builds/dolor-sit-amet/index.html")), ["notes"])
        css = (ROOT / "assets/css/main.css").read_text()
        self.assertIn('[data-margin="notes"] .article-prose > :is(pre, figure, .table-scroll):not(.wide) '
                      '{ clear: none; max-width: var(--measure); }', css)
        self.assertIn('[data-margin="notes"] .toc-margin { display: none; }', css)

    def test_generated_local_links_and_anchors(self):
        for output in (self.release, self.drafts):
            for path, page in self.pages[output].items():
                for target in page.aria_refs:
                    self.assertIn(target, page.ids, f"{path.relative_to(output)}: ARIA target {target}")
                for tag, attrs in page.links:
                    link = attrs.get("href", attrs.get("src", ""))
                    parsed = urlsplit(link)
                    if parsed.netloc and parsed.netloc != "hrmnjt.dev":
                        continue
                    if parsed.scheme and parsed.scheme not in ("http", "https"):
                        continue
                    local = unquote(parsed.path)
                    target = (output / local.lstrip("/")) if local.startswith("/") else path.parent / local
                    if not local:
                        target = path
                    if target.is_dir():
                        target /= "index.html"
                    self.assertTrue(target.exists(), f"{path.relative_to(output)}: {link}")
                    if parsed.fragment and target in self.pages[output]:
                        self.assertIn(unquote(parsed.fragment), self.pages[output][target].ids,
                                      f"{path.relative_to(output)}: {link}")

    def test_missing_dates_titles_and_bad_relationships_fail_build(self):
        bad = self.source / "content/builds/invalid.md"
        cases = (
            ('title = "bad"\n', "needs an explicit date"),
            ('date = 2026-03-01\n', "needs an explicit title"),
            ('title = "bad"\ndate = 2026-03-01\nrelated_shards = ["/shards/not-there"]\n',
             "unresolved content relationship"),
        )
        base = 'title = "bad"\ndate = 2026-03-01\n'
        cases += tuple((base + relationship + "\n", error) for relationship, error in (
            ('related_shards = "/shards/2026-02-01-dev"', "must be a list"),
            ('related_builds = ["/shards/2026-02-01-dev"]', "must point to a builds page"),
            ('related_shards = ["/builds/dev"]', "must point to a shards page"),
            ('related_builds = ["/builds"]', "must point to a builds page"),
            ('related_builds = ["/builds/invalid"]', "cannot reference itself"),
            ('related_builds = [42]', "needs string content paths"),
            ('writeup = "/shards/2026-02-01-dev"', "uses legacy relationship"),
            ('related = "/shards/2026-02-01-dev"', "uses legacy relationship"),
            ('related_build = "/builds/dev"', "uses legacy relationship"),
        ))
        try:
            for metadata, error in cases:
                bad.write_text(f"+++\n{metadata}+++\n\nInvalid fixture.\n")
                result = self.build(Path(self.tmp.name) / "invalid")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(error, result.stdout)
        finally:
            bad.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
