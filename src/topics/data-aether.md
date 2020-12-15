---
tags:
  - topic # mandatory
  - news # 1th tag is page
title: The Data Æther
patterns:
  - 'data * ether'
  - 'data * aether'
summary: Data isn't really like matter. It's like space.
author:
  git: gsvarovsky
  name: George
date: 2020-12-14
linkedin: gsvarovsky_the-data-%C3%A6ther-activity-6744312449127723008-kBiP
---
Let's talk about data.

Data is intrinsic to software. It's the inputs and the outputs. It flows in
through interfaces, being checked and piped and deconstructed to fine granules,
which find their way into and through the tiniest of subroutines. Some of it is
discarded and deleted or garbage collected, but some will be transformed and
routed and merged into new wholes, and delivered.

This _flowing_ of data is a pragmatic metaphor, and it pervades the way we write
software. APIs _accept_ requests and _produce_ response bodies. Functions _take_
parameters, and emit _return_ values or exceptions. Reactive streams
_materialise_ flows as first-class meta-programming citizens. Data is material
and malleable.

I'm going to try and look at data a different way:

> Data isn't really like matter. It's like space.

But what's the problem with data flowing around like matter?

## Worthless Wrangling
The trouble is that we think about data flows too much, and not enough. _Too
much_, because we're constantly having to **wrangle** data, without even
changing its content, without adding any real value. _Not enough_, because we
also seem to get it wrong, all the time.

![wrangling](/media/wrangling.jpg)

Let me put on the table three categories of worthless wrangling.

### WW One: syntax
Transforming rows into DTOs into objects into JSON into models. Syntax shouldn't
be hard, but it's worth saying that we still spend an awful lot of time and
effort wrangling it.

### WW Two: semantics
The data is statistics about hospitals, or an autonomous car's world model, or a
travel booking. But what I have in my code is a bunch of structs and lists and
maps, cleverly-named, maybe, but differently arranged and named depending on
which part of the application I happen to be in, and usually with different
rules.

### WW Three: truth
Number three is the most insidious of all. No matter how clever we get,
**physics always wins**. We can't deliver data faster than the speed of light.
The data we have in our code is **out of date**. It might no longer be true.
Have we controlled for that? Sometimes. We've added transactions or locking or
other clever tricks. Other times, we only do it when we're fixing the really
evil bug that happened because _we didn't control for it well enough in the
first place_.

Put all these three categories together, and we all spend way too much time on
this stuff, while trying to mix in the valuable stuff, like making sure that the
data is correct and available to the right people, and finally, eventually, like
the interesting operations that make our application do something **useful**
with it.

So how are we going to address the wrangling problem?

> Imagine a world where data wrangling doesn't have to happen.

![no wrangling](/media/no-wrangling.jpg)

## Abstraction X
Let's say that when we look at some data in code, with the intention of doing
something useful with it, whether it's in a browser, or a script, or a tiny
subroutine, it _always looks the same_.

To start with, its **syntax** is always the same. In fact, we don't even see the
syntax. It's just data, natively in my programming language.

The **semantics** are always visible. It's hospital data or a world model,
cleverly named, with meaningful structure and rules.

And, because of physics, we know what we're in for. We know how close to the
**truth** this data is. When I change it or make some more, I know whether my
new data just as true, or if I need to wait for some validation or consensus.
And consumers know what I based my decisions on.

Let's say we can capture all of this in an abstraction, _X_. Abstractions are
always the answer! When writing code, I use X, so I don't have to do any syntax
wrangling, semantics wrangling, or truth wrangling. That's handled by someone
else, who is very clever, and makes X available to me.

Great! We're done.

---

### We're Not Done
There are some niggles that make us wonder how X can exist in the real world.

One is that "native" data structures aren't consistent. I might love Haskell or
C# or Python or Prolog (I might!). While I can probably express most of X in my
language, my mileage is going to vary. A class in Java is not the same as a
class in Javascript. (Can I add a property?) Even basic lists and maps and sets
are not the same. (Equality? What about `null` and `undefined` and `none` and
`empty`?)

> Languages do not express data structures in the same, or even compatible ways.

