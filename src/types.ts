/**
 * Local type aliases for the did:web driver's key-suite plugin registry. These
 * mirror the shapes used by `@interop/did-method-key` and are expressed in
 * terms of the `AbstractKeyPair` contract exported by
 * `@interop/data-integrity-core`, so that registered suites interoperate across
 * the Interop did-io drivers.
 */
import type { AbstractKeyPair } from '@interop/data-integrity-core'

/**
 * A multibase-multikey deserializer: converts a `{publicKeyMultibase}` value
 * into a live key pair instance.
 */
export type FromMultibase = (options: {
  publicKeyMultibase: string
}) => Promise<AbstractKeyPair>

/**
 * A KeyPair suite class usable for `did:web` document generation and key
 * rebuilding via `DidWebResolver.use({ keyPairClass })`. The static
 * `multibaseHeader` (the 4-character multibase-multikey prefix, e.g. `z6Mk` for
 * ed25519) lets the driver register the suite without the caller having to know
 * that prefix.
 */
export interface KeyPairClass {
  multibaseHeader: string
  from: FromMultibase
  generate?: (options?: object) => Promise<AbstractKeyPair>
}

/**
 * An entry in the driver's registry of allowed key types, keyed by
 * multibase-multikey header.
 */
export interface RegisteredKeyType {
  fromMultibase: FromMultibase
  generate?: (options?: object) => Promise<AbstractKeyPair>
}

/**
 * Fetches a DID document by URL and returns the parsed JSON body. Throws on a
 * transport failure or a non-2xx status. `fetchOptions` are the driver's
 * network limits (`size` in bytes, `timeout` in ms) merged with the per-call
 * ones; an injected fetcher is responsible for enforcing them. `agent` is the
 * optional Node.js agent passed to `get()`.
 */
export type FetchDocument = (options: {
  url: string
  fetchOptions: any
  agent?: any
}) => Promise<unknown>

/**
 * Constructor options for `DidWebResolver` and `driver()`.
 */
export interface DidWebResolverOptions {
  allowList?: string[]
  fetchOptions?: any
  fetchDocument?: FetchDocument
  logger?: any
}
