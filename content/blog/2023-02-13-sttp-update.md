+++
title = "sttp://update-20230213 - basic styling"
date = 2023-02-13
+++

Started this website last evening with base content from 
[Zola Overview](https://www.getzola.org/documentation/getting-started/overview/).
Completing base setup from Zola docs gives a website similar to Danluu's website 
([http://danluu.com](http://danluu.com), for the curious) which I have always 
admired for its simplicity. Although, the styling seems a little too raw for me.

In the process of searching for minimal styled pages, I've found
[http://motherfuckingwebsite.com](http://motherfuckingwebsite.com), 
[http://bettermotherfuckingwebsite.com](http://bettermotherfuckingwebsite.com),
[https://evenbettermotherfucking.website](https://evenbettermotherfucking.website) 
and [https://thebestmotherfuckingwebsite.co](https://thebestmotherfuckingwebsite.co).
I like "Even Better" version most and would want to go with that for now.

Summarizing, today's changes include
- adding base CSS
- styled code blocks
- removing `first.md` and `second.md`
- added this post specifically
- changing `index.html`, `base.html` and `blog/_index.md` to make the site look
sensible as sttp
- added `resize_image` shortcode

Below are the screenshots after the changes.

{{ resize_image(path="static/img/2023-02-13-sttp-update-1-root.png", width=1200, height=200, op="fit_width") }}

{{ resize_image(path="static/img/2023-02-13-sttp-update-2-posts.png", width=1200, height=200, op="fit_width") }}

{{ resize_image(path="static/img/2023-02-13-sttp-update-3-post.png", width=1200, height=200, op="fit_width") }}
