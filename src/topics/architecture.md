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
effected via a JSON API, which is presented suitably for the clone engine
environment. Communication between clones is via a publish-subscribe messaging
layer, for example MQTT.

A clone can be deployed on any platform that has a network connection and for
which an engine exists. To guarantee data persistence, at least one clone must
use reliable storage, or else enough clones must exist for a statistical
assurance.

The data may at any moment differ between clones, but in the absence of any
writes and with a live connection, then all clones will converge on some state.
