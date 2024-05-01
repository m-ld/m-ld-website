---
tags:
  - topic # mandatory
  - news # 1th tag is page
title: Sustaining the Truth across Integrated Applications
patterns:
  - 'Javascript'
summary: converging several physical sources of truth into one logical distributed source
author:
  git: mcalligator
  name: Angus
date: 2024-04-30
linkedin: m-ld-io_news-activity:7191426602377838592--VEC
---

In the vast landscape of modern computing, distributed systems have become the backbone of web-scale applications. They offer unparalleled scalability, fault tolerance, and performance, enabling applications to thrive in dynamic environments. However, with great power comes great complexity. Architects and software engineers have to grapple with a whole new slew of challenges that distributed computing throws up - especially when it comes to connecting disparate applications so they share data.

Historically, applications were integrated for reporting purposes.  ETL (Extract-Transform-Load) jobs would be run periodically to aggregate the data into a warehouse for query and reporting.  This was acceptable at a time when business moved relatively slowly, but is no longer suitable for fast-paced decision-making - especially when that increasingly needs to be automated.

![ETL for Reporting](/media/etl-integration.svg)

More recently, aggregation for reporting has moved towards using streaming data, with transaction feeds from each application involved populating data warehouses or data lakes in near-real time.  This is transforming decision-making by making much more up to date information available.

![Streaming Data for Reporting](/media/streaming-tl.svg)

However, there are still drawbacks to that approach.  It’s hard to update the source applications with this pooled information, so it can’t easily be round-tripped; the information is read-only; and discrepancies between applications on common data need manual intervention to address, which is time-consuming and error-prone.  That means it either doesn’t happen, or imposes unnecessary costs.

This is a common reason why integration of transactional data between applications isn’t implemented, even when they have data in common - e.g. ticket bookings at a music event -  and there would be clear benefits to doing so.  Implementations are restricted to use cases in which one application remains authoritative for the data in question, with updates being shared via message queues.  There’s no provision for changes to the same data in multiple applications, and that’s part of the reason why booking systems lock the provisional record until the entire transaction is confirmed.

Applications that are integrated don’t allow common data to be changed in more than one place at a time, because there are multiple physical sources of truth. Unlike centralised systems in which a single authoritative source dictates the state of the system, distributed systems consist of many nodes, each with its own view of state in the data they hold.  This is even more true of formerly standalone applications that have been integrated.  When they need to share data that each of them can change, this proliferation of sources of truth ratchets up the potential for conflicts and inconsistencies before changes have had a chance to travel to the other nodes, leading to myriad issues.

Let’s take our ticket-booking example for music events.  Imagine a scenario where several users of different applications that manage music events all update elements of the same critical booking record.  That record comprises a complex data structure that’s similar in each application. Since this is a distributed environment, those record updates will propagate asynchronously, almost certainly resulting in divergent states across the different applications. Traditionally, a problem like this might have tried using standards like XA / Two-Phase Commit at the database level for distributed transactions (although this is exceedingly rare in practice).  Database instances remote from the one being updated would be temporarily locked while the transaction was being committed, but when multiple simultaneous transactions happen at the application level, that's extremely difficult to achieve.  Without proper coordination mechanisms in place, conflicts are likely, jeopardising data integrity, system reliability, and ultimately, the trustworthiness of the data in those applications.

The concept of a single logical source of truth emerges as a promising approach to addressing these challenges.  But what do we mean by this?  In essence, it’s a local access point for trustworthy information.  It’s local to each application using it, even when those applications are geographically separate.  Where it's not possible to establish a central authority (like a Distributed Transaction Coordinator) or consensus mechanism (such as Paxos or Raft), distributed systems need a new way to converge on a unified view of complex truth.  The approach that m-ld takes enables conflicts either to be resolved automatically, or to be exposed explicitly to client applications for them to determine the best course of action in that context.

Architecturally, this involves retaining the database that each application (or microservice) uses, with the m-ld layer intercepting writes of shared information to that database and using its "remotes" transport to propagate the changes to other integrated applications sharing that information.  m-ld uses CRDTs, or Conflict-Free Replicated Data Types, able to support arbitrarily complex data structures (thanks to the wonders of RDF), to resolve certain conflicts automatically.  For those it's not possible to do that with, it passes the data to the application to handle.  This can even happen after a period of interrupted network connectivity, if the application adopts m-ld's asynchronous conflict notification.  The integrated set of applications now has a single logical source of truth that is centralised, serving as a beacon of consistency and ensuring coherence across the system.

![Architecture for Logical Single Source of Truth](/media/logical-single-source-of-truth.svg)

We do need to be realistic about the challenges of incorporating m-ld into the context of integrated applications: because it's a very powerful mechanism to enable simultaneous distributed changes, there's also more involved than for say, batch-based ETL.  It does require code changes to get the most out of it, but if the use case demands it, the benefits of making that effort are immense.

Distributed computing presents architects and software engineers with a complex tapestry of challenges, chief among them the management of multiple physical sources of truth.  A single logical source of truth instead simplifies these challenges considerably, and enables them to harness the benefits of distributed changes to common complex information, whilst maintaining its integrity.