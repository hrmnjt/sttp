+++
title = "using GoLang Present for coded presentations"
slug = "coded-presentation"
date = 2019-05-30
migrated = true
description = "Are you lazy programmer who wants to make a rich presentation with cheap efforts?"
+++

Are you lazy programmer who wants to make a rich presentation with cheap efforts?

In a hurry? TL;DR:

* [skip to project details](#project-usage)
* [check out code](https://github.com/hrmnjt/way-to-go-present)
* [check out an example presentation](https://talks.godoc.org/github.com/hrmnjt/way-to-go-present/example.slide)

# Why do we make presentations?

Visual communications are highly constructive and comprehensible form of
creating memories.

[Wikipedia](https://en.wikipedia.org/wiki/Visual_communication) says:

> Visual communication is the conveyance of ideas and information in forms that
can be seen...

> ...Visual communication is a broad spectrum that includes signs, typography,
drawing, graphic design, illustration, industrial design, advertising,
animation, color, and electronic resources...

Many have talked about the effectiveness of visual communication superseding
other means of communications and in multitudes of disciplines. Conversations
with visual content is bread and butter for domains like education,
health care, defense and corporate businesses.

I love effective presentations. More than 90% of the things that I've learnt,
understood and retained were because of the visual clues which made long
paragraphs easy to digest. Moreover, creating effective presentations make a
permanent mark in memories about the concepts; which is skill worth learning.
And mind you, this is not the excuse for the dirty diagrams and doodles in all
my notebooks.

# Motivation for better presentations - Sadness.pptx ;(

I spent first four years of my work life in Mu Sigma (analytics services and
consulting domain) and communication is second biggest part of your work share
in such firms, seconded by delivery. I learned immensely about creating content
and documentations and, messaging the content and presentations.

Repeating, I love effective presentations and I like to make them as well. But
I don't enjoy the process I have to go through to make presentations and the
choice of tools available to make effective presentations.

**The most sincere thought using presenatation tools are**:

* **Content >> layout and messaging** - while creating, I want to focus on
getting the content before I worry about explaining better looking concept
* **Need of a chief experience officer** - before I present, I should not have
to worry about how to share the presentation, why is adjusting to the screen
size, where is my script, how to get the projector to work, and so on. It is
expensive for presenter to familiarize with a new equipment every time they
want to present
* **`-v` or `--verbose` Commentary** - why test the attention span of audience?
* **Flying header with zooming images** - garish colors, unnecessary animation,
illegible fonts, or overcrowded texts - nothing is more annoying than these
* **my_presentation_last_final_v10_20190530_without_animations.pptx** - no
version control = sad life

I needed a lazier way of solving these problems and hence the hunt started.

# Gophers way of presentations

Have you ever noticed how Go community presents GoTalks? You will notice
simplistic presentation with minimal but useful animations. They are not so
feature-rich as Reveal.js but they are powerful. For me, it aligns with the
overall Go language philosophy as well.

These presentations are created using a Go library called
[present](https://godoc.org/golang.org/x/tools/present).
Go Present library provides a great way of creating codified presentations
which can be version controlled and hosted on the internet. I really started
using this to the maximum when I realized how easy it was to prototype the idea
that I would like to showcase for quick feedback or improvement.To showcase the
usage of the present tool, I've created a sample project with a example
presentation. Following sections contain details about the project.

# Project - Usage

Project can be found on https://github.com/hrmnjt/way-to-go-present

The project serves as a scaffolding for talks and the structure of the current
project is:
```bash
+-- code                # directory containing code snippets
|   +-- src_code.go     # example source code file
|   +-- ...
+-- img                 # directory containing images
|   +-- bg_img.jpg      # example background image
|   +-- ...
+-- .gitignore
+-- example.slide       # example for the main content code
+-- README.md
+-- LICENCE
```

The presentation can be made with .slide format and the folders can be used to
store code snippets and images required in the slides. There are two ways one
can go about checking the content of the presentations:

1. Development - Running local server using the present package
2. Production - Viewing it on GoTalks after pushed to Github

To run in development mode:

* Install go.talks/present
* Create `some_content.slide` in your editor
* Run the tool `$GOPATH/bin/present` from the location where `.slide` is stored

View the content of the .slide file on the browser @ `localhost:3999`. You can
check the format of content from example.slide in this repo

To run in production mode:

* Finalize the content and structure
* Commit and push your `some_content.slide` to your public Github/Gitlab
repository
* Go to https://talks.godoc.org/github.com/YOUR_USER_NAME/YOUR_REPOSITORY_NAME/PATH/TO/SLIDE.slide
to share and view your slide

For example slide and tutorial -
https://talks.godoc.org/github.com/hrmnjt/way-to-go-present/example.slide

# References

Official documentation - https://godoc.org/golang.org/x/tools/present
Example content - https://talks.golang.org/2017

---

This is a minimalistic blog which at this moment does not support comments. In
case you have any feedback or comments, reach out to me on
[Twitter](https://twitter.com/hrmnjts)
or [Mail](mailto:hrmnjt@hrmn.in)
