+++
title = "2024-01-21 branching strategy with airflow"
slug = "adeploy"
date = 2000-01-01
draft = true
description = "real developers commit to master"
+++

{{< img src="/img/real-programmers.jpg" alt="Real programmers commit to master" >}}

## context specific opinions

Recently, I started working on a new team and this is the time we are talking
about way of working and as per the unpopular opinion above, it was time to talk
about branching strategy. There was a constraint - "We were going to commit into
an existing monorepo and leverage existing infrastructure". This is not a bad
position to be in. I'm pro-reusability when it comes to infrastructure; it eases
startup as there is always a baseline and reduces the silos. I also like
monorepos a lot as well; they make it easier to collaborate with team and learn
from different teams.

The challenging bit - there were more than 20 contributors from 5 different
teams committing to this monorepo using GitFlow.

When we start a new project, it feels like a new year resolution. You want to
follow better practices in your new project. You want to pledge time and effort
into improving way of life. You want to use new tools and use them correctly to
not have the problems you had in your past. And I found myself in similar
position wanting to suggest a new approach to many-many opinionated people about
changing their way of working.

This post is (my attempt at) a pitch to my team to try out "trunk based
development". Because I care about code collaboration - how we add features,
refactoring and making changes to production features. Because I care about code
stability - changes we accept or reject to the codebase. And because I care
about release management - how to deliver on the goals set for us. Branching
strategy is the most fundamental and impactful concept in way of working for a
team. It impacts collective productivity of all contributors and is important
enough.

**GitFlow - the OG branching model**

## gitflow

what?
- strong code isolation
- long living branches
- branches per environment

merge hell

no ci
- we are not continious integrating code; we don't constantly integrate together

lead time
- copy paste code
- new feature; new branch; more time to merge

no cd
- we can't deploy the code immediately
- we need to approve; merge; deploy

every merge is a war! we need to solve this.

## trunk based development

what?
- single point of truth
- releaseable all the time
- short living branches
- merge to trunk daily

## how to go from gitflow to trunk based

- small incremental and consistent changes. Every commit is a release. atomic
  release
- short living branch: 1 day
- feature flags to wrap unfinished work


**how to do this for maf**
- mindset shift
    - explain about story size
    - explain about commit size
    - explain that we need to release

- automate code reviews
    - pull request decoration

- build process improvement
    - test suite to check for issues
    - fast execution of tests


**benefit**
- low merge effort
- increase release frequency
- stable iterations; small deployments
- baby step approach for refactoring


**feature flags** - find a way how this will work for airflow
- enabling features on runtime
- decoupling deployment from release

they can go wrong
- less number of feature flags
- documented
- as high as possible
- remove when finish
- never recycle feature flags


# gitflow

setup airflow1

setup airflow2

create 2 branches on local

create cicd approach to push changes to when merge

create feature1 - dev -> test -> prod

update feature1 - dev -> test -> prod

complexities when there are multiple people working on same feature

# trunk based development

requirements - 

setup airflow 1

setup airflow 2

create main branch on local

create cicd approach to push changes to both when merging

create feature1 - dev -> test -> prod

update feature1 - dev -> test -> prod
