---
tags:
  - topic # mandatory
  - doc # 1th tag is page
  - principle
title: Realtime
patterns:
  - realtime
summary: '<b>m-ld</b> data is realtime in principle.'
date: 2020-05-01 # Used for sort order
---
In principle, a **m-ld** clone contains realtime domain data. Publication and
receipt of updates is continuous and automatic. A clone may be *offline*,
temporarily or for an extended period, but this is not logically distinct from
extraordinary network latency.

Another way to look at this, is to say that the domain is ephemeral and only
exists as some hypothetical convergent state of all the clones. A clone can only
ever be "up-to-date" with respect to another clone.

This means that an app does not in principle need to behave differently based on
the currency of the domain data presented – for example, once initialised, a
clone can always accept data writes.

In practice, the [clone&nbsp;API](https://spec.m-ld.org/#clone-api) does support an
indication of status, including online/offline, to allow for special behaviours
such as user notifications.