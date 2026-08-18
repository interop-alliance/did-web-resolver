# `did:web` Resolver _(@interop/did-web-resolver)_

[![CI](https://github.com/interop-alliance/did-web-resolver/workflows/CI/badge.svg)](https://github.com/interop-alliance/did-web-resolver/actions?query=workflow%3A%22CI%22)
[![NPM Version](https://img.shields.io/npm/v/@interop/did-web-resolver.svg)](https://npm.im/@interop/did-web-resolver)

> A did:web method Decentralized Identifier (DID) resolver for the did-io library.

## Table of Contents

- [Security](#security)
- [Background](#background)
- [Usage](#usage)
- [Install](#install)
- [Contribute](#contribute)
- [License](#license)

## Security

TBD

## Background

A `did:web` method driver for use with in-browser and server-side on Node.js
with the [`did-io`](https://github.com/interop-alliance/did-io) resolver library.

Draft spec (W3C CCG Work Item):

[`did:web` Decentralized Identifier Method Specification](https://w3c-ccg.github.io/did-method-web/)

Other implementations:

* https://github.com/digitalbazaar/did-method-web
* https://github.com/decentralized-identity/web-did-resolver

## Usage

### Initializing

```js
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'

import * as didWeb from '@interop/did-web-resolver'

const didWebDriver = didWeb.driver()

// Register each key suite the driver may generate or resolve
didWebDriver.use({ keyPairClass: Ed25519VerificationKey })

// Optionally use it with the CachedResolver from did-io
import { CachedResolver } from '@interop/did-io'
const resolver = new CachedResolver()
resolver.use(didWebDriver)
```

> **Note:** Ed25519 verification methods are now serialized in
> [Multikey](https://www.w3.org/TR/cid-1.0/#Multikey) format (`type: 'Multikey'`),
> via `@interop/ed25519-verification-key`.

### Generating a new DID

#### Generating from seed

If you have a deterministic secret seed (created with [`did-cli`](https://github.com/digitalcredentials/did-cli),
for example) and would like to generate a `did:web` document from it:

```js
const url = 'https://example.com'
const seed = 'z1AhV1bADy7RepJ64mvH7Kk7htFNGc7EA1WA5nGzLSTWc6o'

const { didDocument, keyPairs, methodFor } = await didWebDriver.generate({ url, seed })
// didDocument
{
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/multikey/v1'
  ],
  id: 'did:web:example.com',
  verificationMethod: [{
    type: 'Multikey',
    publicKeyMultibase: 'z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB',
    id: 'did:web:example.com#z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB',
    controller: 'did:web:example.com'
  }],
  authentication: [
    'did:web:example.com#z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB'
  ],
  assertionMethod: [
    'did:web:example.com#z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB'
  ],
  capabilityDelegation: [
    'did:web:example.com#z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB'
  ],
  capabilityInvocation: [
    'did:web:example.com#z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB'
  ]
}
```

#### Generating new random keys

Invoking `generate()` by itself creates a single new verification keypair,
referenced by all four default proof purposes (`authentication`,
`assertionMethod`, `capabilityDelegation`, and `capabilityInvocation`). To also
add a key agreement key, pass a `keyAgreementKeyPair`.

```js
const { didDocument, keyPairs, methodFor } = await didWebDriver.generate({
  url: 'https://example.com'
})
// didDocument
{
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/multikey/v1'
  ],
  id: 'did:web:example.com',
  verificationMethod: [{
    type: 'Multikey',
    publicKeyMultibase: 'z6MkwUAcrS5LWoeoR6U3hsb15m52degevNfUSVFfZ5wa5kQ2',
    id: 'did:web:example.com#z6MkwUAcrS5LWoeoR6U3hsb15m52degevNfUSVFfZ5wa5kQ2',
    controller: 'did:web:example.com'
  }],
  authentication: [
    'did:web:example.com#z6MkwUAcrS5LWoeoR6U3hsb15m52degevNfUSVFfZ5wa5kQ2'
  ],
  assertionMethod: [
    'did:web:example.com#z6MkwUAcrS5LWoeoR6U3hsb15m52degevNfUSVFfZ5wa5kQ2'
  ],
  capabilityDelegation: [
    'did:web:example.com#z6MkwUAcrS5LWoeoR6U3hsb15m52degevNfUSVFfZ5wa5kQ2'
  ],
  capabilityInvocation: [
    'did:web:example.com#z6MkwUAcrS5LWoeoR6U3hsb15m52degevNfUSVFfZ5wa5kQ2'
  ]
}
```

### Adding a verification method

`addVerificationMethod()` is the low-level document-building primitive. It takes
an existing DID document (a freshly created one, or one fetched and republished
with rotated keys), wires a key into one or more verification relationships
(proof purposes), and accumulates the key's `@context`. It mutates the document
in place and returns it. `generate()` is built on top of this method.

The `keyPair` may be a live key suite instance or a plain public key description
(for example, from a KMS); plain descriptions are rebuilt into live instances
via the registered suites. Pass an optional `keyPairs` map to have the new key
accumulated into it (keyed by the key id).

By default the full public key object is embedded under each relationship. Pass
`embed: false` to instead list it once under `verificationMethod` and reference
it by id:

```js
const didDocument = {
  '@context': ['https://www.w3.org/ns/did/v1'],
  id: 'did:web:example.com'
}
const keyPairs = new Map()
const keyPair = await Ed25519VerificationKey.generate()

await didWebDriver.addVerificationMethod({
  didDocument,
  keyPairs,
  keyPair,
  purposes: ['assertionMethod'],
  embed: false
})
// didDocument
{
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/multikey/v1'
  ],
  id: 'did:web:example.com',
  verificationMethod: [{
    type: 'Multikey',
    publicKeyMultibase: 'z6Mkm8aEj4RQcmxpm7J7Li7sWBw4Ktkbt131LsGgJY4wYxMv',
    id: 'did:web:example.com#z6Mkm8aEj4RQcmxpm7J7Li7sWBw4Ktkbt131LsGgJY4wYxMv',
    controller: 'did:web:example.com'
  }],
  assertionMethod: [
    'did:web:example.com#z6Mkm8aEj4RQcmxpm7J7Li7sWBw4Ktkbt131LsGgJY4wYxMv'
  ]
}
```

When `purposes` is omitted, the key is wired into the four defaults
(`authentication`, `assertionMethod`, `capabilityDelegation`, and
`capabilityInvocation`).

### Resolving a DID

`get()` fetches and returns the DID document for a `did:web` DID over HTTPS. The
host is checked against the driver's SSRF allow list before any network request
is made, and the fetched document's `id` must match the requested DID.

```js
const didDocument = await didWebDriver.get({ did: 'did:web:example.com' })
```

#### Managing the SSRF allow list

The allow list is the driver's guard against
[server-side request forgery](https://owasp.org/www-community/attacks/Server_Side_Request_Forgery):
it constrains which hosts `get()` (and `generate()`) will contact. Configure it
once when constructing the driver, as an array of permitted hosts:

```js
const didWebDriver = didWeb.driver({
  allowList: ['example.com', 'example.com:3000']
})
```

Matching rules:

- Each entry is matched exactly against the URL's `host` (the hostname plus a
  port if present). `'example.com'` permits `https://example.com` but not
  `https://example.com:3000` or `https://sub.example.com` -- there is no
  wildcard or subdomain matching; list each host (and port) explicitly.
- An **empty or absent** allow list disables the check entirely, permitting all
  hosts. This is the default (`driver()` with no `allowList`), so for any
  untrusted input you should supply an explicit list.
- A disallowed host throws `Domain "<host>" is not allowed.` before any request
  is sent.

The list is held on the public `didWebDriver.allowList` property and may be read
or replaced after construction.

If the DID carries a `#fragment`, `get()` dereferences that individual subnode
(a verification method or service) instead of returning the whole document:

```js
const key = await didWebDriver.get({
  did: 'did:web:example.com#z6MkwUAcrS5LWoeoR6U3hsb15m52degevNfUSVFfZ5wa5kQ2'
})
// key
{
  type: 'Multikey',
  publicKeyMultibase: 'z6MkwUAcrS5LWoeoR6U3hsb15m52degevNfUSVFfZ5wa5kQ2',
  id: 'did:web:example.com#z6MkwUAcrS5LWoeoR6U3hsb15m52degevNfUSVFfZ5wa5kQ2',
  controller: 'did:web:example.com'
}
```

To pick a public key out of an already-fetched document by purpose, use
`publicMethodFor({ didDocument, purpose })`.

## Install

- Node.js 24+ is recommended.

To install via PNPM:

```bash
pnpm install @interop/did-web-resolver
```

To install locally (for development):

```bash
git clone https://github.com/interop-alliance/did-web-resolver.git
cd did-web-resolver
pnpm install
```

### React Native

This library uses the global WHATWG `URL` API, which is available natively in
Node.js and browsers. React Native's built-in `URL` is not spec-compliant (in
particular it does not support property setters such as `url.pathname = ...`,
which this library relies on). React Native consumers must install
[`react-native-url-polyfill`](https://www.npmjs.com/package/react-native-url-polyfill)
and import it before using this library:

```js
import 'react-native-url-polyfill/auto'
```

## Contribute

* Coding Style: [Prettier](https://prettier.io/) + [ESLint](https://eslint.org/)
* Docs: JSDoc
* Readme: [standard-readme](https://github.com/RichardLitt/standard-readme)

PRs accepted.

See [CONTRIBUTING.md](CONTRIBUTING.md) -- code style and contribution
conventions.

## License

[The MIT License](LICENSE.md) ©2020-2021 Interop Alliance and Dmitri Zagidulin
