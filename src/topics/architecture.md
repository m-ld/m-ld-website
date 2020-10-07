---
tags:
  - topic # mandatory
  - doc # 1th tag is page
title: Architecture
patterns:
  - architecture
summary: '<b>m-ld</b> is a decentralised replicated graph data store with a JSON-based API.'
date: 2020-01-01 # Used for sort order
---
**m-ld** is a decentralised replicated graph data store with a JSON-based API.
Each physical replica is called a 'clone' (note the definitions of terms in the
side-bar). In the picture, the "browser", "microservice" and Australia are just
possible environments for a clone – and there could be any number of clones,
from a handful to hundreds.

<img src="/architecture.svg" alt="clone environments" width="500"/>

All clones of the data can accept reads and writes with no waits for other
clones (consensus- and lock-free). Atomic read and write transactions are
effected via a JSON API. Communication between clones is via a pluggable
messaging layer, with implementations provided.

The data may at any moment differ between clones, but in the absence of any
writes and with a live connection, then all clones will converge on some state.

A clone can be deployed on any platform that has a network connection and for
which a clone 'engine' exists. It is intended to be co-deployed with components
of an application (app), typically in-process with a data consumer such as the
user interface.

To guarantee data persistence, at least one clone in a domain must use reliable
storage, or else enough clones must exist for a statistical assurance. Apps can
choose to use as many domains as they need to partition the data.

**m-ld** can be used in many different application architectures, including
fully decentralised systems having no back-end servers, *local-first* apps
supporting offline use, and enterprise and cloud architectures having back-end
databases or other centralised storage. For a summary of the motivations behind
**m-ld**, read our [Manifesto for Data](/news/#live-and-sharable).

> 🚧 *Coming soon: example deployment diagrams for a selection of
> architectures.* [Let us know](mailto:info@m-ld.io) what your app looks like.