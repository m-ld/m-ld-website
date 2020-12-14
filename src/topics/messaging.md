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
domain. Logically this is part of the 'network' infrastructure and abstracted in
the **m-ld** specification.

One day message publishing will be publicly available as part of the internet.
In the meantime, it is necessary for an app to provide a network service to the
clone, via an adapter. This is straightforward, as the clone engine typically
only needs to be given a URL and some relevant configuration.

Message-layer adapters are currently specified for:
- [MQTT](http://mqtt.org/): a machine-to-machine (M2M)/"Internet of Things"
  connectivity protocol. Convenient to use for local development or if the
  deployment environment has an MQTT broker available.
- [Ably](https://www.ably.io/): provides infrastructure and APIs to power
  realtime experiences at scale. It is a managed service, and includes
  pay-as-you-go [developer pricing](https://www.ably.io/pricing). It is also
  convenient to use for global deployments without the need to self-manage a
  broker.

Ably is similar to other cloud message-publishing services such as AWS
[SNS](https://aws.amazon.com/pub-sub-messaging/) and Azure
[Service&nbsp;Bus](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview),
as well as other popular technologies like [RabbitMQ](https://www.rabbitmq.com/)
and Apache [Kafka](https://kafka.apache.org/). All of these would be suitable
services for **m-ld** messaging.

**m-ld** can also work with a fully peer-to-peer messaging system, to realise
complete architecture decentralisation in next-generation internet apps.

> 🚧 Please [let&nbsp;us&nbsp;know](/hello/) if you would like to use any of
> these options in your system architecture. We would be delighted to work with
> you to make best use of your infrastructure commitments.

Check the clone [engine](/doc/#platforms) documentation for its supported
message layer and configuration details.