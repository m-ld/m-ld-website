---
tags: faq
question: To use m-ld, what do I need?
patterns:
  - what * (you|I) need
summary: For <b>m-ld</b> you need an engine and a messaging layer.
date: 2020-01-02
---
**m-ld** is usually deployed embedded in your app so that access latency
is zero, and data from other users is visible immediately. So, first you need a
<a>m-ld engine</a> for your app's platform. Alternatively, you could use a clone
deployed on a server (for example, using a<a>Docker microservice</a>; but note
that you'd have to <a>manage live data updates yourself</a>).

You also need a <a>supported message broker</a>. If you'd like to deploy your
own, you could use <a href="https://mosquitto.org/">Eclipse Mosquitto</a>, but
it might be better to use a cloud service.

Finally, if your app requires data to be persisted even if all user devices
have removed the data, you may need a clone deployed on a server, which stores
the data onto disk. A <a>Docker microservice</a> is ideal for this.