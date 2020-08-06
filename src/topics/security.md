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
The threats that must be controlled in collaboration with a clone engine are a
subset of the threats to the app. These include threats to:
- *Confidentiality*: reading of data to steal information
- *Integrity*: modification of data to mislead information consumers
- *Availability*: prevention of normal function for sabotage or coercion

The attack surface of an engine generally comprises:
- The local device storage being used by the engine
- The network between the engine and other clones
- The clone API presented to the app

A decentralised data store does not have a privileged, trusted central authority
(although the trust model of such a central authority may never have been as
straightforward as it seemed, as evidenced by damaging data leakages by such
authorities). Since an app must be free to decide its own security model, and
since the **m-ld** engine is not itself afforded any special privilege because
of its deployment, an engine trusts the *app* in principle. The consequences of
this are explained in the sections below.

### Authentication & Authorisation
It is the app's responsibility to authenticate and authorise its users. For the
reason above, and unlike some centralised data management systems, **m-ld** does
not have a first-class 'user' concept with special semantics. This includes any
notion of credentials, such as passwords. (Note that this does not prevent an
app from storing user information in **m-ld**, so long as it has suitable access
controls.)

This means an app is free to authenticate its users by any chosen means, such as
device native login, or using a third-party single sign-on system. The app
should gate access, using the authentication, to its functions which access the
**m-ld** engine.

> 🚧 In future, **m-ld** will allow an app to negotiate a 'local key' credential
> that the engine can use to:
> - confirm the identity of the app instance, for example after a re-start
> - selectively encrypt data in storage and on the network (see below)
> - identify and suppress malware (see below)
>
> A specification document for this feature will shortly be available in this
> portal. Please [feed-back](https://github.com/m-ld/feedback/issues) any
> specific concerns you have.

### Storage & Network
A **m-ld** engine may use storage to automatically persist data between and
during app sessions (depending on its documented transaction guarantees). Since
this storage will frequently be local to the device, it can be vulnerable to
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

> 🚧 The app's ownership of storage and network handles could be combined with
> its authentication mechanism to control access *per user*. For example, a
> local user not being authorised to see some data belonging to another user.
> However, this approach is not ideal because:
> - It requires the app to have knowledge of the engine's storage data format,
>   and the **m-ld** protocol's data format. These are published, but may not
>   be easy to manipulate.
> - It requires the app instance to have privileges above that of the local
>   user. On some devices this may not be possible.
>
> We are working on an entension to the **m-ld** protocol that will support
> automatic application of selective data encryption. A specification document
> for this feature will shortly be available in this portal. Please
> [feed-back](https://github.com/m-ld/feedback/issues) any specific concerns you
> have.

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

> 🚧 This vulnerability can arise in distributed computing of any kind (except
> in a trusted compute platform, and that has problems of its own). But once it
> has arisen, identifying and suppressing malware requires coordination among
> the peers of a decentralised system.
>
> We are working on an entension to the **m-ld** protocol that will support
> early identification and suppression of malware and suspicious activity. A
> specification document for this feature will shortly be available in this
> portal. Please [feed-back](https://github.com/m-ld/feedback/issues) any
> specific concerns you have.
