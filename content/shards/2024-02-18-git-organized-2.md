+++
title = "git organized (part II)"
slug = "gitmoreorg"
date = 2024-02-18
description = "improving local Git workflow"
+++

Like last year, I was watching FOSDEM'24 this year from home. There were many
interesting topics but one of them was "So You Think You Know Git" by Scott
Chacon [^so-you-think-you-know-git]. Since I've already tried to make the local
git workflow better, it was relatively low energy for me to try out suggestions
from this talk.

Another reason to revisit this was Julia's toot [^julia-toot] which was a mega
thread where a lot of people wrote their favorite `gitconfig` options. I would
definitely recommend reading that thread (full of hidden treasures).

This post is a follow up to previous post
"[git organized](@/2023-12-06-git-organized.md)" where I'm trying to add
comments for future me to refer when I forget why I did something I did. It would be pure joy if anyone else reads this and finds it interesting enough to
try a few options.

## Branching

First, I saved the `better-branch.sh` script ([gist](https://gist.github.com/schacon/e9e743dee2e92db9a464619b99e94eff))
to `~/.config/git/betterbranch.sh`. and then added a new Git alias
```gitconfig
[alias]
    #...
    bb = !~/.config/git/betterbranch.sh
```
This script makes `git bb` print extra details about the branches i.e. last
commit date, and how many commits behind or ahead is the branch.

Additionally, I added another configuration which sorts the branch by
`committerdate` in reverse. Doing `git branch` now shows the branches in reverse
chronological order of when they were last committed to.
```gitconfig
[branch]
    sort = -committerdate
```

## Merge Conflicts

Merge conflicts are nasty and `rerere` (Reuse Recorded Resolution) remembers how
I resolved a particular conflict and resolves future commits if they have
similar conflicts. I enabled this by adding 3 more lines to my gitconfig.
```gitconfig
[rerere]
    enabled = true
    autoUpdate = true
```

Also, when merge conflicts happen, they appear very crude - incoming vs present,
ours vs theirs, etc. You know if you know. `zdiff3` is another algorithm which
provides diff but also shows the base version of the file suggesting what was
the actual code before conflict appeared. To enable, I did
```gitconfig
[merge]
    conflictStyle = zdiff3
```

## Signed commits

Many a times commits need to be signed so that they can be associated with the
user. I was today years old when I learned that I can use the same SSH key that
I authenticate to git repository with, can be used for signing the commits (as
opposed to GPG key that I've used in past). To do so, I did
```bash
git config gpg.format ssh
git config user.signingKey ~/.ssh/id_rsa.pub
```

## Force Push

I often rebase with `master` and force push changes my feature branch. This
muscle memory can go south if I accidentally force push changes on main and
overwrite others changes. Although on all important places branch protection is
applied by for some reason lets say this is not the case, force push is too
aggressive. In newer versions of git, there is a safer force push option i.e.
`--force-with-lease` which checks for the commit on remote and local before
accepting new changes from a force push. To enable I created a new alias
```gitconfig
[alias]
    #...
    fpush = push --force-with-lease
```

## `git maintanence` shorthand

If not in smaller repositories, running `git maintainence start` on larger
monorepo codebase (like the one I have at work), make some nicer changes i.e.
disabling gc, hourly commit graph, hourly prefetch, clean loose-objects and
incrementally pack diffs daily. To enable I added below to gitconfig
```gitconfig
[maintenance]
    auto = false
    strategy = incremental
```


## Reflections

- I learned that we can run arbitrary scripts as well through git aliases (
similar to `better-branch.sh` above). I intend on using it for syncing remote
branch for a forking workflow we use at work

- Since I rebase and amend commits often, force pushing should be conscious. But
just to cover all bases, it is nice to use `--force-with-lease`

- Again, as I rebase and amend commits often, when I'm working on a feature
with others, `rerere` can make it easier to resolve for known merge conflict
patterns

- Maintainence mode in git makes it easier to work in a monorepo by handling
the grunt work and hygiene for repository. Immediately realize the prefetch
difference for work monorepo

- Read an article "better git conflicts with zdiff3" [^zdiff3-article] and tried
it out for 2 weeks to realize difference in diffs

- Read an article on "git diff algorithms" [^diff-algo] to understand and get
amazed by the amount of effort that goes behind `git diff`

This is how my `gitconfig` finally looks like.

```gitconfig
# ~/.config/git/config

# first, I'm trying to make my work and personal git configuration separate
# and the things that differ between these two environments are:
# 1. `user.name` - although my name is same, I prefer to call myself hrmnjt
#     for personal work and use my full name for work stuff
# 2. `user.email` - obviously
# 3. `user.signingkey` - ssh key which I use for signing commits
# importing configuration for work
[includeIf "gitdir:~/code/github.com/majidalfuttaim/"]
    path = ~/.config/git/config.maf
[includeIf "gitdir:~/code/github.com/xsightme/"]
    path = ~/.config/git/config.maf
# importing configuration for personal projects
[includeIf "gitdir:~/code/github.com/hrmnjt/"]
    path = ~/.config/git/config.hrmnjt


# sometimes I make a mistake of pulling a repo using incorrect protocol i.e.
# HTTPS instead of SSH and below snippet autocorrects my shorcomings
[url "git@github.com:"]
    insteadOf = "https://github.com/"

[init]
    # branch name when initializing new repo
    defaultBranch = main

[core]
    # global gitignore to get rid of .DS_Store commits
    excludesFile = ~/.config/git/.gitignore

[color]
    # colors, please
    ui = auto

[diff]
    # there are bunch of options for rendering diffs - `myers` (default),
    # `patience`, and `histogram`
    # I've tried all three and histogram was super clear when trying to render
    # diffs. An article that compares these options (need more recent research)
    # https://luppeng.wordpress.com/2020/10/10/when-to-use-each-of-the-git-diff-algorithms/
    algorithm = histogram

[pull]
    # there are 3 merge strategies when pulling remote branches
    # - `rebase false` i.e. merge (also, default) - history is not clean, no likey
    # - `rebase true` - clean history (if issues rebase --abort)
    # - `ff-only` - like merge but fails if HEAD not updated
    rebase = true

[branch]
    # sorts output of the git branch -v
    sort = -committerdate

[push]
    # lets me say just `git push origin` to push the current branch
    default = current

[merge]
    # changes the algorithm to show base, ours, theirs
    # read more - https://ductile.systems/zdiff3/
    conflictStyle = zdiff3

[rerere]
    # REuse REcorded REsolutions
    # records how I solve a conflict and replays if similar conflict appears
    # again. Small disk space utilization for less hassle during conflict
    # resolution
    enabled = true
    autoUpdate = true

[rebase]
    # this runs `git stash` before git rebase and `git stash pop` after.
    autostash = true

[help]
    # say I type `git stauts` it waits for 10s and then runs `git status`
    # instead of just suggesting - did you mean `status`?
    autocorrect = 100

[gpg]
    # we can use SSH key to sign commits instead of GPG, gives "verified" badge
    # for commits; also validates signed commits for work
    format = ssh

[alias]
    co = checkout
    aa = add --all
    cmsg = commit -m
    st = status
    l = log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit --date=relative
    b = branch -v
    r = remote -v
    bb = !~/.config/git/betterbranch.sh
    fpush = push --force-with-lease

    # Show all of my configured aliases
    aliases = !git config --list | grep 'alias\\.'
```

[^so-you-think-you-know-git]: FOSDEM'24 talk by Scott Chacon.
[video](https://www.youtube.com/watch?v=aolI_Rz0ZqY),
[slides](https://speakerdeck.com/schacon/so-you-think-you-know-git)

[^julia-toot]: Julia Evans asked Mastodon about favorite git options - https://social.jvns.ca/@b0rk/111885363143321068

[^zdiff3-article]: article by Ductile systems - https://ductile.systems/zdiff3/

[^diff-algo]: article by Lup Peng - https://luppeng.wordpress.com/2020/10/10/when-to-use-each-of-the-git-diff-algorithms/
