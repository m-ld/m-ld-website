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
Hi, I'm George. This year I left my day job as a software engineering leader,
and plunged into lockdown under a mountain of work, uncertainty and risk. Last
week, I pushed the button to launch the **m-ld** Developer Preview. In between
has been a mad journey of creativity, anxiety, frustration, imposter syndrome,
fight and flight, elation and time-dilation, and so! much! coffee!

*But why?*

As a data management app developer, there's something that has never seemed
right to me about how we treat data. It manifests in lots of ways, which don't
necessarily seem related. Overall though, it's this:

> Strategies we use to manage data, are killing it instead.

In this blog, we'll talk about two ways that data dies, and propose an approach
to reverse these and keep it *live*, and *sharable*.

---

Ideas take shape where life is: in a mind. That's where they're first formed,
and that's where they're refined and combined with other ideas. They may be
shared to other minds, and so benefit from an unbounded environment in which
they can be processed and referenced.

In the course of this, ideas may be encoded outside the mind. Sometimes this
encoding sustains the utility of the idea beyond what would have been possible
otherwise, especially if it is complex or numerical. In fact without this, some
ideas might not exist at all.

We're so proud of this technical achievement, and so used to applying it, that
we just keep doubling down. Put the idea in an object. Put the object in a
table. Put the table in a database. Put the database in a server. Put the server
in a datacentre.

Notice the twist: the encoding is not the idea. The idea was sustained by some
specific properties of the encoding: scalability and precision. But in our
keenness to treat the encoding as a precious 'truth', and push this truth
further and further from the mind to some central location, we've sacrificed
other properties, particularly, the one that gave us the idea in the first
place: the idea was in a mind, being thought about. It was *live*. We have to
bring the data back to the mind to bring it back to life.

Now all hell breaks loose as we try to undo what we've done. Data centres
sometimes go down, so the storage is replicated, and databases have to manage
everyone's ideas all at once so we have to extricate the right one, from the
right replica. Table rows don't map well to service code, so we re-arrange the
query results into 'objects', and then re-arrange them again into text to send
across the network, which has seven layers of complexity by itself, and which,
yes, sometimes goes down; so we cache the data, and worry about invalidating
those caches. And so on, and on. Some of the steps are so arcane and bizarre you
couldn't make them up.

Of course, each layer and protocol and syntax was put in place for good reasons,
and for some kinds of data this arrangement offers the right properties. But for
some data, which I've labelled 'ideas', the deepest encoding, on a server
somewhere in US-East, is no longer the 'truth'. It's the *furthest* from the
truth.

And though we applied technologies with the condition, if not the purpose, to
make the idea sharable, somehow, we find that every encoding syntax is specific
to a technology and does not expose the idea's meaning enough to be
independently understood. The living idea that we set out to share, is
static and obfuscated.

Can we turn this model on its head, and instead preserve the primacy of the live
data? I argue that with advances in computer science, yes, we can.

---

One thing to notice is that we're taking each encoding of the idea's current
state, and translating it into a new one, to make it fit in a medium with more
storage, more security, more integrity, or for whatever reason. At each
translation, it becomes harder to keep the new encoding up-to-date with the
previous ones.

What if we did away with the idea of encoding the current state, and instead
transacted in *changes*? This is what we do mind-to-mind, after all. On a
video-conference, we don't re-state every idea, every time we want to adjust it.
We refine ideas by discussing the delta between the old idea's formulation and
the new one. And we naturally switch between re-statement and deltas as
required.

This concept is nothing new – Event-Driven Architectures and Event Sourcing have
been a common paradigm since at least the mid-2000s. But consumers of 'events'
have a new problem: to apply the change to their encoding of the current state.
This distributes logically duplicate program code to every consumer – and lines
of code are at least linearly proportional to bugs. Even worse, the event
ordering is critical, so the coordination of the totally ordered log of events
becomes the new centralised and problematic (un)'truth' (and a literally bigger
one).

Let's deal with the code duplication issue first. Being good engineers we take
care not to repeat ourselves, but this becomes hard to do when re-stating
something in different languages. So, what if we had a common language for data?
One that could express both state *and* changes to state? While we're here,
let's have one in which we can encode the meaning of the data, including a
natural way to identify data universally. And further risking being overbearing,
can we have one for which native, widely-available, battle-hardened database
engines exist, so sometimes we don't have to translate anything at all?

Sounds like a big ask. Luckily, academia and industry have been
[working](https://www.w3.org/RDF/) on it for some time. But let's look at the
other problem: change ordering.

---

Imagine if you shared an idea with a friend, and then, every thought you had
about it couldn't start until your friend finished whatever thought they were
having about it. This is how we code data management systems.

But no, shout the terminally-invested, we have row-level locking! And optimistic
locking! And read-committed isolation!

Such strategies have various merits, but they are themselves predicated on the
totally-ordered central log. If we pull that rug out, everyone will just fall in
a heap. Right?

Not necessarily. Let's put on the table (so to speak) two approaches to
concurrency control that don't need total ordering. One is called Conflict-free
Replicated Data Types (CRDTs), and the other Operational Transformation (OT).
Before you disappear off to scour the web for these creatures, let's just note
that they're not magical, and the more you delve into them, the more
disappointingly limited they become. But wait, you and your friend had no
trouble refining your idea, with no deterministic coordination whatsoever, let
alone a totally-ordered thought log. How?

The fact is, humans employ myriad strategies for coordination. You withhold
thoughts while someone else is talking. You undo and redo thoughts against new
information, both before and after expressing them. You notice conflicts that
corrupt the idea or render it illogical, apply obvious resolutions, and
negotiate others. You actively seek consensus, or delegate decisions.

In the case of document editing, we can go further and notice that, given a
foundational level of concurrency control in the software – Google Docs uses OT
– editing by multiple humans works fine, and doesn't require much explicit
coordination at all. Research groups have
[found](https://www.inkandswitch.com/local-first.html#findings) that this
applies just as well to CRDTs.

---

So here's a manifesto, for keeping data *live* and *sharable*.
1. Data close to a mind has higher precedence than a distant copy in storage.
1. Transmit deltas when you can, and use a published standard syntax for both
   deltas and state.
1. Provide a baseline mathematical convergence guarantee, and let the app and
   the user coordinate to resolve conflicts if they need to.

This is the approach we've taken with **m-ld**. For now, we're proving out the
tech, and filling out the corners that we think are essential for collaboration
and autonomy use-cases. But we think we're onto something important to data
architectures in general. We'd love to hear what [you](/hello/) think.