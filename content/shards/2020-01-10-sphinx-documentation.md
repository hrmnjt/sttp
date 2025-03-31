---
title: "Sphinx for documentation"
heading: "Sphinx for documentation"
slug: "2020-01-10T19:24:11+04:00"

author: "hrmnjt"
date: 2020-01-10T19:24:11+04:00

draft: true
showpagemeta: true

description: "Sphinx for documentation"
tags: ["sttp"]
categories: ["micro"]
---

⚠️ **Time Capsule Alert!** ⚠️

This post is a digital fossil excavated from my ancient blog archives. Like finding your embarrassing high school photos, this content represents Past Me™ (who knew significantly less than Current Me).

Side effects may include: broken links, missing images, and opinions I've since upgraded. My brain has received several critical software updates since writing this.

For the latest version of my thoughts (now with 73% fewer bugs!), please check out my more recent posts.

---

# Sphinx for documentation

Sphinx is awesome if you have to use it for open source documentation for python projects. Some of the things that I particularly like about that is:
- code is automatically included as a part of your documentation
    - if you put awesome docstrings in your python code, you will be rewarded
- thousands of integrations - free publishing, nice community and great tooling
- documentation is a part of code - goes hand in hand

There are multiple awesome sources for someone who wants to start using Sphinx for their project. This post is an effort from my end to layout the context and make a reference for future projects.

# Basic Sphinx setup

To start playing with Sphinx, I'm assuming the below.

**Assumption 1** - your project structure overview has the below components as the root. If not, it would be better to seperate the source code in the `src` folder to create a cleaner structure and general hygiene.

```md
+-- docs                      # Documentation for the project
+-- src                       # Source code
+-- README.md                 # Project Readme
```

