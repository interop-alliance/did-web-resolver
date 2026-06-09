# did-web-driver ChangeLog

## 6.2.0 - 2026-06-08

### Added
- `addVerificationMethod()` accepts an `embed` option (default `true`). When
  `true`, the full public key description object is embedded directly under each
  requested verification relationship (e.g. `authentication`, `assertionMethod`),
  a fresh copy per relationship; when `false`, the public node is listed once in
  `verificationMethod` and referenced by id. The library's own document builders
  (`generate()`, `publicKeyToDidDoc()`) pass `embed: false`, so their output is
  unchanged. Key lookup (`methodFor`, `publicMethodFor`, `getNode`) works with
  either form.

### Changed
- Guard the `structuredClone` call in `getNode` with a JSON round-trip
  fallback, so the resolver works on runtimes that lack
  `structuredClone` (e.g. React Native's Hermes engine). Native `structuredClone`
  is still used when available.
- Update `@interop/data-integrity-core` to `^6.4.0` (and `@interop/did-io` to
  `^4.0.2`, `@interop/ed25519-verification-key` to `^7.0.2`). Align with the
  renamed `IDIDDocument` type and the widened `ILDContext`
  (`string | Array<string | Record<string, unknown>>`); the internal `_addContext`
  helper now accepts `ILDContext`. No public API behavior change.
- Replace the `@digitalcredentials/bnid` dependency with `@interop/bnid`
  (`^6.0.1`).

## 6.1.1 - 2026-06-06

### Added
- Add default export to `package.json`.

## 6.1.0 - 2026-06-01

### Changed
- Replace local `any` types in the `DidWebResolver` API with the shared types
  exported by `@interop/data-integrity-core` (`AbstractKeyPair`, `IDidDocument`,
  `IKeyPair`, `IPublicKey`), aligning the driver's parameter and return types
  with `@interop/did-method-key`.
- The key-suite registry (`_allowedKeyTypes`) is now typed as
  `Map<string, RegisteredKeyType>`, and `use()` accepts a typed `KeyPairClass`
  / `FromMultibase`.
- `DidWebResolver` now formally `implements DidMethodDriver` from
  `@interop/did-io` (requires `@interop/did-io` >= 4.0.1). `fromKeyPair()`,
  `generate()`, and `publicKeyToDidDoc()` now accept plain key descriptions
  (`AbstractKeyPair | IKeyPair`) in addition to live key pair instances.
- `addVerificationMethod()` is now `async` and rebuilds plain key descriptions
  into live instances via the registered suites; it is the single point where
  caller-supplied keys are normalized, so `fromKeyPair()` and
  `publicKeyToDidDoc()` no longer convert keys themselves.
- Export the `FromMultibase` and `KeyPairClass` types from the package entry
  point, so consumers can type their `use()` registrations.

## 6.0.0 - 2026-05-27

### Changed
- **BREAKING**: Switch to `@interop/http-client` (TypeScript) from the DCC fork.
- **BREAKING**: Switch to `@interop/did-io` (TypeScript) from the DCC fork.
- **BREAKING**: Update to `@digitalcredentials/bnid` v5 (TypeScript).
- **BREAKING**: Generated Ed25519 verification methods now serialize in Multikey
  format (`type: 'Multikey'`), via `@interop/ed25519-verification-key`. You will
  have to re-generate `did:web` DID documents that relied on the previous
  `Ed25519VerificationKey2020` serialization.
- **BREAKING**: Require Node.js 24+.
- Added various security checks from `@digitalbazaar/did-method-web`

### Toolchain
- Migrate to the `@interop/isomorphic-lib-template` infrastructure: `pnpm`,
  ESM-only build via `tsc`, Vitest (Node) + Playwright (browser) tests, and
  flat-config ESLint + Prettier.

## 5.0.0 - 2024-08-04

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
