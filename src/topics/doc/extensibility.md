---
tags:
  - topic # mandatory
  - doc # 1th tag is page
  - principle
title: Extensibility
patterns:
  - extension extensibility
summary: '<b>m-ld</b> behaviour is extensible in principle.'
date: 2020-06-15 # Used for sort order
---
**m-ld** is designed for [_Decentralised Extensibility_](https://bit.ly/realtime-rdf-paper). This is a property of systems that permit and support any interested party to develop an extension, and new extensions can be added without permission from a central authority.

You can choose which extensions to use in an app; some may be bundled in a [platform engine](/doc/#platforms) package, others you can write yourself.

Some extensions must be pre-selected by the app in order to connect a new clone to a domain of information. Other extensions can be declared in the data and loaded dynamically by the engine. This allows apps to adapt their behaviour at runtime.

**m-ld** defines a number of extension points:
- [Messaging](/doc/#messaging) is usually pre-selected by the app.
- Constraints (see above) define integrity rules on the domain's data.
- Transport Security allows an app to encrypt and apply digital signatures to **m-ld** protocol network traffic.
- Agreement Conditions assert necessary preconditions for an [agreement](/doc/#agreements).

> 🚧 Transport Security and Agreement Conditions are currently experimental. You can read the [white paper here](https://github.com/m-ld/m-ld-security-spec/blob/main/design/suac.md), and explore the [prototype support](https://js.m-ld.org/#extensions) in the Javascript engine. Please [contact us](/hello/) to discuss your requirements.