---
tags:
  - topic # mandatory
  - news # 1th tag is page
title: July 2021 Update
patterns:
  - 'Javascript'
summary: vision sharing, a new release & projects underway
author:
  git: gsvarovsky
  name: George
date: 2021-07-14
linkedin: TODO
---
Hi folks and welcome to another bumper **m-ld** update.

### Sharing our Vision

![NLnet](/media/logo_nlnet.svg)

Recently we shared our vision for **Live Shared Linked Data** at the NLnet [Next Generation Internet webinar on Linked Data](https://nlnet.nl/events/20210621/LinkedData/). You can [read the presentation](https://bit.ly/live-linked-data) at your own pace; and we'd love to [hear from you](/hello/) if it resonates!

<img src="https://2021-eu.semantics.cc/sites/2021-eu.semantics.cc/files/semantics-amsterdam-2021.png" alt="SEMANTiCS 2021" width="300">

We'll also be presenting a posters & demos track paper about **m-ld** at [SEMANTiCS](https://2021-eu.semantics.cc/), the leading European conference on Semantic Technologies and AI. Will we see you there?

### Web Starter Project

We've added a new [starter project](https://github.com/m-ld/m-ld-web-starter) for web apps wanting to share information in real-time. It should help with getting to grips with the best patterns for incorporating **m-ld** into apps.

For this use-case, we've added an new way for clones to get in touch with each other. [**Socket.io**](https://socket.io/) is a popular library for real-time updates in web apps, and the Javascript engine's [new plug-in](https://js.m-ld.org/#socketio-remotes) makes it easy to enable real-time information collaboration. But also, by doing this we showed just how [little code](https://github.com/m-ld/m-ld-js/tree/master/src/socket.io) is needed to support a new messaging protocol. So, don't worry if your preferred choice is not on the list yet, we can make it happen!

### Javascript Engine v0.7

Yesterday we dropped another release of the [Javascript engine](https://js.m-ld.org/), which includes some important internal advances. It's live in the [demo](/demo/) right now!

The biggest change is protocol support for journal compaction. This will help reduce storage costs, by allowing clones to compact and truncate their journals, as best suits the platform and the app. A 'balanced' journaling strategy with some [simple options](https://js.m-ld.org/interfaces/journalconfig.html) is the default for the Javascript engine, and we'll expose more options and APIs over time, as we learn.

### Securing Shared Decentralised Live Information

As we announced last time, we've begun a project to research and prototype modifications to the primitives of the **m-ld** core protocol to support **strong assurance of data integrity and traceability**. You can now check out the project [introduction and repository](https://github.com/m-ld/m-ld-security-spec), and see how we're [going about it](https://github.com/orgs/m-ld/projects/5).

The first step is a deep dive into security threats in a couple of domains, to make sure our security designs meet the needs of real-world scenarios; and the first of these is well under way...

**Collaborative e-Invoice Composition** is an early-stage collaboration project between **m-ld**
and [Ponder Source](https://pondersource.com/). Join us on [Gitter](https://gitter.im/federatedbookkeeping/community) to discuss ideas to transform procurement processes for the better!
