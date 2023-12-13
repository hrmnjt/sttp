+++
title = "pbe: setting up basics"
date = 2023-11-30
description = "personal log of website changes focusing on core functionalities"
+++

The term "PBE" is a play on the an acronym IDE i.e. Integrated Development 
Environment and abbreviation for "personalized blogging environment". The core
idea of the post to check on all personalizations I wanted to do on this
blogging setup and also stay as reference to how certain elements on the 
website might behave.

> why the hell did it take you 10 months to do this?

![Ackchyually](/img/ackchyually.png)

It did not. After I wrote the first post, I started burning my energy on my day
job which was interesting and hectic to say the least. There were lot of things
for me to learn and a lot of time was spent fixing stuff for work. Meanwhile, my
development workflow has changed a lot
- moved to todo.txt for tracking tasks (from paper notes)
- started a custom daily log setup with bash magic
- stopped using pinboard and hacked some bash to create a terminal bookmark-er
- bash-ed time-logging chores required at work to reduce cognitive load

At this point though, all these have become a mush and need maintenance, so I'm
trying to revive the blog and in a devlog approach fix these mushy items into
clean interfaces which allow me to go faster on my day to day.

> i wonder if the site wasn't as raw?

When I started this website, I used Zola Overview [^1] to get started with the
base content and styling which is the rudimentary setup that one should ideally
start their personalization journey from. I've always admired minimalistic
portfolio/websites[^2] of Danluu, Tom MacWright and Xe Iaso. (I want to confess
that I avoid tinkering CSS as much as possible). I leaned towards styling from 
"even better motherf***ing site" [^3] with a few tweaks; added below and it
looks good.

```css
body {
    background: #f2f2f2;
    color: #444444;
    line-height: 1.6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 16px;
    margin: 5% auto;
    max-width: 73%;
}
a {
    border-bottom: 1px solid #444444;
    color: #444444;
    text-decoration: none;
}
```

> i wonder if site would refresh when I push push

I use Cloudflare DNS to manage the domain `hrmnjt.dev` and there were 2 easy
options for me to run a continuous deployment flow - Github Actions + Github 
Pages or Cloudflare Pages. I chose latter to try this out. Steps that one has
to follow are from Cloudflare Pages Docs. It executes the build process on
every commit and creates a staging and production link [^4].

> i wonder if there was a better way to find content

Zola has sane and easy defaults for `index`, `section` and `page` templates and
at this point of time I don't think I need anything more than this for 
content on this website. This means navigation can be super simple and easy.

Right now, we have three places to navigate to
- `/` which uses `index` template and routes to root of website
- `/blog` which uses `section` template and routes to all post list
- `/blog/post1` which uses `page` template and routes to individual post. This
is also what I suppose will be centerpiece.

> is there a feed, sitemap? what happens on a random url? will this appear on
google search?

Zola already solves for most of above as out-of-box options. Feed, sitemap and 
robot.txt are default generated if configured based on documentation[^5]. Adding
these options and few lines of code in templates made it easy to finish this
item from checklist.

> are you done?

There is a famous ad jingle for Pepsi which says, "Dil maaange more!", which
loosely translates to infinite wishes. Site is functional, blogs are readable
and this is a good target for me to get going with some actual blog ideas which
are pending.

I shall come back to improve my PBE and the list of improvement item may include
(not exhaustively) favicons, theme colors, canonical links, interesting titles,
OpenGraph tags, minimal search, and CSS styling to improve image width,
block-quotes, tables and footnotes.


---

### footnotes

[^1]: [Zola Overview](https://www.getzola.org/documentation/getting-started/overview/)
is a "quick start" for Zola following which one can create a minimal blogging
theme which is good enough.

[^2]: [danluu.com](https://danluu.com/), [macwright.com](https://macwright.com/),
[xeiaso.net](https://xeiaso.net/)

[^3]: [evenbettermotherf***ing.website](https://evenbettermotherfucking.website)
has a simple CSS suggestion which emphasizes on minimalism.

[^4]: [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
and [Example Cloudflare build for one commit](https://github.com/hrmnjt/sttp/runs/17053983005)

[^5]: Zola provides out-of-box setup for [feeds](https://www.getzola.org/documentation/templates/feeds/),
[sitemap](https://www.getzola.org/documentation/templates/sitemap/),
[robots.txt](https://www.getzola.org/documentation/templates/robots/) and
[404 page](https://www.getzola.org/documentation/templates/404/).
