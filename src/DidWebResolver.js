import { httpClient } from '@digitalcredentials/http-client'
import * as didIo from '@digitalcredentials/did-io'
import ed25519Context from 'ed25519-signature-2020-context'
import x25519Context from 'x25519-key-agreement-2020-context'
import didContext from 'did-context'
import { decodeSecretKeySeed } from '@digitalcredentials/bnid'
import { URL } from 'whatwg-url'

const { VERIFICATION_RELATIONSHIPS } = didIo

const DEFAULT_KEY_MAP = {
  capabilityInvocation: 'Ed25519VerificationKey2020',
  authentication: 'Ed25519VerificationKey2020',
  assertionMethod: 'Ed25519VerificationKey2020',
  capabilityDelegation: 'Ed25519VerificationKey2020',
  keyAgreement: 'X25519KeyAgreementKey2020'
}

export function didFromUrl ({ url } = {}) {
  if (!url) {
    throw new TypeError('Cannot convert url to did, missing url.')
  }
  if (url.startsWith('http:')) {
    throw new TypeError('did:web does not support non-HTTPS URLs.')
  }

  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch (error) {
    throw new TypeError(`Invalid url: "${url}".`)
  }

  const { host, pathname } = parsedUrl

  let pathComponent = ''
  if (pathname && pathname !== '/' && pathname !== '/.well-known/did.json') {
    pathComponent = pathname.split('/').map(encodeURIComponent).join(':')
  }

  return 'did:web:' + encodeURIComponent(host) + pathComponent
}

export function urlFromDid ({ did } = {}) {
  if (!did) {
    throw new TypeError('Cannot convert did to url, missing did.')
  }
  if (!did.startsWith('did:web:')) {
    throw new TypeError(`DID Method not supported: "${did}".`)
  }

  const [didUrl, hashFragment] = did.split('#')
  // eslint-disable-next-line no-unused-vars
  // const [didResource, query] = didUrl.split('?')

  // eslint-disable-next-line no-unused-vars
  const [_did, _web, urlNoProtocol] = didUrl.split(':')

  let parsedUrl
  try {
    // URI-decode the url (in case it contained a port number,
    // for example, `did:web:localhost%3A8080`
    parsedUrl = new URL('https://' + decodeURIComponent(urlNoProtocol))
  } catch (error) {
    throw new TypeError(`Cannot construct url from did: "${did}".`)
  }

  if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
    parsedUrl.pathname = '/.well-known/did.json'
  } else {
    const pathFragments = parsedUrl.pathname.split('/')
    parsedUrl.pathname = pathFragments.map(decodeURIComponent).join('/')
  }

  if (hashFragment) {
    parsedUrl.hash = hashFragment
  }
  return parsedUrl.toString()
}

/**
 * Initializes the DID Document's keys/proof methods.
 *
 * @example
 * didDocument.id = 'did:ex:123';
 * const {didDocument, keyPairs} = await initKeys({
 *   didDocument,
 *   cryptoLd,
 *   keyMap: {
 *     capabilityInvocation: someExistingKey,
 *     authentication: 'Ed25519VerificationKey2020',
 *     assertionMethod: 'Ed25519VerificationKey2020',
 *     keyAgreement: 'X25519KeyAgreementKey2019'
 *   }
 * });.
 *
 * @param {object} options - Options hashmap.
 * @param {object} options.didDocument - DID Document.
 * @typedef {object} CryptoLD
 * @param {CryptoLD} [options.cryptoLd] - CryptoLD driver instance,
 *   initialized with the key types this DID Document intends to support.
 * @param {object} [options.keyMap] - Map of keys (or key types) by purpose.
 *
 * @returns {Promise<{didDocument: object, keyPairs: Map}>} Resolves with the
 *   DID Document initialized with keys, as well as the map of the corresponding
 *   key pairs (by key id).
 */
