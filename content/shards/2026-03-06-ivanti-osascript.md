+++
title = "ivanti, clickops and quirks of osascript"
slug = "ivanti-osascript"
date = 2026-03-06
+++

This is a short and sharp one.

One of the necessary evils at work is VPN. I'm yet to experience a non-clunky
VPN and I believe this is by design. The VPN software is generally gatekeeped
and obscured to make it difficult for the end-user to bypass security controls.
What I crave is a better developer experience when using VPN. (I've heard good
things about Tailscale; but I'm yet to try it or other alternatives.) But, here
I'm digresssing. At work, we need to use Ivanti VPN which on MacOS installs and
provides a convenient menubar icon.

My workflow:
- "Connect" to VPN when I have to browse company stuff e.g. Databricks or Azure
Devops (sadness maximus)
- "Suspend" to access stuff that doesn't work well on VPN e.g. Github or online
docs about tooling we use.
- "Resume" when I need to switch
- "Disconnect" when done with work

The clunky part is that there are times when I need to look at reference
documentation and adjust my approach/code on Databricks and that doesn't open
or works too slow on VPN. And I have to continiously "suspend" and "resume" VPN
when I need to do so. So, for my weekend side project quest, I spent sometime
to learn `osascript` which is a quirky language and my only option to avoid
clicks on menubar icon all the time. [The final script is here][1].

I enjoyed writing it and trying it out until it got serious and then I felt constrained. If I want to list running processes, I should do

```applescript
tell application "System Events" to get name of every process
```

instead of

```rust
system_events.processes.map(p => p.name)
```

This is because `osascript` or AppleScript was designed in early 90s for
non-programmers to express automations. It reads like a sentence and reminded
me of "DHH explaining Ruby" on Lex's podcast. But beyond the basics the
"natural" language syntax becomes more confusing that it needs to be. It also
becomes hard to compose. e.g.

```applescript
click menu item "Connect" of menu "VPN" of menu item "VPN" of menu 1 of menu bar item 1 of menu bar 2
```

Understanding the exact heirarchy requires you to build the mental model of
the UI tree or design pattern in context. Its noun and verbs to parse UI AST
and that is the biggest quirks in my view. Some other things that were weird

**`tell ... end tell`**: who am I "talking to"? objects?

**`of` vs `.`**: I can say `parent.child` or I can say `child of parent` which
requires me to reverse the heirarchy and change my mental model

**`every` instead of loops**: I should say `name of every process` instead of
an iteration/iterator

**`killall` to prevent freezing application**: I'm amazed that this is the
suggested approach from Apple to unstuck applications or ignore application
responses.

I just scratched the surface of `osascript` and I don't think I want to go
deeper. In fact, after implementing the whole solution, I learned that Apple
launced JavaScript for Automation (JXA) in 2014 as an alternative to
AppleScript. I don't want to rewrite the current implementation because I'm
equally noob in JavaScript (at least not right now). 

[1]: https://github.com/hrmnjt/dev/blob/main/ivanti/.local/bin/vpn
