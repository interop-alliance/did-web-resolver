# did-web-driver ChangeLog

## 2.0.0 -

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
