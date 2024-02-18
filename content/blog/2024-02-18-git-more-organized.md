+++
title = "git more organized"
slug = "gitmoreorg"
date = 2024-02-18
description = "more improvements to local Git workflow"
+++

Like last year, I was watching FOSDEM'24 this year from home. There were many
interesting topics but one of them was "So You Think You Know Git" by Scott
Chacon ([video](https://www.youtube.com/watch?v=aolI_Rz0ZqY),
[slides](https://speakerdeck.com/schacon/so-you-think-you-know-git)).
Since I've already tried to make the local git workflow better, it was
relatively low energy for me to try out suggestions from this talk.

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

## Signed commits

Many a times commits need to be signed so that they can be associated with the
user. I was today years old when I learned that I can use the same SSH key that
I authenticate to git repository with, can be used for signing the commits (as
opposed to GPG key that I've used in past). To do so, I did
```
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
```
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
patterns.

- Maintainence mode in git makes it easier to work in a monorepo by handling
the grunt work and hygiene for repository.
