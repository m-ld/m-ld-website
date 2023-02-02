---
tags:
  - topic # mandatory
  - faq # 1th tag is page
title: Is m-ld a database?
patterns:
  - 'database * @hasQuestionMark'
summary: <b>m-ld</b> is very different to a traditional back-end database.
---
**m-ld** is a data store, but it has a very different approach to a back-end
database. A database stores all of the data centrally, on a server, and provides
an API over the network for an app to access and update the data.

**m-ld** turns this model completely on its head. The data is stored locally, in
the app, and is synchronised automatically with other instances of the app. If
there is a central server, then it might also have a copy.

Notice that even in the app using a database, there is still a local copy of the
data in the user interface, or some other in-memory 'model'. So the main
practical difference is how much effort the app itself needs to put into keeping
its own copy 'up-to-date'. In **m-ld** this is automatic.