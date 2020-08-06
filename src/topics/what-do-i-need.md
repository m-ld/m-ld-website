---
tags:
  - topic # mandatory
  - faq # 1th tag is page
title: To use m-ld, what do I need?
patterns:
  - what * (you|I) need
summary: For <b>m-ld</b> you need an engine and a messaging layer.
---
**m-ld** is usually deployed embedded in your app so that access latency
is zero, and data from other users is visible immediately. So, first you need a
m-ld engine for your app's [platform](/doc/#platforms). Alternatively, you could use a clone
deployed on a server (for example, using a Docker microservice.

You also need a supported [messaging](/doc/#messaging) service. If you'd like to
deploy your own, you could use <a href="https://mosquitto.org/">Eclipse
Mosquitto</a>, but it might be better to use a cloud service.

Finally, if your app requires data to be persisted even if all user devices
have removed the data, you may need a clone deployed on a server, which stores
the data onto disk. A clone deployed on a server is ideal for this.