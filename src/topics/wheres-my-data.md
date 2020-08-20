---
tags:
  - topic # mandatory
  - faq # 1th tag is page
title: Where is my data?
patterns:
  - where * (data|state)
summary: <b>m-ld</b> data is physically in clones.
---
The data is physically stored locally to an app in a *clone*, which is typically
embedded in the app via a library called an *engine*, or very close by in a
local process. Different clone engines may:
- Keep the data in memory only
- Persist the data directly to disk
- Use some platform-specific local storage

Logically, data belongs to a *domain*, which is a collection of clones that
belong to it. An app could use one or more domains for different purposes.