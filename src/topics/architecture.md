---
tags:
  - topic # mandatory
  - doc # 1th tag is page
title: Architecture
patterns:
  - architecture
summary: '<b>m-ld</b> is a decentralised (multi-master) graph data store with a JSON-based API.'
date: 2020-01-01 # Used for sort order
---
**m-ld** is a decentralised (multi-master) graph data store with a JSON-based
API. In the picture, the "browser", "microservice" and Australia are just
possible environments for a clone – and there could be any number of clones,
from a handful to hundreds.

<img src="/architecture.svg" alt="clone environments" width="500"/>

All clones of the data can accept reads and writes with no waits for other
clones (consensus- and lock-free). Atomic read and write transactions are
effected via a JSON API. Communication between clones is via a pluggable
messaging layer, for which several implementations are provided.

The data may at any moment differ between clones, but in the absence of any
writes and with a live connection, then all clones will converge on some state.

A clone can be deployed on any platform that has a network connection and for
which an engine exists. It is intended to be co-deployed with components of an
application (app), typically in-process with a data consumer such as the user
interface.

To guarantee data persistence, at least one clone in a data 'domain' must use
reliable storage, or else enough clones must exist for a statistical assurance.
Apps can choose to use one or more domains to partition the data, where different
clones may subscribe to different combinations of domains.