**Assumption 2** - you commit on using docstrings to explain/comment Python code - also, prescribed by [PEP257](https://www.python.org/dev/peps/pep-0257/). This is not mandatory, but if you are not doing this, then using Sphinx will not provide you the power that you are expecting and you could be better off using different documentation approach.

Now that we said that, let's install Sphinx and start the initial few steps to create the basic Sphinx scaffolding, that it generates for us.

```bash
# Activate the virtual environment
source path/to/venv/bin/activate

# Install Sphinx if not already
pip install -U sphinx

# Move to docs directory
cd docs

# Quickstart Sphinx
sphinx-quickstart
```

At this point Sphinx will ask you multiple questions and will setup the scaffolding based on the answers. Post which, the directory structure will look like below. Some suggestions to the questions asked by generator code are -

Q: Separate source and build directories (y/n)
A: y

Q: Project language
A: en

Q: Create Makefile (y/n)
A: y

```md
+-- docs                      # Docs root folder
|   +-- build                 # Generated docs
|   +-- source                # Source code for generating docs
|   |   +-- conf.py           # Sphinx configuration
|   |   +-- index.rst         # Index for documentation
|   +-- Makefile              # GNU Make commands to ease usage
+-- src                       # Source code
|   +-- mod1                  # Python module 1
|   +-- mod2                  # Python module 2
+-- README.md                 # Project Readme
```

Most important changes that needs to be done would be to the Sphinx configuration (conf.py) which might not suit the needs of the project. Few of those changes are -


```python
# Changing the python code directory in Path setup section
import os
import sys
sys.path.insert(0, os.path.abspath('../..'))


# Adding the extensions as per need
extensions = [
    'sphinx.ext.autodoc',
    ...
]

# Excluding the files and directories to not be considered for documentation
exclude_patterns = [
    "random_unwanted_code.rst",
    ...
]

# Choosing the theme
html_theme = 'alabaster'
```

Post these changes Sphinx is ready to generate beautiful documentation based on code. Additional suggestion is to include the root Makefile as it is not always possible use GNU Make commands from the `docs` directory. This is also based on personal preference.

**Sample project root Makefile**
```makefile

SPHINXOPTS    ?=
SPHINXBUILD   ?= sphinx-build
SPHINXAPIDOC  ?= sphinx-apidoc
SOURCEDIR     = src/documentation/source
BUILDDIR      = src/documentation/build
CODEDIR       = src
DOCSDIR       = docs

# Put it first so that "make" without argument is like "make help".
.PHONY: help Makefile
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)


.PHONY: apidoc
apidoc:
	@$(SPHINXAPIDOC) -f -o $(SOURCEDIR) $(CODEDIR)


.PHONY: html
html:
	@$(SPHINXBUILD) -M html "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)
	@echo "Regenerated all docs"
	@rm -rf $(DOCSDIR)
	@mkdir -p $(DOCSDIR)
	@cp -r $(BUILDDIR)/html/. $(DOCSDIR)/
	@echo "" > $(DOCSDIR)/.nojekyll
	@echo "Replaced latest generated docs in /docs folder"


.PHONY: clean
clean:
	@rm -rf $(BUILDDIR)/*
	@echo "Cleaned build directory"
	@rm -rf $(DOCSDIR)
	@echo "Cleaned GH docs directory"


.PHONY: cleanhtml
cleanhtml: clean html
```

The final steps would be to add specific folders to `.gitignore` and test all the commands.

# Hosting with RTD for open source projects

Read the docs (RTD) makes it extremely easy to publish documentation generated by Sphinx. It also allows you to publish documentation created with MkDocs.

[Importing Your Documentation](https://docs.readthedocs.io/en/stable/intro/import-guide.html) is a one time process for the project and you can configure RTD based on `readthedocs.yml`, if specified. Mostly out of box, it works really well and there are no major concerns using RTD.

# Hosting with custom docs server for private projects

For private projects, the approach could be little different.

MkDocs, an alternative to Sphinx in some ways, let's you write documentation in markdown (by default) and manages this using a yaml configuration file.

At this point, I choose to build the docs and host it over a simple docker container running [Nginx](https://www.nginx.com/). In order to do so, we need to change the repository structure a bit and add the configuration, explained below

A new folder - `setup` can be created to add docker-compose file for a cleaner project directory.

```md
+-- docs                      # Docs root folder
|   +-- build                 # Generated docs
|   +-- source                # Source code for generating docs
|   |   +-- conf.py           # Sphinx configuration
|   |   +-- index.rst         # Index for documentation
|   +-- Makefile              # GNU Make commands to ease usage
+-- setup                     # Source code
|   +-- docker-compose.yml    # Source code
+-- src                       # Source code
|   +-- mod1                  # Python module 1
|   +-- mod2                  # Python module 2
+-- Makefile                  # Project Readme
+-- README.md                 # Project Readme
```

Docker Compose file - sample

```yaml
version: '3.7'
services:
  docs:
    image: nginx:latest
    volumes:
      - ../docs/build/html:/usr/share/nginx/html
    ports:
      - 80:80
```

Makefile - sample
```makefile
DC_COMPOSE = docker-compose --project-name project-name -f setup/docker-compose.yml

ls:
	docker container ls -a
	docker volume ls

run:
	${DC_COMPOSE} up --timeout 0 --renew-anon-volumes --force-recreate --always-recreate-deps --remove-orphans --detach

run_with_logs:
	${DC_COMPOSE} up --timeout 0 --renew-anon-volumes --force-recreate --always-recreate-deps --remove-orphans

stop:
	${DC_COMPOSE} down --timeout 0

build:
	${DC_COMPOSE} build

force_build:
	${DC_COMPOSE} build --no-cache --force-r

restart: stop build run

force_restart: stop force_build run

clean:
	$(DC_COMPOSE) down --volumes --timeout 0 --remove-orphans
	docker container prune -f
	docker volume prune -f
	docker container ls -a
	docker volume ls
```

This structure is simple and would suit needs for any of the project that needs documentation - open source or private. I'm open to feedback and constructive criticism. Please let me know if any of this doesn't make sense or should be done in different way.

**Update** - I have been using mkdocs more and more now given the awesome material theme which makes the documentation look awesome. Will be sharing a blog about the same soon.
