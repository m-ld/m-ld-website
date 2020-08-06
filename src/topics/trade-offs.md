---
tags:
  - topic # mandatory
  - doc # 1th tag is page
  - implementation
title: Trade-Offs
patterns:
  - trade off
summary: '<b>m-ld</b> engines can be configured to balance quality of service.'
date: 2020-09-01 # Used for sort order
---
While adhering to the principles above and the **m-ld**
[specification](https://spec.m-ld.org/), engines may offer differing quality of
service, balancing non-functional considerations. These might also be affected
by configuration options.

In all cases, engine documentation will provide the necessary details.

### Query Patterns
An engine is at liberty to support a subset of the API query syntax, primarily
because of limitations of the platform storage. The consequence of this may be
that more work has to be done in the app code to maintain its own view of the
data.

### Threading
All operations on **m-ld** data are inherently asychronous and therefore assumed
to be [concurrent](/doc/#concurrency) with other operations. Each engine maps
this model onto the threading model of the platform, balancing the soonest
return of control to the app against the complexity of handling out-of-band
errors.

One consequence of this is that there may be circumstances in which the engine
cannot guarantee the completion of operations in the face of external interrupts.

### Performance
Engines may balance performance of some operations against others, as well as
against other considerations. For example, a clone whose storage is entirely
in-memory will offer the fastest transaction performance, but must re-cache all
of its data from the domain on start-up. If this is prohibitively slow, there
could be an option to periodically flush the memory data to disk. 

### Scalability
Every clone logically provides access to all the data in the domain. In most
engine implementations, this means that all the data must be stored locally
– as this will also provide the fastest access and best data safety.

> 🚧 Clones which do not store all the data locally are the subject of active
> research. A proposal document for this feature will shortly be available in
> this portal. Please [feed-back](https://github.com/m-ld/feedback/issues) any
> specific concerns you have.