export async function initKeys ({ didDocument, cryptoLd, keyMap } = {}) {
  const doc = { ...didDocument }
  if (!doc.id) {
    throw new TypeError(
      'DID Document "id" property is required to initialize keys.')
  }

  const keyPairs = new Map()

  // Set the defaults for the created keys (if needed)
  const options = { controller: doc.id }

  for (const purpose in keyMap) {
    if (!VERIFICATION_RELATIONSHIPS.has(purpose)) {
      throw new Error(`Unsupported key purpose: "${purpose}".`)
    }

    let key
    if (typeof keyMap[purpose] === 'string') {
      if (!cryptoLd) {
        throw new Error('Please provide an initialized CryptoLD instance.')
      }
      key = await cryptoLd.generate({ type: keyMap[purpose], ...options })
    } else {
      // An existing key has been provided
      key = keyMap[purpose]
    }

    doc[purpose] = [key.export({ publicKey: true })]
    keyPairs.set(key.id, key)
  }

  return { didDocument: doc, keyPairs }
}

export class DidWebResolver {
  /**
   * @param cryptoLd {CryptoLD}
   * @param keyMap {object}
   * @param [logger] {object} Logger object (with .log, .error, .warn,
   *   etc methods).
   */
  constructor ({ cryptoLd, keyMap = DEFAULT_KEY_MAP, logger = console } = {}) {
    this.method = 'web' // did:web:... (used for didIo resolver harness)
    this.cryptoLd = cryptoLd
    this.keyMap = keyMap
    this.logger = logger
  }

  /**
   * Generates a new DID Document and initializes various authentication
   * and authorization proof purpose keys.
   *
   * @example
   *   const url = 'https://example.com'
   *   const { didDocument, didKeys } = await didWeb.generate({url})
   *   didDocument.id
   *   // -> 'did:web:example.com'
   *
   *
   * Either an `id` or a `url` is required:
   * @param [id] {string} - A did:web DID. If absent, will be converted from url
   * @param [url] {string}
   *
   * @param [keyMap] {object} A hashmap of key types by purpose.
   *
   * @parma [cryptoLd] {object} CryptoLD instance with support for supported
   *   crypto suites installed.
   *
   * @returns {Promise<{didDocument: object, keyPairs: Map,
   *   methodFor: Function}>} Resolves with the generated DID Document, along
   *   with the corresponding key pairs used to generate it (for storage in a
   *   KMS).
   */
  async generate ({ id, url, seed, keyMap, cryptoLd = this.cryptoLd } = {}) {
    if (!id && !url) {
      throw new TypeError('A "url" or an "id" parameter is required.')
    }
    if (seed && keyMap) {
      throw new TypeError(
        'Either a "seed" or a "keyMap" param must be provided, but not both.'
      )
    }

    const did = id || didFromUrl({ url })

    if (seed) {
      const keyPair = await _keyPairFromSecretSeed({
        seed, controller: did, cryptoLd
      })
      keyMap = { assertionMethod: keyPair }
    } else {
      keyMap = keyMap || this.keyMap
    }

    // Compose the DID Document
    let didDocument = {
      '@context': [
        didContext.constants.DID_CONTEXT_URL,
        ed25519Context.constants.CONTEXT_URL,
        x25519Context.constants.CONTEXT_URL
      ],
      id: did
    }

    const result = await initKeys({ didDocument, cryptoLd, keyMap })
    const keyPairs = result.keyPairs
    didDocument = result.didDocument

    // Convenience function that returns the public/private key pair instance
    // for a given purpose (authentication, assertionMethod, keyAgreement, etc).
    const methodFor = ({ purpose }) => {
      const { id: methodId } = didIo.findVerificationMethod({
        doc: didDocument, purpose
      })
      return keyPairs.get(methodId)
    }

    return { didDocument, keyPairs, methodFor }
  }

