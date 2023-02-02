---
tags:
  - topic # mandatory
  - faq # 1th tag is page
title: Is my data secure?
patterns:
  - '(secure|security|secured) * @hasQuestionMark'
  - '(security && @hasQuestionMark)'
summary: <b>m-ld</b> data is secured in collaboration with the app.
---
**m-ld** data is secured *in motion* and *at rest*, in collaboration with the
app using **m-ld** for data.

A clone obtains and maintains the current app state using realtime messaging,
which can be configured securely. This will typically comprise
*authentication* of the user and *encryption* of the data on the wire.

A clone may also allow the data to be encrypted when persisted to disk. Where
this is supported, it is specific to the clone engine.

See the [security](/doc/#security) section in the documentation for more
details.