---
tags:
  - topic # mandatory
  - doc # 1th tag is page
  - principle
title: Security
patterns:
  - '(secure|security|secured)'
summary: '<b>m-ld</b> collaborates with an app to secure data.'
date: 2020-08-01 # Used for sort order
---
The **m-ld** protocol is designed to ensure that an app using a clone engine can
be secured against threats to the shared data. This is necessarily a
collaboration with the app implementation, since the app must be allowed
privileged access to the data in order to function.

### Threats
The threats that must be controlled in collaboration with a clone engine are a subset of the threats to the app. These include threats to *Confidentiality*, *Integrity* and *Availability*.

The attack surface of an engine generally comprises:
- The local device storage being used by the engine
- The network between the engine and other clones
- The clone API presented to the app

### Trust Model
An app using **m-ld** is free to decide its own security model. Because the **m-ld** engine is embedded in the app, it not itself afforded any special privilege because of its deployment. In particular, a **m-ld** domain does not inherently have a privileged, trusted central authority. However, an app may choose to deploy **m-ld** clones to its own trusted service or data tier.

### Authentication
It is the app's responsibility to authenticate its users by any chosen means, such as device-native login, or using a third-party single sign-on system. The app should gate access, using the authentication, to its functions which access the **m-ld** engine.

Data is transmitted between clones using a choice of [messaging](/doc/#messaging) provider. Since this data is at risk from network attacks, the messaging system itself should be authenticated, either with the user credentials or some token obtained with them.

An example app login behaviour:
1. Redirect the user to login via an identity provider
2. Retrieve a signed token from identity provider
3. Connect to the messaging system using the token
4. Initialise the **m-ld** clone with the messaging system connection

### Authorisation
In many apps, authenticated users will have read/write access to the domain as a whole. The app controls which domains the user can select from and connect a clone to. To prevent unauthorised access to data-in-transit from other domains, it is generally necessary to control access to the _channels_ of the messaging system in use.

Fine-grained write access control within a single domain can be achieved using _constraints_.

> 🚧 Using constraints for fine-grained write access control is currently experimental. You can read the [white paper here](https://github.com/m-ld/m-ld-security-spec/blob/main/design/suac.md), and explore the [prototype support](https://js.m-ld.org/classes/writepermitted.html) in the Javascript engine. Please [contact us](/hello/) to discuss your security requirements.

### Auditing & Non-Repudiation
Once a user is authorised to the application, it may be important to record their activity, as well as that of any other system actor such as a bot, in tamper-proof way, for later auditing. This can generally be achieved with the use of audit stamps (time & user) on updates. If necessary, these stamps can be digitally signed by the app.

### Storage & Network
A **m-ld** engine may use storage to automatically persist data between and
during app sessions (depending on its documented transaction guarantees). Since
this will frequently be local to the device, the storage could be vulnerable to
attack on a side channel, such as direct access through the local operating
system.

Similarly, the engine uses the network to communicate updates. This happens
automatically [in&nbsp;principle](/doc/#realtime). The network has an attack
surface comprising:
- Any used network layer components between app instances, including
- the local device's operating system network drivers, and
- any third-party message brokers or realtime providers.

In principle, it is the app's responsibility to ensure that the storage and
network are secure. In practice, this means that an engine always requires the
storage and network handles from the app, usually prior to initialisation (in
some platform-specific format). The app is then able to prevent unauthorised
access in the same way it would for any other use of a storage or network
resource.

Typical app controls will include encryption of data at rest and on the wire.
This has the advantage that it prevents unauthorised access and tampering by any
device without credentials.

### Malware
In common with other decentralised technologies, in principle **m-ld** has no
central data gatekeeper with a controlled implementation.

As noted above, when using **m-ld**, an app is responsible for ensuring that the
network used by the engine is secure. This extends to ensuring that it is only
available to authorised users.

However in this model it is still possible for a legitimate authorised user to
be deceived into entering their credentials into a counterfeit app, and by
extension, a counterfeit clone engine. This malware app could then have
privileged access to domain data, both for read and write.

It is therefore critical that the app is protected from malware at the level of
the compute platform.