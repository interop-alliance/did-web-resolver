# did-web-driver ChangeLog

## 5.0.0 -

### Changed
- **BREAKING**: Switch to DCC `http-client` fork, v5.0

## 4.0.0 - 2024-01-23
Note: API and usage should remain the same.

### Changed
- **BREAKING**: Convert to Typescript.
- **BREAKING**: Switch back to Digital Bazaar's `http-client` fork.
- **BREAKING**: Use DCC `bnid` v3 (which uses base-x instead of base58-universal).

## 3.0.1 - 2022-12-05

### Changed
- **BREAKING**: FIx `urlFromDid` logic to handle path segments (see PR [pr #19](https://github.com/interop-alliance/did-web-resolver/pull/19)).

## 3.0.0 - 2022-09-22

### Changed
- **BREAKING**: Fix `didFromUrl` implementation (see [issue #20](https://github.com/interop-alliance/did-web-resolver/issues/20)).

## 2.2.1 - 2022-02-04

### Changed
- Fix URL error on React Native (use external `whatwg-url` package).

## 2.2.0 - 2022-01-26

### Added
- Add ability to `.generate()` from a secret key seed.

## 2.1.1 - 2022-01-19

### Changed
- Fix package.json's `exports` section (add `package.json`).

## 2.1.0 - 2022-01-19

### Changed
- Update dependencies to `@digitalbazaar` npm published versions, remove
  github-based dependencies.

## 2.0.0 - 2022-01-01

### Changed
- Use rollup for build-time transpile instead of esm.
- Use "no ESM" branches for all other deps.
- `.get()` now also resolves keys (to match other did-io drivers).
- **BREAKING**: Update ed25519 and X25519 dependencies to latest. You will have
  to re-generate your `did:web` DID documents for this version, as the
  key serialization formats have changed.

## 1.1.0 - 2021-04-25

### Added
- Add `didWebDriver.publicMethodFor()`.

## 1.0.1 - 2021-04-25

### Fixed
- Fix handling of hash fragments by `urlFromDid()`.
- Add logger to constructor.

## 1.0.0 - 2021-04-24

### Changed
- **BREAKING** Update to latest DID Core context
- **BREAKING** Update to use crypto-ld v5 API, latest crypto suites
- Add support for X25519KeyAgreementKey suite

## 0.2.0 - 2020-08-01

### Changed
- **BREAKING**: Update to use crypto-ld v4 API

## 0.0.1

### Added
- Initial implementation.
