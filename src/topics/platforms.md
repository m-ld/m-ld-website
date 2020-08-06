---
tags:
  - topic # mandatory
  - doc # 1th tag is page
  - implementation
title: Platforms
patterns:
  - platforms
summary: '<b>m-ld</b> engines will be available for a variety of modern compute platforms.'
date: 2020-10-01 # Used for sort order
---
**m-ld** engines are available or planned for the following platforms.
{% for platform in index.platforms %}
- {% if platform.url %}[{{platform.name}}]({{platform.url}}){% else %}{{platform.name}}{% endif %}{% if platform.soon %} (🚧 coming soon){% elsif platform.request %} (please like if required){% endif %}: {{platform.summary}}
{% endfor %}
