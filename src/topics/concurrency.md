---
tags:
  - topic # mandatory
  - doc # 1th tag is page
title: Concurrency
patterns:
  - concurrency
summary: '<b>m-ld</b> makes a strong distinction between data *consistency* and *integrity*.'
date: 2020-02-01 # Used for sort order
---
**m-ld** makes a strong distinction between data *consistency* and *integrity*.
For definitions of these terms as used in **m-ld** and a discussion of the
trade-offs inherent in **m-ld**'s concurrency model, please refer to the
[documentation portal](http://m-ld.org/doc/#concurrency).

A **m-ld** domain is *eventually consistent*, with the guarantee that, in the
absence of updates and network partitions, all clones will have the same data
(will *converge*).

In contrast, **m-ld** makes no guarantee of data integrity, and adherence to
semantic data rules (such as the constraints you might find in a relational
database) is entirely the app's responsibility.

As a result, it is important for an app's code to account for whatever integrity
rules are important for the domain.

### Constraints
> 🚧 *Inclusion of some declarative integrity constraints in **m-ld** is the
> subject of active research.* Please [get in touch](mailto:info@m-ld.io) if
> this is of interest you for your use-case.

Database constraints in a decentralised system are complicated by the potential
to require conflict resolution, in the event that two concurrent updates are
made which 'disagree' according to the natural semantics of the domain. In
general, conflict resolution strategies fall into the following categories:
- *Ignore*. In (surprisingly) many cases, human users will naturally correct
  conflicting values without significant impedance to their workflow. This
  depends on the user interface presenting the conflict; again, this may be
  easier than it sounds, for example by concatenating conflicting strings with a
  line break. The interface must also be sufficiently 'live', such that the
  user's focus is unlikely to have changed.
- *Procedure*. "convergent constraint"
- *Consensus*. In some cases, a conflict resolution may require out-of-band
  collaboration between instances of the app. Human to human interaction could
  be considered in this category, but other cases may require a consensus
  protocol. Such a protocol is out of the scope of **m-ld**, but its result can
  be applied to the domain via any clone using a normal transaction.

The following is a list of candidate constraints, with reference to relational
database (RDB) parlance where available, and candidate strategies for handling
them.

- *Single-Valued*: A JSON subject property must have a single atomic value.
  
  RDB: *inherent in column/row model*
  
  Scenario: Any subject property in the domain except the `@id` property can
  become multi-valued (an array) if concurrent inserts are made to the same
  subject property.
  
  Resolution: Two strategies are possible depending on the domain semantics.
  - Do not resolve automatically, but present the user with an aggregated value,
    such as a string concatenated with a line break. 
  - Pick a 'winning' value and issue a transaction to delete all other values.
    If the field is also mandatory (see below), the correction must re-insert
    the candidate winner, or else competing corrections would mean all values
    are deleted.

