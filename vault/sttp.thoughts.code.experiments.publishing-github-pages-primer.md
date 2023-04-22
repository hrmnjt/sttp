---
id: Fv19jBaCzf2TllJK00aMf
title: Publishing GitHub Pages Primer
desc: ''
updated: 1638568453123
created: 1635630132209
---

Github Pages (Primer theme) is a cool and easy way to publish a bunch of markdown files in a repository to look like a minimal and clean webpage. 

In order to test out I put up a simple project on Github - https://github.com/hrmnjt/testing-gh-pages i.e. now deleted. With the main `README.md` behaving like an `index.html`, other markdown files can be linked together to make a clean and minimal webpage to be hosted on Github pages when below `_config.yml` is also commited in repo root folder.

_config.yml
```yaml
theme: jekyll-theme-primer

github:
  private: false
  license:
    name: MIT
  source:
    branch: "main"
    path: "/"
  repository_url: "https://github.com/hrmnjt/testing-gh-pages"

title: Testing GH pages
description: Basic testing for GH pages
```

Generates a simple GH page with primer theme - https://github.com/pages-themes/primer

