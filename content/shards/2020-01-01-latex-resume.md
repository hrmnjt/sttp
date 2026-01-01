+++
title = "latex based resume"
slug = "latexresume"
date = 2020-01-01
migrated = true
description = "LaTex based resume"
+++

# LaTex based resume

[LaTex](https://www.latex-project.org/) is a pretty old technology and I was not aware of it till very recent.

I was always amazed by the similarity in which the scientific journals and research papers were formatted. I was under the impression that there is a standard defined somewhere; brought to existence by a group or institutions; and is so sacred that everyone follows the same formatting. In the search, I found BibTex and then Tex and its friends - LaTex and ConText.

I also accidentally solved the problem that I was trying to solve in a different approach but on similar lines - codifying the presentation layer.

I wrote an article on making presentations using code still wondering when I could say bye to Microsoft Word and equivalent. To bring perspective - I hate Word but I appreciate what an awesome product that is. Even with the Libre office and Apache OpenOffice the problem that remains unsolved is codifying the complete presentation layer for documents. HTML and Markdown came pretty close but it required me to work with CSS and JS. And I don't know why I have a very idiotic fear of CSS and JS.

[Link to article](https://hrmn.in/microblog/coded-presentation/) - Using GoLang Present for coded presentations
[Link to repository](https://github.com/hrmnjt/way-to-go-present)

It seems rather logical now people who didn't know web tech well, needed an equivalent for HTML, CSS, JS and they already had Tex.

## LaTex and adventures

Upon finding LaTex, I found gazillions of repositories (kidding, 7K repositories on GH) with so many people doing only one thing with Tex - resume. [Check it out](https://github.com/search?l=TeX&q=resume&type=Repositories)

I thought why not I start a repo of my own and codify my resume.. Actually, as of today only my resume remains a document that I prepare in Word and equivalent products. So, here it is - https://github.com/hrmnjt/resume. As of now, I've setup the boilerplate with [Lorem Ipsum](https://lipsum.com/)

Also, I realized it is very important for me to run things cross platform. Thanks to Docker, I was going to run LaTex with just one dependency - Docker itself. TBH, exploring DockerHub, I found one or other issue with the public Docker images hence the plan is like below
- Use an existing docker image and understand LaTex well
- Once comfortable with Tex and LaTex, improve the tooling and ecosystem to make document publishing convenient (for me)
- Create template repository for future uses - do it with/for everyone...

It seems interesting now to understand and document the document preparation system.
