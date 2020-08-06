---
tags:
  - topic # mandatory
  - doc # 1th tag is page
  - implementation
title: Messaging
patterns:
  - messaging
  - message broker
  - realtime service
  - pubsub
summary: '<b>m-ld</b> engines use a message delivery architecture.'
date: 2020-11-01 # Used for sort order
---
**m-ld** engines generally require the reliable publication of messages to the
domain. Logically this is part of the network infrastructure and abstracted in
the **m-ld** specification.

> 🚧 The precise meaning of 'reliable' is specified in the **m-ld** clone protocol,
> documentation coming soon.

Unfortunately, message publishing with the required guarantees is not publicly
available as part of the internet, so it is necessary for an app to provide a
compliant service for its domain. This should not be onerous, as the clone
engine is responsible for connecting, typically with only a URL and some
relevant configuration.

Message-layer protocols are currently specified for:
- [MQTT](http://mqtt.org/): a machine-to-machine (M2M)/"Internet of Things"
  connectivity protocol. Convenient to use it for local development or if the
  deployment environment has an MQTT broker available.
- [Ably](https://www.ably.io/): provides infrastructure and APIs to power
  realtime experiences at scale. It is a managed service, and includes
  pay-as-you-go [developer pricing](https://www.ably.io/pricing). It is also
  convenient to use for global deployments without the need to self-manage a
  broker.

Check the clone engine documentation for its supported message layer and
configuration details.