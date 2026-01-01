+++
title = "dotfiles: setting up"
slug = "init-dotfiles"
date = 2020-02-03
migrated = true
description = "Dotfiles: setting up"
+++

A simple set of enhancements can personalize shell and it becomes more productive and enjoyable to work with.

I like command line interfaces. The biggest affinity that I have towards CLIs are **predictability** and **reproducibility**. If you do any actions which can be codified, it become very simple to repeat those actions and do it in the same way as many times as possible. These fundamental behavior of command line interfaces have also shaped how I design code in life with a speck of idempotence, abstraction and simplicity. Although I have a lot to learn on this subject, the love for shell never decreases.

Occasionally, I had tried zsh, plugins environment and powerline prompts but I settled on the old stable bash. Hence, when I decided to make dotfiles repository for myself, [all the inspirations](https://dotfiles.github.io/) were not helpful much.

> I started with the most essential dotfile - .bashrc

My approach was to keep it very simple and specific to my requirement. To decide what is important for me to solve I used statistics. **As per bash history, reducing top 10 repeated commands on the shell would shrink the bash history by 90%.** That lead to include aliases and information about Git on prompt for me to save 90% keystrokes.

For aliases, I was accustomed with [Oh My Zsh's git plugin](https://github.com/ohmyzsh/ohmyzsh/blob/master/plugins/git/git.plugin.zsh) and hence the logical choice was to choose the aliases that I use the most.

The other important bit for configuration was to set the Git Prompt to make me save couple hundred `git` commands during the day. For that I took [Git's completion and prompt](https://github.com/git/git/tree/master/contrib/completion).

In the end, I get a simple setup for me to start tinkering and building on top. I intend to keep adding more to the dotfiles and keep reducing the top 10 repeated commands. This is just a start - to keep following the changes, you can follow the [Github repository](https://github.com/hrmnjt/dotfiles)
