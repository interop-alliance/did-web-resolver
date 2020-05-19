# `did:web` Resolver Driver _(did-web-driver)_

[![Build Status](https://travis-ci.org/interop-alliance/did-web-driver.svg?branch=master&style=flat-square)](https://travis-ci.org/interop-alliance/did-web-driver)
[![NPM Version](https://img.shields.io/npm/v/did-web-driver.svg?style=flat-square)](https://npm.im/did-web-driver)

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
with the [`did-io`](https://github.com/digitalbazaar/did-io) resolver library. 

Draft spec (W3C CCG Work Item):

[`did:web` Decentralized Identifier Method Specification](https://w3c-ccg.github.io/did-method-web/)

Other implementations:

* https://github.com/decentralized-identity/web-did-resolver

## Usage

```js
import { CryptoLD } from 'crypto-ld'
import Ed25519KeyPair from 'ed25519-key-pair'

const cryptoLd = new CryptoLD()
cryptoLd.use(Ed25519KeyPair)

import { DidWebResolver } from '@interop/did-web-resolver'
const keyMap = { // default
  capabilityInvocation: 'ed25519',
  authentication: 'ed25519',
  assertionMethod: 'ed25519',
  capabilityDelegation: 'ed25519',
  // keyAgreement: 'x25519'  // <- not yet supported
}

const didWeb = new DidWebResolver({ cryptoLd, keyMap })

// Optionally use it with `did-io`
import { DidResolver } from 'did-io'
const didIo = new DidResolver()

didIo.use(didWeb)
```

## Install

```bash
git clone https://github.com/interop-alliance/did-web-driver.git
cd did-web-driver
npm install
```

## Contribute

* Coding Style: [Standard.js](https://standardjs.com/)
* Docs: JSDoc
* Readme: [standard-readme](https://github.com/RichardLitt/standard-readme)

PRs accepted.

## License

[The MIT License](LICENSE.md) © Interop Alliance and Dmitri Zagidulin
