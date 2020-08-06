---
tags:
  - topic # mandatory
  - doc # 1th tag is page
  - principle
title: Decentralisation
patterns:
  - decentralise
summary: '<b>m-ld</b> data is decentralised in principle.'
date: 2020-03-01 # Used for sort order
---
In principle, **m-ld** clones are low-cost replicates and can be created and
destroyed with impunity. They are
["cattle,&nbsp;not&nbsp;pets"](http://cloudscaling.com/blog/cloud-computing/the-history-of-pets-vs-cattle/).
This is unlike the traditional database approach of carefully looking after
individual database instances.

*Decentralisation* in **m-ld** is technically enabled by the low cost of clone
replication. The natural deployment pattern is to keep the clone engine close to
the app, usually in-process, and so there is no need for a central database. In
many deployments it may be desireable to have some clones on servers, to ensure
data safety – but these are more akin to backups.

### Resilience
This principle means that the permanent loss of an individual clone only leads
to data loss in the rare case that clone has updates that have yet not been
published, by being offline. There is no way to deliberately prevent the
publication of updates – note this is not about
[access&nbsp;control](/doc/#security), which is addressed separately.

A domain with sufficient clones is therefore *resilient* to infrastructure
failures. In this respect and others, clones are similar to microservices.

### Authority
In the absence of necessary centralisation, an app is at liberty (and has a
responsibility) to decide an authority model that works best for the domain.
**m-ld** is generally agnostic to who owns data and decides data correctness.
However, it does collaborate with the app to secure the data against
[unauthorised&nbsp;access](/doc/#security).

### Realisation
Decentralisation is realised by a foundational protocol for data sharing which
is:
- convergent: all clones will eventually have the same data.
- automatic: the app never needs to request or react to synchronisation with the
  domain (it does need to react to individual data changes, but this is
  irrespective of where they arise).
- efficient: a new clone or a re-starting clone is able to quickly rev-up to
  equivalence with other live clones. Furthermore, it can accept updates
  *before* this process completes.

More detail on data sharing is found in the [concurrency](/doc/#concurrency)
section.