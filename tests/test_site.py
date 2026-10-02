"""Generated-site regression checks. Uses only Python's standard library and Hugo."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET
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
        self.entries = []
        self.main_text = []
        self._main = False
        self._catalog = False
        self._entry = None
        self._capture = None
        self._script = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.elements.append((tag, attrs))
        if "id" in attrs:
            self.ids.append(attrs["id"])
        for attribute in ("aria-labelledby", "aria-describedby"):
            self.aria_refs.extend(attrs.get(attribute, "").split())
        if tag == "main":
            self._main = True
        if tag == "meta":
            self.meta[attrs.get("name", attrs.get("property"))] = attrs.get("content")
        if tag in ("a", "link", "img"):
            self.links.append((tag, attrs))
        if tag == "script":
            self.scripts.append(attrs)
            self._script = ""
        if tag == "ol" and attrs.get("class") == "catalog-timeline":
            self._catalog = True
        if self._catalog:
            if tag == "li":
                self._entry = {"date": "", "kind": "", "title": "", "url": ""}
            if self._entry is not None:
                if tag == "time":
                    self._entry["date"] = attrs["datetime"]
                if tag == "span":
                    self._capture = "kind"
                if tag == "a":
                    self._entry["url"] = attrs["href"]
                    self._capture = "title"

    def handle_endtag(self, tag):
        if tag == "main":
            self._main = False
        if tag == "script" and self._script is not None:
            if self.scripts[-1].get("type") == "application/ld+json":
                self.schemas.append(json.loads(self._script))
            self._script = None
        if self._catalog:
            if tag in ("span", "a"):
                self._capture = None
            if tag == "li":
                self.entries.append(self._entry)
                self._entry = None
            if tag == "ol":
                self._catalog = False

    def handle_data(self, text):
        if self._main:
            self.main_text.append(text)
        if self._script is not None:
            self._script += text
        if self._entry is not None and self._capture:
            self._entry[self._capture] += text


class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory(prefix="sttp-tests-")
        cls.addClassCleanup(cls.tmp.cleanup)
        cls.source = Path(cls.tmp.name) / "source"
        cls.source.mkdir()
        for directory in ("assets", "content", "layouts", "static"):
            shutil.copytree(ROOT / directory, cls.source / directory)
        shutil.copy(ROOT / "hugo.toml", cls.source / "hugo.toml")
        # Interleave all stream types, with repeated headings and footnotes in WAL.
        cls.fixtures = {
            "wal/test-first.md": ('"log fixture first"', "2026-03-05", None),
            "builds/test-build.md": ('"build fixture"', "2026-03-04",
                                     'writeup = "/shards/2026-02-01-dev"\n'),
            "shards/test-shard.md": ('"shard fixture"', "2026-03-03", 'slug = "timeline-fixture"\n'),
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
        return subprocess.run(
            [os.environ.get("HUGO_BIN", "hugo"), "--source", str(cls.source),
             "--destination", str(output), "--cleanDestinationDir",
             "--panicOnWarning", "--printPathWarnings", *extra],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )

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

    def test_metadata_and_source_trail(self):
        for output in (self.release, self.drafts):
            for path, page in self.pages[output].items():
                for schema in page.schemas:
                    self.assertEqual(schema["description"], page.meta["description"])
                self.assertTrue(all(script.get("type") == "application/ld+json"
                                    for script in page.scripts))
            shard = (output / "2026/02/01/dev/index.html").read_text()
            self.assertGreater(shard.index("Markdown source"), shard.index("connections"))
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
        self.assertIn("python / scroll long lines horizontally", text)
        self.assertIn("text / scroll long lines horizontally", text)
        self.assertIn("literal <tag> & text", text)
        self.assertFalse(any(tag == "tag" for tag, _ in page.elements))

    def test_rfd_appendix_has_a_subordinate_heading_and_stable_anchors(self):
        for output in (self.release, self.drafts):
            page = self.page(output, "2026/02/08/rfd/index.html")
            self.assertEqual(sum(tag == "h1" for tag, _ in page.elements), 1)
            headings = {attrs.get("id"): tag for tag, attrs in page.elements
                        if tag in ("h1", "h2", "h3")}
            self.assertEqual(headings["appendix"], "h2")
            self.assertEqual(headings["rfd-template"], "h3")

    def test_source_labels_and_build_writeup_deduplication(self):
        for output in (self.release, self.drafts):
            shard = self.page(output, "2026/02/01/dev/index.html")
            text = " ".join(" ".join(shard.main_text).split())
            for label in ("[code]", "view [markdown]", "view [history]"):
                self.assertIn(label, text)
            self.assertEqual(sum(tag == "span" and attrs.get("class") == "source-link"
                                 for tag, attrs in shard.elements), 2)
            self.assertNotIn("↗", text)
            build = self.page(output, "builds/dev/index.html")
            writeups = [attrs for tag, attrs in build.links
                        if tag == "a" and attrs.get("href") == "/2026/02/01/dev/"]
            self.assertEqual(len(writeups), 1)  # authored body link retained
        # If a build does not link its write-up in the body, keep the navigation link.
        fixture = self.page(self.drafts, "builds/test-build/index.html")
        self.assertIn("main shard", " ".join(fixture.main_text))
        self.assertIn("/2026/02/01/dev/", [attrs.get("href") for _, attrs in fixture.links])

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
            ('title = "bad"\ndate = 2026-03-01\nrelated = "/shards/not-there"\n',
             "unresolved content relationship"),
        )
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
