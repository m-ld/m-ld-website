---
tags:
  - topic # mandatory
  - doc # 1th tag is page
  - principle
title: Structured Data
patterns:
  - structured
  - structured data
summary: '<b>m-ld</b> data is structured in principle'
date: 2020-04-01 # Used for sort order
---
In principle, a **m-ld** domain contains *structured* data comprised of *linked*
'subjects' having properties of interest.

This model is fundamentally a *graph* of data, and is represented in the app
programming interface (API) as [JSON](http://json.org/).

**m-ld** is schema-less in the sense that schema is not a first-class citizen
(as it is in a relational model, for example). However, any schema or ontology
can be embedded in the data, and enforced by the app.

These principles are realised by the internal adoption of the W3C standard, the
Resource Description Framework ([RDF](https://www.w3.org/RDF/)). Through the
application of sane defaults and the consistent JSON syntax, an app does not
typically need to be aware of the RDF; but it also helps with interoperability,
and ensures that future developments (for example, to supported data types) do
not break compatibility.

These choices achieve an optimum of flexibility and familiarity for a broad
selection of [use-cases](/doc/#use-cases), while supporting the required
convergence guarantees.