---
tags:
  - topic # mandatory
  - news # 1th tag is page
title: Javascript Engine v0.8
patterns:
  - 'Javascript'
summary: Latest release with usability, performance & extensibility
author:
  git: gsvarovsky
  name: George
date: 2022-01-17
linkedin: TODO
---
The next version of the **m-ld** [Javascript&nbsp;Engine](https://js.m-ld.org/) has been published (on [npm](https://www.npmjs.com/package/@m-ld/m-ld))! We've been working hard on usability and performance, and we've also included the latest [prototype work](https://github.com/m-ld/m-ld-js/pull/85) from the [Security Project](https://github.com/m-ld/m-ld-security-spec) (we believe in continuous integration).

We're moving fast towards [our vision](https://bit.ly/data-aether) of _data-wrangling-free_ information sharing. The security work is key, not only because it boosts, um, security 😜, but also because it signposts the way to _decentralised extensibility_. 

What's that now? We want anyone to be able to create new information sharing behaviours and rules, which are specific to their apps but also work well together – security rules are just one example. To us, these behaviours _are also shared information_. So when you use them in a domain, they will appear in the domain data itself (this is often called 'metadata' – data about data). One superpower this gives is to be able to dynamically adapt the presentation of information as its rules evolve. But more than that, it also gives users more freedom to _change which app they use_, while keeping their data intact.

We'll be writing a lot more on this topic soon. In the meantime, please do [get in touch](/hello/) with your ideas and use-cases!

Here's a run-down of the headlines in the new release.

- Query usability improvements: more intuitive [delete-where](https://github.com/m-ld/m-ld-spec/issues/76) & [vocabulary&nbsp;references](https://github.com/m-ld/m-ld-spec/issues/77).
- API utility wrappers, including [property casting](https://js.m-ld.org/globals.html#propertyvalue) and an extended `get` method able to select [individual properties](https://js.m-ld.org/interfaces/meldclone.html#get).
- Engine performance improvements, including faster `@describe` queries on larger datasets.
- API support for [back-pressuring read results](https://js.m-ld.org/interfaces/readresult.html). This better supports asynchronous results consumers, such as agents that update remote data sinks like databases.
- API support for native RDFJS Dataset [Source](https://rdf.js.org/stream-spec/#source-interface) and queries using [SPARQL&nbsp;algebra](https://github.com/joachimvh/SPARQLAlgebra.js#algebra-object),  for projects which use RDF natively.
- Experimental support for whole-domain read/write [access&nbsp;control](https://github.com/m-ld/m-ld-js/pull/85), with users registered in the domain data.