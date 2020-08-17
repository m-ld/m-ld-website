---
tags:
  - topic # mandatory
  - doc # 1th tag is page
title: Concurrency
patterns:
  - concurrency
summary: '<b>m-ld</b> offers an eventual consistency guarantee in principle.'
date: 2020-06-01 # Used for sort order
---
Any clone operation may be occurring concurrently with operations on other
clones. Transaction operations combine to realise the final convergent state of
every clone. This is unlike many existing data management technologies, which
require serialisable transactions and so frequently, various locking strategies
to prevent concurrent edits.

A helpful way to think about this, is to consider any gathering of human beings
with an information goal, like a conference. At any moment, each participant
could be receiving information or formulating information, or frequently, both.
There could be multiple channels along which information flows. But ideally,
everyone will eventually converge on the same set of information. **m-ld**
applies this model to the information stored in clones – with the enhancement
that the eventual convergence is guaranteed.

In this model, it is necessary to make a distinction between data *consistency*
and *integrity*.

"Consistency" is meant slightly more broadly than the 'C' in the
[CAP&nbsp;theorem](https://people.eecs.berkeley.edu/~brewer/cs262b-2004/PODC-keynote.pdf)
conceived by Eric Brewer in 2000.

**m-ld guarantees *eventual consistency*. In the absence of updates and network
partitions, all clones will report the same data (will *converge*).**

Another viewpoint is to imagine a hypothetical single data store for the domain.
If no new updates are made, eventually all clones' responses to any query would
be indistinguishable from the responses from this store.

"Integrity" is meant as adherence of the domain data to a set of semantic rules
like:
- This property has one and only one value
- This property is of a specific data type
- This property refers to some other entity which exists

In a programming language, you might find these rules expressed in the type
system. In a relational database, the rules are codified as *constraints*.

In **m-ld**, integrity is a collaboration between the domain, engine, app and
user. While **m-ld** does support "constraints" (see below), it is first
important to consider how integrity of this kind applies to a collaborative
system and to your use-case.

### App Integrity
Like most apps, those using **m-ld** will validate inputs. The validation rules
are in the app's code, and are the app's responsibility. Most of the time, these
rules will capture constraint violations before they reach the data domain.

However, sometimes a rule will be violated not by the immediate operation, but
by an operation done on a different clone, which 'disagrees' in some way
according to the natural semantics of the domain. This is a "conflict".

The likelihood of conflicts arising depends greatly on the domain. For example,
an application that records some observed facts about the world may very rarely
give rise to conflicts.

Unlike some client-server systems, a **m-ld** app is constantly notified of
updates to the domain data. This gives the app the opportunity to handle
conflicts when they arise. Strategies that could be applied by the app fall into
the following categories:

- *Temporarily Ignore* (recommended). In (surprisingly) many cases, human users
  will naturally correct conflicting values without significant impedance to
  their workflow. This depends on the user interface presenting the conflict;
  again, this may be easier than it sounds, for example by concatenating
  conflicting strings with a line break in the user interface. Ignored rule
  violations that are not immediately noticed by the user can be captured later,
  for example in the next user workflow step, or even by a housekeeping process
  which applies a procedural fix.
- *Procedure*. A conflict may manifest as a nonsensical or ambiguous state for
  which it is possible to automaticaly make a correction or decide an outcome.
  The correction can be implemented in the app code. However, since each app
  instance may at any time 'see' a different state, these corrections can
  potentially compete with each other, so care must be taken not to create a
  cascade of competing updates.
- *Consensus*. A conflict resolution may require out-of-band collaboration
  between instances of the app. Human to human interaction could be considered
  in this category, but other cases may require an automatic consensus protocol.
  Such a protocol is out of the scope of **m-ld**, but its result can be applied
  to the domain via any clone using a normal transaction.

### Constraints
The **m-ld** [specification](http://spec.m-ld.org/#data-semantics) defines a set
of declarative constraints that can be applied to a domain. Unlike app-based
integrity rules, these do not require that the app recognise and handle rule
violations – the app is able to rely on the data it perceives always being
compliant with the rule.

> 🚧 Inclusion of declarative integrity constraints in **m-ld** is an
> experimental feature, and the subject of active research. The available
> constraints and the means by which they are declared for a domain is likely to
> change. Please do [get in touch](mailto:info@m-ld.io) with your requirements.
