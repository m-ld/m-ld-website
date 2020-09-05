---
tags:
  - topic # mandatory
  - news # 1th tag is page
title: Manifesto for Data
patterns:
  - '(live && sharable)'
  - 'truth'
summary: We believe data should be live and sharable by default.
author:
  git: gsvarovsky
  name: George
date: 2020-09-01
---
> - The 'truth' should be the data that is being used, not the data in distant
>   storage.
> - Distribute the data automatically, with the guarantee that all of it will
>   converge on the same 'truth'.
> - Use a published open standard for encoding data with its meaning, and
>   communicating changes to it.

Hi, I'm George. This year I left my day job as a software engineering leader,
and plunged into lockdown under a mountain of work, uncertainty and risk. Last
week, I pushed the button to launch the **m-ld** Developer Preview. In between
has been a mad journey of creativity, anxiety, frustration, imposter syndrome,
fight and flight, elation and time-dilation, and so! much! coffee!

*But why?*

As a data management app developer, I've used many ways to encode and store
data. Frequently, they are combined in the same architecture, with one of the
locations being blessed as the central 'truth':

![centralised data](/centralised-data.svg)

The specific technologies vary, but the overall pattern is very common.
Motivations include properties of security, integrity, consistency, operational
efficiency and cost. However, there are some other peculiar properties that
stand out:

- The 'truth' is on the far right-hand side; but the data is being *used*
  throughout, with particular value being realised on the left.
- The software application is responsible for both distributing the data and
  for operating on it.
- Every encoding syntax is specific to a technology, and does not expose the
  data's meaning enough to be independently understood.

The main consequence of these properties is application code complexity. We have
to be incredibly careful to maintain an understanding, in the code, of how
current (how close to the truth) our copy of the data is, operate on the data
accordingly, and share the understanding with other components. This is hard,
and frequently goes awry; resulting in software bugs which are very hard to
reproduce, let alone fix.

In this blog, I'll argue that with recent advances in computer science we can
make improvements to this, for many applications. Applying our manifesto, we
want our architecture to look more like this:

![live sharable data](/live-sharable-data.svg)

*But how?*

---

One thing to notice in the centralised data pattern is that we're taking each
encoding of the data and translating it into a new one, to make it suitable for
computation, or storage, or to add security, or for whatever reason. At each
translation the complexity of keeping the new encoding up-to-date with the
previous ones ramps up.

What if we did away with the idea of re-encoding the current data, and instead
transacted in *changes*? Humans do this naturally. When having a conversation
about some information, we don't re-state it every time we want to adjust it. We
refine information by discussing the delta between the old and the new. And we
naturally switch between re-statement and deltas as required.

This concept is nothing new in software either – Event-Driven Architectures have
been a common paradigm since at least the mid-2000s. But consumers of 'events'
have a new problem: to apply the change to their encoding of the current data.
This distributes logically duplicate program code to every consumer – and lines
of code are at least linearly proportional to bugs. Even worse, the event
ordering is critical, so the coordination of the totally ordered log of events
becomes the new centralised 'truth' (and a literally bigger one).

Let's deal with the code duplication issue first. Being good engineers we take
care not to repeat ourselves, but this becomes hard to do when re-stating
something in different languages. So, what if we had a common language for data?
One that could express both state *and* changes to state? Since we're here,
let's have one in which we can encode the meaning of the data, per our
manifesto, including a natural way to identify data universally. And further,
can we have one for which native, widely-available, battle-hardened database
engines exist, so sometimes we don't have to translate anything at all?

Sounds like a big ask. Luckily, academia and industry have been
[working](https://www.w3.org/RDF/) on it for some time. But let's look at the
other problem: change ordering.

---

Imagine if you shared some information with a friend, and then, every thought
you had about it couldn't start until your friend finished whatever thought they
were having about it. This is the strictest way that centralised data management
systems maintain consistency.

To mitigate the impact of this on the fluency of data manipulation, there are
various strategies available like fine-grained locking, optimistic locking and a
choice of transaction isolation levels. These have various merits, but each of
them re-introduces some of the very distributed application complexity we were
trying to reverse, and they still require the central ordered log.

What if we went the other way, and just removed the ordered log entirely?

There are two approaches to concurrency control that don't need a total ordering
of changes. One is called Conflict-free Replicated Data Types (CRDTs), and the
other Operational Transformation (OT). These do provide the required guarantee
that copies of the data will converge to the same 'truth'. But they don't remove
the possibility that concurrent changes will disagree with each other and lead
to a 'truth' that doesn't make sense.

But wait, you and your friend had no trouble refining your shared information,
with no deterministic coordination whatsoever. How?

Humans employ myriad strategies for coordination. You withhold thoughts while
someone else is talking. You undo and redo thoughts against new information,
both before and after expressing them. You notice conflicts that corrupt the
information or render it illogical, apply obvious resolutions, and negotiate
others. You actively seek consensus, or delegate decisions.

In the case of document editing, we can go further and notice that, given a
foundational level of concurrency control in the software – Google Docs uses OT
– editing by multiple humans works fine, and doesn't require much explicit
coordination at all. Research groups have
[found](https://www.inkandswitch.com/local-first.html#findings) that this
applies just as well to CRDTs.

---

There are many finer details to explore in practice. But we have established
that our manifesto can be met, in principle, with application of current
computer science.

The approach that we've taken with **m-ld** is to provide a protocol, with
implementing engines, for distributing data in a distributed application.

1. The 'truth' is the data exposed to the app by the engine.
1. The data is automatically distributed by the engine with the guarantee that
   all engines will converge on the same 'truth'.
1. We use an open standard for encoding data with its meaning, and communicating
   changes to it.

For now, we're proving out the tech, and filling out the corners that we think
are essential for collaboration and autonomy use-cases. But we think we're onto
something important to data architectures in general.

**We'd love to hear what [you](/hello/) think.**

If you're ready to try **m-ld** out, you can work with the
[Developer&nbsp;Preview](/doc/) right now. Let us know what you're building!