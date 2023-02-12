+++
title = "Commencing boot sequence"
date = 2023-02-12
+++

Hello, world!

Boot Sequence is the set of instructions that get the computers running when we 
press the power button. For example in Linux, it is generally first is the BIOS 
starting up MBR. MBR runs GRUB which executes Kernel which executes init 
sequence which executes runlevel programs. I don't know a lot more about this
but that is for next post. For me (as the catchy title says), this is the first
set of step which hopefully is going to setup the pattern of blogging for me.

At this time, after a lot of yak-shaving, I'm setting up the blog - SSG,
templates, and styling; this post is my approach to track the changes that I do
to final output. There are going to be lot of changes that I forsee coming but
at this time my priority is to:
- [ ] basic styling, on the lines of https://evenbettermotherfucking.website
- [ ] deploy
- [ ] fix content view - root, section, blog
- [ ] content navigation
- [ ] search
- [ ] deep-linking and memex
- [ ] creating a feed (atom, json)
- [ ] sitemaps, robots.txt, 404 page, archive

The format below is majorly edits to this post with the timestamp as blog 
section header. I'm using `date '+%FT%T' | pbcopy` to print the date format.

## log: 2023-02-13T00:10:05

Started the blog this evening with base content from Zola overview - 
https://www.getzola.org/documentation/getting-started/overview/. Post
completing the steps I have a base setup which resembles Danluu's website
(http://danluu.com, for the curious) which I have always admired. It seems a 
little too raw for me, though.

I've since then, done below already
- removed `first.md` and `second.md`
- added this post specifically

In the process of searching for minimal styled pages, I've found
http://motherfuckingwebsite.com, http://bettermotherfuckingwebsite.com,
https://evenbettermotherfucking.website and
https://thebestmotherfuckingwebsite.co. I have to tell that I like "Even
Better" version most and would want to go with that for now.


## content check

Borrowed content from Hugo PaperMod theme to validate the look and feel
for the content. Link - https://github.com/adityatelange/hugo-PaperMod/blob/be00e5a557212de1067016f0fe8a4aa00d23f2e2/content/posts/markdown-syntax.md.

This article offers a sample of basic Markdown syntax that can be used in Hugo content files, also it shows whether basic HTML elements are decorated with CSS in a Hugo theme.

<!--more-->

## Headings

The following HTML `<h1>`—`<h6>` elements represent six levels of section headings. `<h1>` is the highest section level while `<h6>` is the lowest.

# H1

## H2

### H3

#### H4

##### H5

###### H6

## Paragraph

Xerum, quo qui aut unt expliquam qui dolut labo. Aque venitatiusda cum, voluptionse latur sitiae dolessi aut parist aut dollo enim qui voluptate ma dolestendit peritin re plis aut quas inctum laceat est volestemque commosa as cus endigna tectur, offic to cor sequas etum rerum idem sintibus eiur? Quianimin porecus evelectur, cum que nis nust voloribus ratem aut omnimi, sitatur? Quiatem. Nam, omnis sum am facea corem alique molestrunt et eos evelece arcillit ut aut eos eos nus, sin conecerem erum fuga. Ri oditatquam, ad quibus unda veliamenimin cusam et facea ipsamus es exerum sitate dolores editium rerore eost, temped molorro ratiae volorro te reribus dolorer sperchicium faceata tiustia prat.

Itatur? Quiatae cullecum rem ent aut odis in re eossequodi nonsequ idebis ne sapicia is sinveli squiatum, core et que aut hariosam ex eat.

## Blockquotes

The blockquote element represents content that is quoted from another source, optionally with a citation which must be within a `footer` or `cite` element, and optionally with in-line changes such as annotations and abbreviations.

#### Blockquote without attribution

> Tiam, ad mint andaepu dandae nostion secatur sequo quae.
> **Note** that you can use _Markdown syntax_ within a blockquote.

#### Blockquote with attribution

> Don't communicate by sharing memory, share memory by communicating.
>
> — <cite>Rob Pike[^1]</cite>

[^1]: The above quote is excerpted from Rob Pike's [talk](https://www.youtube.com/watch?v=PAAkCSZUG1c) during Gopherfest, November 18, 2015.

## Tables

Tables aren't part of the core Markdown spec, but Hugo supports them out-of-the-box.

| Name  | Age |
| ----- | --- |
| Bob   | 27  |
| Alice | 23  |

#### Inline Markdown within tables

| Italics   | Bold     | Code   |
| --------- | -------- | ------ |
| _italics_ | **bold** | `code` |

## Code Blocks

#### Inline Code

`This is Inline Code`

#### Only `pre`

<pre>
This is pre text
</pre>

#### Code block with backticks

```
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <title>Example HTML5 Document</title>
    </head>
    <body>
        <p>Test</p>
    </body>
</html>
```

#### Code block with backticks and language specified

```html {linenos=true}
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <title>Example HTML5 Document</title>
        <meta name="description" content="Sample article showcasing basic Markdown syntax and formatting for HTML elements.">
    </head>
    <body>
        <p>Test</p>
    </body>
</html>
```

#### Code block indented with four spaces

    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Example HTML5 Document</title>
    </head>
    <body>
      <p>Test</p>
    </body>
    </html>

#### Code block with Hugo's internal highlight shortcode

{{< highlight html >}}

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Example HTML5 Document</title>
</head>
<body>
  <p>Test</p>
</body>
</html>
{{< /highlight >}}

#### Gist

{{< gist spf13 7896402 >}}

## List Types

#### Ordered List

1. First item
2. Second item
3. Third item

#### Unordered List

-   List item
-   Another item
-   And another item

#### Nested list

-   Fruit
    -   Apple
    -   Orange
    -   Banana
-   Dairy
    -   Milk
    -   Cheese

## Other Elements — abbr, sub, sup, kbd, mark

<abbr title="Graphics Interchange Format">GIF</abbr> is a bitmap image format.

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

Press <kbd><kbd>CTRL</kbd>+<kbd>ALT</kbd>+<kbd>Delete</kbd></kbd> to end the session.

Most <mark>salamanders</mark> are nocturnal, and hunt for insects, worms, and other small creatures.
