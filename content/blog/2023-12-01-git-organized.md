+++
title = "git organized"
date = 2023-12-01
description = "improvements to dev workflow and Git"
+++

Git is core part of my daily workflow (work or otherwise) and there are far too
many ideas *stash*-ed in my head which can either (a) improve hygiene or (b)
increase productivity.

## folders, aliases and visual feedback

Before today, I organized all repositories in freedesktop.org
`xdg-user-dirs(1)`[^1] inspired `$HOME/code` folder for both personal and work
repos. I can't trace back why I do so but I would thank my past self to not 
organize folders aggressively and follow a convention (even without knowing it
too well).

One of the things that ick-ed about above method was work and personal repos
mixed together in one folder. I'm easily distracted and all repos in one
directory meant I would randomly pick a repo to explore and work on when I
remember idea#53 can make something better in it. Another disadvantage was each
repository had to be locally configured for separation of personal and work
email for commits.

For the first improvement, I separated work and personal repos with below
structure.

```bash
~/code/
├── git.sr.ht
│  └── hrmnjt           # root for personal SourceHut repos
│     ├── dotfiles
│     └── sttp
└── github.com
   ├── hrmnjt           # root for personal Github repos
   │  ├── resume
   │  └── x
   └── maf              # root for work Github repos
      ├── acme1
      └── acme2
```

One challenge that I came across this structure is that I need to type a lot
more to navigate to a code repository. This works a bit to activate "slow
thinking" for me. To make it easy though, I added a few zsh aliases which help
me navigate to these folders quickly from anywhere.

```bash
alias ops="cd ~/code/git.sr.ht/hrmnjt/"
alias opg="cd ~/code/github.com/hrmnjt/"
alias opm="cd ~/code/github.com/maf/"
```

## separation of concerns

As I mentioned above, work and personal repos required me to create local 
`.gitconfig` files which would specify `user.email` and `user.name` values.
Scaffolding for a new project would involve setting these configurations for
new repository which added to number of things I need to care for. Folder
structure solved this problem for me as I created 2 separate global
`gitconfig`s and used conditional includes to assume email and name values for
each repos.

Config for personal repos looks like follows.
```gitconfig
# ~/.config/git/config.personal

[user]
    name = Harmanjeet Singh
    email = harman@personal.email
```

Config for work repos looks like follows.
```gitconfig
# ~/.config/git/config.work

[user]
    name = Harmanjeet Singh
    email = harmanjeet.singh@work.email
```

Conditional includes for `gitconfig` depending on folders
```gitconfig
# ~/.config/git/config

# `user.name` and `user.email` import for work configuration
[includeIf "gitdir:~/code/github.com/maf/"]
    path = ~/.config/git/config.maf

# `user.name` and `user.email` import for personal configuration
[includeIf "gitdir:~/code/github.com/hrmnjt/"]
    path = ~/.config/git/config.hrmnjt

# `user.name` and `user.email` import for personal configuration
[includeIf "gitdir:~/code/git.sr.ht/hrmnjt/"]
    path = ~/.config/git/config.hrmnjt
```

Based on this commits for all repos work with suitable and correct email and
name depending on context of organization.

## no more `.DS_Store`, please

One another item in the list of cognitive load to scaffold a new repo is to
add a `.gitignore` which always requires to remove a few folders and files e.g.
MacOS `.DS_Store`, Vim `swp` files, `node_modules` and Python `venv`s.

Now I have a global `.gitignore` configured in `gitconfig` which can be used
to exclude above unwanted but necessary files/folders from being tracked by
git.

```gitconfig
# ~/.config/git/config

[core]
  excludesFile = ~/.gitignore
```

## init sr.ht migration

One of the long pending action that I wanted to do was to migrate to SourceHut
and keep repo mirrored on Github for reference and reach. I like SourceHut over
Github for everything {speed, interface, automation, privacy}. Only reason I
want to keep Github mirrors for my project is for reach and community that is
already existing on Github.

As of today, I've begun experimentation with couple of repos having primary
remotes on sr.ht and mirrors on Github. I will evaluate the experience and do
this for all repos eventually.

Process I followed to make changes for sttp was as follows

```bash
$ git remote -v
# origin	git@github.com:hrmnjt/sttp.git (fetch)
# origin	git@github.com:hrmnjt/sttp.git (push)

$ git remote remove origin

$ git remote add origin git@git.sr.ht:~hrmnjt/sttp

$ git remote set-url --add origin git@github.com:hrmnjt/sttp.git

$ git remote -v
# origin	git@git.sr.ht:~hrmnjt/sttp (fetch)
# origin	git@git.sr.ht:~hrmnjt/sttp (push)
# origin	git@github.com:hrmnjt/sttp.git (push)
```

With this configuration, when I push any branch to origin it pushes it to both
the remote repositories. I wonder if there is any other efficient/cheaper
approach to do this.

## aliases

There are a few git operations that I do a lot more than others and if I can do
the same with typing less it is amazing. I've the following aliases configured
as zsh alias as well as git aliases.

```gitconfig
[alias]
    co = checkout
    aa = add --all
    cmsg = commit -m
    st = status
    l = log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit --date=relative

    # Show all of my configured aliases
    aliases = !git config --list | grep 'alias\\.'
```

With this configuration, typing `git st` (git alias) or `gst` (zsh alias), I can
understand `git status` with at least 50% lesser keystrokes.

## general "quality of life" stuff

In addition to the other improvement which are directly for git workflow, there
are some general improvements which I could find time for and they are providing
instant gratification to the chaos monkey in my head.

First one is using Powerlevel10k[^2] instead of starship.rs[^3] as shell prompt.
Starship was slow but provided similar value. Powerlevel10k is super fast and
gets the terminal ready to use instantly. It adds succinct symbols to prompt
making it super easy to understand the state of working directory.

Second, replacing `exa` with `ls(1)` provides a `--git` flag which can list
all the files in a directory with their git status indicator[^4]. I've added an
alias to replace and configure exa to my liking

```bash
alias ls="exa"
alias l="exa --long --tree --level=1 --time-style=long-iso --group-directories-first --git --all"
```

And below is how prompt and exa works right now.

![git-organized-prompt](/img/git-organized-prompt.png)

## concluding

It has been very satisfying to make these changes. I hope I like them and they
make me 1% better tomorrow. Only time will tell!

---

### footnotes

[^1]: [Freedesktop `xdg-user-dirs(1)`](https://wiki.archlinux.org/title/XDG_user_directories)
is now widely adopted industry norm for folder organization in user-home
directory.

[^2]: [Powerlevel10k](https://github.com/romkatv/powerlevel10k) is command 
line prompt for zsh which focuses on speed, flexibility and out-of-box
experience. Git symbols in prompt with Powerlevel10k are explained in
[documentation](https://github.com/romkatv/powerlevel10k#what-do-different-symbols-in-git-status-mean).

[^3]: [starship.rs](https://starship.rs/) is rust-based command line prompt.

[^4]: [Exa](https://github.com/ogham/exa) is a rust-based replacement for `ls(1)`
i.e. default list directory command in *nix systems. [Git integration](https://the.exa.website/features/git)
baked into it with `--git` flag.