When it comes to data semantics, at least most programming languages have one
thing strongly in common: _they suck at it_. All the big, popular languages are
imperative. That means they are great at saying 'do this, do that', but they
have real trouble saying 'this makes sense'. If I look at a class in Java, it's
really hard to see all the things that are always true, and the things that need
to be true before some change is allowed, and the things that are true after
those changes. If I'm lucky, someone has added some comments, or assertions, or
written some test cases. (Or
[interface&nbsp;specifications](https://en.wikipedia.org/wiki/Design_by_contract),
if I'm really lucky.)

But these things are in the code, and that means they're re-coded everywhere the
data appears. Or not, in which case the bug takes a little while to manifest,
when the data gets to somewhere that notices. If it ever does. _How do I know
that a pre-condition was checked when all I get is the post state?_

> Custom semantics can be hard to express: invariants, allowed operations,
> inferences. And they must be re-expressed wherever the data appears, or risk
> later failures.

We want this stuff underneath abstraction X, so my code is guaranteed not to
break the rules of the data; preferably at compile time; but any time is better
than never.

When it comes to truth, things are even more complicated. Languages come with
baggage. Mutability. Threading. "Volatile"
[is&nbsp;a&nbsp;thing](https://blog.regehr.org/archives/28).

This is not going well. Looks like we have a choice. On the one hand we could
reinvent programming. Stop using our favourite languages, and move everyone to a
language that has abstraction X built-in. That's another article, I think.

So let's look at the other hand, where we back off from this idea of everything
working completely natively. After all, everyone already has to deal with
mapping one abstraction onto another, all the time. Let's just assert what we
want about X, and let clever programmers bind X to their language with
libraries.

![binding X](/media/binding-x.jpg)

### Requirements for Binding X to Code
Once X is bound to a language with a library, we'll have a syntax for that
language. I'd say it's table stakes that anything that _can_ be expressed
natively, _is_; but really that's up to the binding library author, as the
expert on that language.

There's one quality that stands out, because it's not well-supported by
languages in general, and that's having a **universal address space**. If we're
truly going to abstract away the vagaries of media and protocols, then we need a
way to refer to some data, not as a file on a filesystem, or a row in a
database, or a memory location.

Beyond that, we need to be able to express and enforce the **data structure and
rules** in X, so the code we write doesn't break the data. Again, nice if we
could do this at compile-time, but also important at runtime. Why? Because most
applications have at least some variability in their data on a per-install,
per-customer, or even per-session basis. As app developers we often try to tuck
this into carefully managed corners, as 'customisation' features. I have spent a
lot of time in that corner.

> Data variability at runtime should be a first-class concept.

**Truth** is the axis for which we don't have prior art, I think. I haven't come
across any language that addresses it consistently, and head-on. We haven't
really got a canonical way to say this data is _this far away_, and _this much
out of date_, and these will be the _consequences of you editing it_. There are
some ideas - for example, you should check out the proposed
[Braid&nbsp;HTTP&nbsp;extension](https://braid.news/).

And naturally, for all of this, if things are going to change - and we know they
will - we need a well-defined way to cope with that.

### The Consequences of X
So let's say we've done it, we have X and it's available to our choice of
programming language. What would we expect to be different?

The most important thing is that app developers will spend less time wrangling
data through protocols and formats and layers. A programmer only needs to learn
the correspondence between their platform and X.

But engineers who _like_ doing those things can still get their kicks by
developing more and better ways for X to get from A to B, knowing that their
efforts will be recognised because the data itself advertises the result.

> Physical protocols will only be relevant to those choosing or optimising them.

And let's notice one more thing. With X, data is not _flowing_ any more. I don't
have to think in terms of requesting and receiving and decoding and validating
and locking and (briefly) adding value, and then encoding and responding and
emitting and unlocking, and am-I-done-yet?

Instead, data is just _there_, bathing my code, and just a de-reference of an
identifier away. Sometimes it'll take a few milliseconds to arrive, but I
already know how long and I can build those expectations into my software
design. And tomorrow, when the someone clever has noticed I keep asking for
such-and-such data, and makes it available to me before I ask, I can
progressively enhance that design.

![data aether](/media/data-aether.jpg)

What do you think? Can we get away from endless expensive but worthless
wrangling of **syntax**, **semantics** and **truth**?

And what would we build if we could?

<p align="center"><sub>Wonderful photos by <a href="https://unsplash.com/@robbie36?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Robert Collins on Unsplash</a></sub></p>