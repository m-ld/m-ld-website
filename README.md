# m-ld-website
m-ld.org

## build
The site is deployed using [Zeit Now](https://zeit.co/docs).

The secrets used in [now.json](now.json) must be added using [now secrets](https://zeit.co/docs/now-cli#commands/secrets).

## dev
Currently, this project requires a link to the private m-ld(-js) library, e.g.:
1. `git clone https://github.com/gsvarovsky/m-ld-js.git ../m-ld-js`
1. `npm link ../m-ld-js` (see [npm link docs](https://docs.npmjs.com/cli/link.html))

To run locally:
1. Install [now](https://zeit.co/download)
1. Create a local file ".env" in the root and add any secret env vars found under `env` in [now.json](now.json).
1. `npm run local`

Note that `NPM_TOKEN` in [.env.build](./.env.build) is empty to pass through to your global npm token.

## links
* https://zeit.co/docs
* https://www.11ty.io/docs/
* https://bulma.io/documentation/
* https://fontawesome.com/icons
* https://github.com/d3/d3/blob/master/API.md
* https://webkul.github.io/myscale/