---
tags:
  - topic # mandatory
  - doc # 1th tag is page
  - principle
title: Multi-Platform
patterns:
  - platforms
summary: 'The <b>m-ld</b> protocol is platform-independent in principle.'
date: 2020-07-01 # Used for sort order
---
The **m-ld** 'protocol' is designed without reference to a platform. This
protocol comprises the scheme of messages and signals by which m-ld clones
talk to each other, how apps talk to their clones, and the logical graph
representation.

This allows a clone engine to be implemented on any compute platform, as
required by use-cases. See the available [Platforms](/doc/#platforms).