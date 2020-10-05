---
tags:
  - topic # mandatory
  - news # 1th tag is page
title: The Playground is Available
patterns:
  - 'playground'
summary: A safe place to try out the <b>m-ld</b> API
author:
  git: gsvarovsky
  name: George
date: 2020-10-05
---
As we continue our work on the ergonomics of **m-ld**, we've found that you (and
we too) often want to quickly try out the query and transaction syntax against a
temporary domain.

Well now you can! The [playground](/playground/) is designed just for that. It's
all explained once you're there, and there's even an introductory video. We've
also added some more examples to the Javascript engine transaction
[documentation](https://js.m-ld.org/#transactions), to help you find your way
into the language.

In the meantime, we've done some work optimising how **m-ld** stores and
transmits changes, which drops the bandwidth overhead considerably for
transactions that impact more data. This has been implemented in the v0.3
release of the [Javascript&nbsp;engine](https://js.m-ld.org/). The storage is
backwards-compatible, but the messaging is not, so you need to ensure that if
any clone uses the new engine, all the other clones do too. (When we reach a
major release we'll start supporting compatible version ranges, as you would
expect.)

Many thanks to everyone who has contacted us about use-cases in specialist
domains. We've chatted about app ideas in everything from medical history and
computer-aided biology, to wargaming and aviation.

We're working on ambitious targets for the remainder of the year, and we'll
share these with you soon, but one urgent job that's been outstanding is to tidy
up and make public our code repositories for the **m-ld** specification and
Javascript engine. Watch this space!