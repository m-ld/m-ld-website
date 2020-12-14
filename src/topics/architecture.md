---
tags:
  - topic # mandatory
  - doc # 1th tag is page
title: Architecture
patterns:
  - architecture
summary: '<b>m-ld</b> is a decentralised live data sharing component with a JSON-based API.'
date: 2020-01-01 # Used for sort order
---
**m-ld** is a decentralised live data sharing component with a JSON-based API.

**m-ld** is used by including it in a software application (an 'app'). The app
gains the power to share live data with other copies of itself, without any need
to store or coordinate the data centrally in a database, or otherwise cope with
the hard problem of keeping distributed data up to date. A bit like Google docs,
but for any structured data specific to the app: designs, bookings,
observations, plans or anything else; and also, without the need to entrust the
data to a third party.

The set of data being shared is called a 'domain' (note the definitions of terms
in the side-bar), for example one design, booking or plan. The data in the
domain is copied or 'replicated' to wherever the app is, and after that, all the
copies are kept synchronised with each other by **m-ld**.

Each physical copy is called a 'clone'. In the picture, the "browser",
"microservice" and Australia are just possible environments for a clone – and
there could be any number of clones, from a handful to hundreds. In reality,
most of the time, most of the environments will be of the same type, like on a
mobile device, but there is no fundamental need for this. A clone can be
deployed with its host app on any platform that has a network connection and for
which a clone 'engine' exists.

<p align="center">
<img src="/architecture.svg" alt="clone environments" width="500"/>
</p>

All clones of the data can accept reads and writes without waiting for other
clones to agree (consensus- and lock-free). Atomic read and write transactions
are done locally using a JSON API. Communication between clones is via a
pluggable messaging layer, with implementations provided.

The data may at any moment differ slightly between clones, but in the absence of
any writes, and with a live connection, then all clones will 'converge' on an
identical set of data, as fast as the network can carry the latest changes.

The 'network' is the medium through which messages travel from one clone to
another. Clones treat the messaging network as a resource, and the core of
**m-ld** requires to be able to publish messages to all online clones, and
sometimes to address one other clone directly. This can be done using a number
of possible technologies, and it's possible to add new ones by creating an
adapter. At the moment, **m-ld** has adapters for MQTT and Ably. See
[below](/doc/#messaging) for more details.

To guarantee the data is safe from accidental loss, at least one clone in a
domain should use reliable storage, or else enough clones must exist so that
statistically, there is always someone with the data. Apps can choose to use as
many domains as they need, to partition all the data that they want to share.

To keep the data safe from attackers, the app needs to ensure that the network
and local storage (if used) can only be accessed by legitimate users. It does
this by securing these resources _before_ giving them to the local **m-ld**
clone for its use. More details on this and other aspects of security can be
found [below](/doc/#security).

**m-ld** can be used in many different system architectures, including fully
decentralised systems having no back-end servers, *local-first* apps supporting
offline use, and enterprise and cloud architectures having back-end databases or
other centralised storage. For a summary of the motivations behind **m-ld**,
read our [Manifesto for Data](/news/#live-and-sharable).

> 🚧 *Coming soon: example deployment diagrams for a selection of
> architectures.* [Let us know](/hello/) what your app looks like.