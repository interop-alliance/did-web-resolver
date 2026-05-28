/**
 * Shared constants for the did:web resolver: the DID Core context URL, default
 * network fetch limits, a suite-to-context lookup used when dereferencing
 * subnodes, and the default verification relationships for generated keys.
 */
import * as didContext from 'did-context'

export const DID_CONTEXT_URL: string = didContext.constants.DID_CONTEXT_URL

export const didPrefix = 'did:web:'
export const didFile = 'did.json'
export const fileSuffix = `.well-known/${didFile}`

/**
 * Default network limits for fetching a DID document. `size` is the maximum
 * response body in bytes; `timeout` is the request timeout in milliseconds.
 */
export const defaultFetchOptions = {
  size: 8192,
  timeout: 5000
}

const ED25519_KEY_2018_CONTEXT_URL =
  'https://w3id.org/security/suites/ed25519-2018/v1'
const ED25519_KEY_2020_CONTEXT_URL =
  'https://w3id.org/security/suites/ed25519-2020/v1'
const X25519_KEY_2019_CONTEXT_URL =
  'https://w3id.org/security/suites/x25519-2019/v1'
const X25519_KEY_2020_CONTEXT_URL =
  'https://w3id.org/security/suites/x25519-2020/v1'
const MULTIKEY_CONTEXT_V1_URL = 'https://w3id.org/security/multikey/v1'

/**
 * Maps a verification method `type` to the JSON-LD `@context` that defines it.
 * Used by `getNode` to attach the correct context to a dereferenced subnode.
 */
export const contextsBySuite = new Map<string, string>([
  ['Ed25519VerificationKey2020', ED25519_KEY_2020_CONTEXT_URL],
  ['Ed25519VerificationKey2018', ED25519_KEY_2018_CONTEXT_URL],
  ['Multikey', MULTIKEY_CONTEXT_V1_URL],
  ['X25519KeyAgreementKey2020', X25519_KEY_2020_CONTEXT_URL],
  ['X25519KeyAgreementKey2019', X25519_KEY_2019_CONTEXT_URL]
])

/**
 * The verification relationships a generated verification key is wired into by
 * default (when no explicit `purposes` are given for it).
 */
export const DEFAULT_PURPOSES = [
  'authentication',
  'assertionMethod',
  'capabilityDelegation',
  'capabilityInvocation'
]
