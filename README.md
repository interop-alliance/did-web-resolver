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
with the [`did-io`](https://github.com/digitalcredentials/did-io) resolver library. 

Draft spec (W3C CCG Work Item):

[`did:web` Decentralized Identifier Method Specification](https://w3c-ccg.github.io/did-method-web/)

Other implementations:

* https://github.com/decentralized-identity/web-did-resolver

## Usage

### Initializing

```js
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { X25519KeyAgreementKey2020 }
  from '@digitalcredentials/x25519-key-agreement-key-2020'
import { CryptoLD } from 'crypto-ld'

import * as didWeb from '@interop/did-web-resolver'

const cryptoLd = new CryptoLD()
cryptoLd.use(Ed25519VerificationKey)
cryptoLd.use(X25519KeyAgreementKey2020)

const didWebDriver = didWeb.driver({ cryptoLd })

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
    'https://w3id.org/security/suites/ed25519-2020/v1',
    'https://w3id.org/security/suites/x25519-2020/v1'
  ],
  id: 'did:web:example.com',
  assertionMethod: [{
    id: 'did:web:example.com#z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB',
    type: 'Multikey',
    controller: 'did:web:example.com',
    publicKeyMultibase: 'z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB'
  }]
}
```

#### Generating new random keys

Invoking `generate()` by itself will create new keypairs for each proof purpose.

```js
const { didDocument, keyPairs, methodFor } = await didWebDriver.generate()
// didDocument
{
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/suites/ed25519-2020/v1',
    'https://w3id.org/security/suites/x25519-2020/v1'
  ],
  id: 'did:web:example.com',
  capabilityInvocation: [{
    id: 'did:web:example.com#z6MkqUiWi2o5V5oDEVzqszpkDhzeJ2o9Z4zVyTWeASqgrgti',
    type: 'Multikey',
    controller: 'did:web:example.com',
    publicKeyMultibase: 'zC2TU7nYe9YJk81A9CRruNcSeUTXJ9Bk9HSbiLAsfwU7L'
  }],
  authentication: [{
    id: 'did:web:example.com#z6MksjNYAxjiTrhPFx9Ljk3SVowEtFXhFqLdsMKJHV4KrcDT',
    type: 'Multikey',
    controller: 'did:web:example.com',
    publicKeyMultibase: 'zEH7VaiVH8KCv9TJe4B5beiPF4gFqqx6HBLQNTD6JwPS5'
  }],
  assertionMethod: [{
    id: 'did:web:example.com#z6MkiyYa5mG4moiHrmXQea8bNvdEWRWi3KuouHqoiknGf7xV',
    type: 'Multikey',
    controller: 'did:web:example.com',
    publicKeyMultibase: 'z5XHXVX1dSGDpkGghy1AkXq5EgrErdSfTDGvstUpFjuB7'
  }],
  capabilityDelegation: [{
    id: 'did:web:example.com#z6MknmeMZEXLhS6g2p6YPHkQG4PkNsJev652CqnsArPm3dZa',
    type: 'Multikey',
    controller: 'did:web:example.com',
    publicKeyMultibase: 'z9KPJxzGuMtcCvKFqhinZQxqkZJ2oWCpfWpswLaRk8QnC'
  }],
  keyAgreement: [{
    id: 'did:web:example.com#z6LSg3dWQzpQgRpaVzNXkcosnheyhXJUQkNQQgXyDapFSCFZ',
    type: 'X25519KeyAgreementKey2020',
    controller: 'did:web:example.com',
    publicKeyMultibase: 'z5NTLth1Yay6qQbzmDyHvU7SVrNmMi9CFXhpHj8AiipUo'
  }]
}
```

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

## Contribute

* Coding Style: [Prettier](https://prettier.io/) + [ESLint](https://eslint.org/)
* Docs: JSDoc
* Readme: [standard-readme](https://github.com/RichardLitt/standard-readme)

PRs accepted.

## License

[The MIT License](LICENSE.md) ©2020-2021 Interop Alliance and Dmitri Zagidulin
