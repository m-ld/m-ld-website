---
tags:
  - topic # mandatory
  - faq # 1th tag is page
title: Is my data secure?
patterns:
  - '(secure|security|secured)'
summary: <b>m-ld</b> data can be secured in motion and at rest.
date: 2020-01-02 # For sort order
---
**m-ld** data can be secured _in motion_ and _at rest_.

A clone obtains and maintains the current app state using realtime messaging,
which can be configured securely. This will typically comprise
**authentication** of the user and **encryption** of the data on the wire.

A clone may also allow the data to be encrypted when persisted to disk. Where
this is supported, it is specific to the clone engine.