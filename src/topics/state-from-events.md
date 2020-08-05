---
tags:
  - topic # mandatory
  - why # 1th tag is page
title: Composing knowledge from events
patterns:
  - '(state|data|knowledge) && (event|message)'
summary: <b>m-ld</b> ensures knowledge is consistent even if updates are frequent.
icon: icons/coding.svg
date: 2020-02-01 # For sort order
---
In any multi-actor system, like a team of collaborating robots, every actor must
make decisions based on some current knowledge: a local world model, or an
evolving set of goals. It may not be possible to centralise that knowledge – for
example if the actors can lose their network connection; or the latency or
locking behaviour of a central database is not acceptable.

If the contributing data events are frequent, for example from sensors, every
update has to be synthesised by every actor into their knowledge. This can
rapidly become a computational headache.

[**m-ld** can help](/doc/#structured-data). The knowledge itself is maintained
as convergent shared state, and each actor only needs to apply their own
updates. The rich query syntax then lets them act upon what they need to know,
when they need to act.