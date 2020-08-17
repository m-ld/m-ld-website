# m-ld-website
m-ld.org

## build
The site is deployed using [Vercel Now](https://vercel.com/docs).

The secrets used in [now.json](now.json) must be added using [now
secrets](https://vercel.com/docs/cli#commands/secrets).

## edge
The `master` branch deploys to the live website, https://m-ld.org. This should
only change by pull request. The `edge` branch is for live development and
deploys to https://edge.m-ld.org.

The domains are set in the [reCAPTCHA admin
console](https://www.google.com/u/1/recaptcha/admin/site/350626045).

## dev
Currently, this project requires a link to the private m-ld(-js) library, e.g.:
1. `git clone https://github.com/m-ld/m-ld-js.git ../m-ld-js`
1. `npm link ../m-ld-js` (see [npm link docs](https://docs.npmjs.com/cli/link.html))

To run locally:
1. Install [now](https://vercel.com/download)
1. Create a local file ".env" in the root and add any vars found under `env` in
   [now.json](now.json) (MQTT_URL=ws://localhost:8888).
1. Add `NODE_ENV=development` to enable source-maps.
1. Add a log level, e.g. `LOG=DEBUG`.
1. `npm run local`

Note that `NPM_TOKEN` in [.env.build](./.env.build) is empty to pass through to
your global npm token.

## logging
Logging can be activated for local demo boards by adding e.g. `LOG=DEBUG` to a
`.env` file in the project root (also used for secrets, see above).

Any board in the world can have logging activated (or any other config changes)
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