---
tags:
  - topic # mandatory
  - news # 1th tag is page
title: New drop of the Javascript engine
patterns:
  - 'Javascript'
summary: WebRTC, json-rql, performance and more.
author:
  git: gsvarovsky
  name: George
date: 2021-04-26
linkedin: TODO
---
We're pleased to announce version 0.6 of the
[Javascript&nbsp;engine](https://js.m-ld.org/), which has a number of key
improvements, paving the way to our Beta release.

We've added experimental support for WebRTC peer-to-peer communications. Since
WebRTC needs the help of another service to connect, this is not a stand-alone
remotes object but an enhancement to the Ably remotes. However it's been
developed in its own package so it can be used to augment any other remotes
implementation in future. We feel like we've learned enough about WebRTC to fill
a book, so do get [in&nbsp;touch](/hello/) if you're curious about this tech!

We've also added more support for **json-rql** query patterns,
allowing more complex declarative queries and reducing the amount of data
manipulation that apps need to do after retrieving data. In the headlines:
- You can use `@construct` to get
  [JSON&nbsp;structures](https://js.m-ld.org/interfaces/construct.html) which
  are the right shape for your UI, or for any other purpose.
- You can `@filter` with
  [Constraints](https://js.m-ld.org/interfaces/constraint.html) to apply
  operators and reduce the amount of data you work with.

In the meantime, the support for [Lists](https://spec.m-ld.org/#lists) has now
moved out of experimental status, as its API has been fully defined and it's
surviving our compliance testing regime!

Part of that work also included some performance work on the core of the engine.
In particular, we've removed some unnecessary asynchronous deferrals that came
with a third-party dependency, meaning query parsing and data streaming can be
10x faster in a web browser! We're not done with performance yet though, so
expect more improvements to come.

_Many thanks to our friends at
[Beautiful&nbsp;Interactions](https://github.com/beautifulinteractions) for
their ongoing work on
[Quadstore](https://beautifulinteractions.github.io/node-quadstore/#/), which
the Javascript engine relies on behind the scenes._