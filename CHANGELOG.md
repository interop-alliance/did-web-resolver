# did-web-driver ChangeLog

## 2.2.0 -

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