  /**
   * Fetches a DID Document for a given DID.
   *
   * @example
   * // In Node.js tests, use an agent to avoid self-signed certificate errors
   * const agent = new https.agent({rejectUnauthorized: false});
   *
   * @param {string} [did] For example, 'did:web:example.com'
   * @param {string} [url]
   * @param {https.Agent} [agent] Optional agent used to customize network
   *   behavior in Node.js (such as `rejectUnauthorized: false`).
   * @param {object} [logger] Logger object (with .log, .error, .warn,
   *   etc methods).
   *
   * @throws {Error}
   *
   * @returns {Promise<object>} Plain parsed JSON object of the DID Document.
   */
  async get ({ did, url, agent, logger = this.logger }) {
    const didUrl = url || urlFromDid({ did })
    if (!didUrl) {
      throw new TypeError('A DID or a URL is required.')
    }

    const [urlAuthority, keyIdFragment] = didUrl.split('#')

    let didDocument
    try {
      logger.info(`Fetching "${urlAuthority}" via http client.`)
      const result = await httpClient.get(urlAuthority, { agent })
      didDocument = result.data
    } catch (e) {
      // status is HTTP status code
      // data is JSON error from the server if available
      const { data, status } = e
      logger.error(`Http ${status} error:`, data)
      throw e
    }
    if (didDocument && keyIdFragment) {
      // resolve an individual key
      // Keys are expected to have format: <did:web:...>#<keyIdFragment>
      const didAuthority = didFromUrl({ url: urlAuthority })
      const methodId = `${didAuthority}#${keyIdFragment}`

      const key = didIo.findVerificationMethod({ doc: didDocument, methodId })
      if (!key) {
        throw new Error(`Key id ${methodId} not found.`)
      }

      const keyPair = await this.cryptoLd.from(key)

      return keyPair.export({ publicKey: true, includeContext: true })
    }

    return didDocument
  }

  /**
   * Returns the public key (verification method) object for a given DID
   * Document and purpose. Useful in conjunction with a `.get()` call.
   *
   * @example
   * const didDocument = await didKeyDriver.get({did});
   * const authKeyData = didDriver.publicMethodFor({
   *   didDocument, purpose: 'authentication'
   * });
   * // You can then create a suite instance object to verify signatures etc.
   * const authPublicKey = await cryptoLd.from(authKeyData);
   * const {verify} = authPublicKey.verifier();
   *
   * @param {object} options - Options hashmap.
   * @param {object} options.didDocument - DID Document (retrieved via a
   *   `.get()` or from some other source).
   * @param {string} options.purpose - Verification method purpose, such as
   *   'authentication', 'assertionMethod', 'keyAgreement' and so on.
   *
   * @returns {object} Returns the public key object (obtained from the DID
   *   Document), without a `@context`.
   */
  publicMethodFor ({ didDocument, purpose } = {}) {
    if (!didDocument) {
      throw new TypeError('The "didDocument" parameter is required.')
    }
    if (!purpose) {
      throw new TypeError('The "purpose" parameter is required.')
    }

    const method = didIo.findVerificationMethod({ doc: didDocument, purpose })
    if (!method) {
      throw new Error(`No verification method found for purpose "${purpose}"`)
    }
    return method
  }
}

/**
 * @param options {object}
 * @param options.seed {string|Uint8Array}
 * @param controller {string}
 * @param cryptoLd {object}
 *
 * @return {Promise<LDKeyPair>}
 */
async function _keyPairFromSecretSeed ({ seed, controller, cryptoLd } = {}) {
  let seedBytes
  if (typeof seed === 'string') {
    // Currently only supports base58 multibase / identity multihash encoding.
    if (!seed.startsWith('z1A')) {
      throw new TypeError('"seed" parameter must be a multibase/multihash encoded string, or a Uint8Array.')
    }
    seedBytes = decodeSecretKeySeed({ secretKeySeed: seed })
  } else {
    seedBytes = new Uint8Array(seed)
  }
  return cryptoLd.generate({
    controller, seed: seedBytes, type: 'Ed25519VerificationKey2020'
  })
}
