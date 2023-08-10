# m-ld-website
m-ld.org

## build
The site is deployed using [Vercel Now](https://vercel.com/docs).

Environment variables for reCAPTCHA, WebRTC, logging, pub-sub, dictionary, npm
and GTag are found in the
[Project&nbsp;Settings](https://vercel.com/m-ld/m-ld-website/settings/environment-variables).

Note that this is a single-user Vercel account, for which the requisite credentials are required to see those environment variables.

## edge
The `master` branch deploys to the live website, https://m-ld.org. This should
only change by pull request. The `edge` branch is for live development and
deploys to https://edge.m-ld.org.

The domains are set in the [reCAPTCHA admin
console](https://www.google.com/u/1/recaptcha/admin/site/350626045).

## dev
To update content:
1. Clone this repo locally.
1. Switch to the `edge` branch by entering `git switch edge`.
1. Create a new local branch for the changes by entering `git switch -c <my-new-branch>`.

To run locally:
1. Install [now](https://vercel.com/download) and set auth credentials.
1. `now env pull` to create a local file ".env" in the root.
1. Adjust the log level if required, e.g. `LOG=TRACE`.
1. `npm run local`

Alternatively, to run locally without the demo or playground:
1. Enter `npm install` to update dependencies.
1. Run `npx @11ty/eleventy --serve` to create a new build and serve it on `http://localhost:8080`

After any changes to dependencies (for say, the demo, or the playground), use
[source-map-explorer](https://github.com/danvk/source-map-explorer) to check
that the bundle is not adversely affected, e.g. (if installed globally):

`source-map-explorer _site/demo/demo.js --no-border-checks`

Once local changes are complete and satisfactory:
1. Push commits to the GitHub repo.
1. Create a PR in GitHub for review before `edge` is merged with `master`.

## logging
Logging is activated for local demo boards in the `.env` file in the project
root (also used for secrets, see above).

Any demo board in the world can have logging activated (or any other config changes)
by adding a JSON configuration file to the config folder on the public
m-ld/message-board-demo repo. This file is used as the basis for a board's
`MeldAblyConfig`.

Logs are shipped to the _m-ld.io Ltd_ account at Logz.io.

## browser compatibility
Browser compatibility is checked with Modernizr, using a generated build
[modernizr-custom.js](src/modernizr-custom.js). See the file header comment
for the checked features.

## assets
This repository is the source of truth for the m-ld and m-ld.io logos.

<img src="src/m-ld.svg" alt="m-ld" width="200"/>
<img src="src/m-ld.io.svg" alt="m-ld.io" width="200"/>

There is also a small png version, which is generated using
[myScale](https://webkul.github.io/myscale/).

<img src="src/m-ld.io.small.png" alt="m-ld.io small"/>

## links
* https://vercel.com/docs
* https://www.google.com/u/1/recaptcha/admin/site/350626045
* https://www.11ty.io/docs/
* https://bulma.io/documentation/
* https://fontawesome.com/icons
* https://github.com/d3/d3/blob/master/API.md
* https://webkul.github.io/myscale/
* https://modernizr.com/
* https://ably.com/
* https://www.metered.ca/