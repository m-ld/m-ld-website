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
every clone.

A helpful way to think about this, is to consider any gathering of human beings
with an information goal; like a conference. At any moment, each participant
could be receiving information or formulating information, or frequently, both.
There could be multiple channels along which information flows. But ideally,
everyone will eventually converge on the same set of information. **m-ld**
applies this model to the information stored in clones.

...

**m-ld** makes a distinction between data *consistency* and *integrity*.

"Consistency" is meant slightly more broadly than the 'C' in the
[CAP&nbsp;theorem](https://people.eecs.berkeley.edu/~brewer/cs262b-2004/PODC-keynote.pdf)
conceived by Eric Brewer in 2000.

**m-ld guarantees *eventual consistency*. In the absence of updates and network
partitions, all clones will report the same data (will *converge*).**

Another viewpoint is to posit a hypothetical single data store for the domain.
If no new updates are made, eventually all clones' responses to any query would
be indistinguishable from the responses from this store.

"Integrity" is meant as adherence of the domain data to a set of semantic rules
like:
- This property has one and only one value
- This property is of a specific data type
- This property refers to some other entity which exists

In a relational database you might find these integrity rules realised as
*constraints*.

**m-ld makes no guarantee of data integrity, and adherence to data rules is
entirely the app's responsibility.**

As a result, it is important for an app's code to implement whatever integrity
constraints are important for the domain.

### Constraints
> 🚧 Inclusion of declarative integrity constraints in **m-ld** is the subject
> of active research. Please [get in touch](mailto:info@m-ld.io) if this is of
> interest to you for your use-case.

Data constraints in a decentralised system are complicated by the potential
to require conflict resolution, in the event that two concurrent updates are
made which 'disagree' according to the natural semantics of the domain. In
general, conflict resolution strategies fall into the following categories:
- *Temporarily Ignore*. In (surprisingly) many cases, human users will naturally correct
  conflicting values without significant impedance to their workflow. This
  depends on the user interface presenting the conflict; again, this may be
  easier than it sounds, for example by concatenating conflicting strings in the
  user interface with a line break. The interface must also be sufficiently
  'live', such that the user's focus is unlikely to have changed.

  Ignored rule violations that persist can be captured later, for example in the
  next user workflow step, or even by a housekeeping process which applies a
  procedural fix.
- *Procedure*. A conflict may manifest as a nonsensical or ambiguous state for
  which it is possible to make a correction or decide an outcome. The correction
  can be implemented in the app code. Since each app instance may at any time
  'see' a different state, these corrections can compete with each other, so it
  is important to analyse the possible outcomes for secondary bad states.
- *Consensus*. A conflict resolution may require out-of-band collaboration
  between instances of the app. Human to human interaction could be considered
  in this category, but other cases may require an automatic consensus protocol.
  Such a protocol is out of the scope of **m-ld**, but its result can be applied
  to the domain via any clone using a normal transaction.

The following is a list of candidate constraints, with reference to relational
database (RDB) parlance where available, and candidate strategies for handling
them.

- *Single-Valued*: A subject property must have a single atomic value.
  
  RDB: *inherent in the row/column model*
  
  Scenario: Any subject property in the domain can become multi-valued (an
  array) if concurrent inserts are made to the same subject property.
  
  Resolution: Two strategies are possible depending on the domain semantics.
  - Do not resolve automatically, but present the user with an aggregated value,
    such as a string concatenated with a line break. The user will correct the
    value if they see it as incorrect.
  - Pick a 'winning' value and issue a transaction to delete all other values.
    If the field is also mandatory (see below), the correction must re-insert
    the candidate winner, or else competing corrections would mean all values
    are deleted.

  ---
- *Mandatory Property*: A subject must have a value for a property.

  RDB: `NOT NULL`

  Scenario: If one app instance removes a subject in its entirety at the same
  time as another app instance updates a property, then the updated property
  value remains in the converged domain – all other properties are now missing,
  even if mandatory. (Note that neither app instance violated the rule locally.)

  Resolution: Treat a subject without a value for a mandatory field as an
  invalid subject. Invalidity can be fixed later (*ignore*), or immediately, by
  deleting the subject.

  ---
- *Unique field*: All subjects in the domain (possibly of a specific type) must
  have unique values for a property (besides their identity).

  RDB: `UNIQUE KEY`

  Scenario: Concurrent updates to two different subjects could both update the
  property to the same value.

  Resolution: *Deterministically* but otherwise arbitrarily decide the Subject
  to receive the conflicting value. Delete the other subject's property. If the
  property is mandatory, revert the value to the previous (it must exist in the
  same transaction).

  ---
