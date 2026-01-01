+++
title = "Creating cleaner Hugo theme"
slug = "better-theme"
date = 2019-07-27
migrated = true
description = "Solving my troubles by creating a theme focused on content, cleanliness, speed, responsiveness and privacy."
+++

Solving my troubles by creating a theme focused on content, cleanliness, speed,
responsiveness and privacy.

# Vulnerabilities, security alerts and Dependabot

Github is an awesome place for people to collaborate for anything code. Last
month, around the time for Github Satellite 2019,
[Github acquired Dependabot](https://dependabot.com/blog/hello-github/)
With this change, security fixes became way easier and I was delighted.

All Github repositories now feature a Security tab and Github using
[Dependabot](https://dependabot.com/) to
create alerts for security vulnerabilities that exist in code. Dependabot
makes it better by analysing the vulnerabilities and create automated PR for
you to solve the issues. With this careless coders like me, can fix the issues
w.r.t. security and learn more as well.
[Read more](https://help.github.com/en/articles/about-security-alerts-for-vulnerable-dependencies)

One prominent change that I observed was that of all the code that I push to
Github, most vulnerabilities are alerted for my blog, especially the theme. I
love the theme but not the yarn packages that were involved to make it.

# Requirements from the new theme

My older theme [Terminal](https://github.com/panr/hugo-theme-terminal) is an awesome theme created by [panr](https://twitter.com/panr).
I had been using this theme for the longest time and of all features it packed,
liked the typography and color scheme.

I started with finding alternative themes, because I didn't want to complicate
my life by creating a new theme. Secretly, I dread writing frontend code -
HTML, CSS and JS. Listing down inspirations, below are the few that stuck in my
head:

* http://danluu.com/
* http://bettermotherfuckingwebsite.com/

My requirements were very simple:

* **Focus on content, cleanliness and speed** - because you can't live otherwise
* **Responsiveness** - because lot of people read this content on mobile phones
and I hate ugly sites
* **Typography** - because ugly fonts are biggest turn-offs
* **Dark color scheme** - given I'm a night owl, I expect my audience to be.
Plus, dark color scheme is soothing for eyes
* **No Javascript** - because why do you need JS for a static blog. I need to
learn JS as well

# Creating a new theme

Even when the requirements were simple, there are not enough existing themes
which provide all the features combined. The other problem I see with external
themes are that they need to be maintained based on the upstream for new
features.

I finally took a call to setup my own new theme which intent to cover most of
the features that I want. It took me total of 3 hours to create this theme and
I have kept the HTML and CSS as minimal as possible. It draws heavy inspiration
from its predecessor and Dan Luu's blog.

Now was the time to add more details like
* Search Engine Optimization
* Create a projects section for code
* Add my resume/bio
* Add a favicon
* Add better shortcodes
* Improve the images styling (will ask help for this)

# Adding SEO to blog

An important part of the blogging is to be discovered on internet. SEO (search
engine optimization) enables that for all the sites. People make their living
out of improving SEO and there are lot of crazy hacks that come up all the time.

[Google's Lighthouse audit](https://developers.google.com/web/tools/lighthouse/) suggests a simple set of steps that can improve SEO by a huge margin and is
generally the most important audit pointers. There is a great documentation
about improving SEO and implementing best practices around this.

Getting 100% score feels too good. Next step was to improve the look and feel.

# Improving look and feel - CSS learning hour

[Go's html/template and text/template](https://golang.org/pkg/text/template/)"
library does a great bunch of heavy lifting when it comes to HTML generation
for the content. Major effort for the theme developers is to go crazy with all
the tricks that they know to make things fancier. It might be another reason
why there are so many themes which have a lot of great visual and experience
treats.

For me the challenge was different, I wanted minimal features for the site with
as little changes as possible. In the process to do so, I learnt about CSS box
model, hierarchy and inheritance of CSS implementation and separation of
concerns in CSS code.

> I started with renaming the theme to `pure`

Changelog (in past two weeks):

- Improve the head meta tags for RSS and social media sharing
- Adding a favicon for mobile and desktop sites
- Changing background to gray instead of dark blue
- Changing the color scheme to pastel colors (to soothe eyes)
- Improving readability from changing fonts, size and line height to adding
improvements to code-blocks and quotes
- Adding a 404 page
- Adding the RSS links
- Spacing and changes to the header and footer

As of now, the CSS code is very simple you can
[check out the theme here.](https://github.com/hrmnjt/sttp/tree/master/themes/pure)


---
This is a minimalistic blog which at this moment does not support comments. In
case you have any feedback or comments, reach out to me on
[Twitter](https://twitter.com/hrmnjts)
or [Mail](mailto:hrmnjt@hrmn.in).
