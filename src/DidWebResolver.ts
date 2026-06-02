/**
 * A `did:web` method resolver and document generator for the `@interop/did-io`
 * library. Builds `did:web` DID documents directly from registered key-suite
 * instances (no `crypto-ld` dependency) and resolves them over HTTPS with
 * SSRF, response-size, and document-`id` safety checks.
 */
import { httpClient } from '@interop/http-client'
import * as didIo from '@interop/did-io'
import { decodeSecretKeySeed } from '@digitalcredentials/bnid'
import {
  DID_CONTEXT_URL,
  DEFAULT_PURPOSES,
  contextsBySuite,
  defaultFetchOptions
} from './constants.js'
import { assertDomain } from './assertions.js'
import type { DidMethodDriver } from '@interop/did-io'
import type {
  AbstractKeyPair,
  IDidDocument,
  IKeyPair,
  IPublicKey
} from '@interop/data-integrity-core'
import type { FromMultibase, KeyPairClass, RegisteredKeyType } from './types.js'

const { VERIFICATION_RELATIONSHIPS } = didIo

export function didFromUrl({ url }: { url?: string } = {}): string {
  if (!url) {
    throw new TypeError('Cannot convert url to did, missing url.')
  }
  if (url.startsWith('http:')) {
    throw new TypeError('did:web does not support non-HTTPS URLs.')
  }

  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch (cause) {
    throw new TypeError(`Invalid url: "${url}".`, { cause })
  }

  const { host } = parsedUrl
  let { pathname } = parsedUrl
  let pathComponent = ''

  const didJsonSuffix = '/did.json'
  const wellKnownSuffix = '/.well-known'

  if (pathname?.endsWith(didJsonSuffix)) {
    pathname = pathname.substring(0, pathname.length - didJsonSuffix.length)
  }

  if (pathname?.endsWith(wellKnownSuffix)) {
    pathname = pathname.substring(0, pathname.length - wellKnownSuffix.length)
  }

  if (pathname && pathname !== '/') {
    pathComponent = pathname.split('/').map(encodeURIComponent).join(':')
  }

  return 'did:web:' + encodeURIComponent(host) + pathComponent
}

export function urlFromDid({ did }: { did: string | undefined }): string {
  if (!did?.startsWith('did:web:')) {
    throw new TypeError(`DID Method not supported: "${did ?? ''}".`)
  }

  const [didUrl = '', hashFragment] = did.split('#')

  const [_did, _web, urlNoProtocol = '', ...pathFragments] = didUrl.split(':')

  if (urlNoProtocol.includes('/')) {
    throw new TypeError(
      `Cannot construct url from did: "${did}". domain-name cannot contain a path.`
    )
  }

  let parsedUrl
  try {
    // URI-decode the url (in case it contained a port number,
    // for example, `did:web:localhost%3A8080`
    parsedUrl = new URL('https://' + decodeURIComponent(urlNoProtocol))
  } catch (cause) {
    throw new TypeError(`Cannot construct url from did: "${did}".`, { cause })
  }

  if (pathFragments.length === 0) {
    parsedUrl.pathname = '/.well-known/did.json'
  } else {
    parsedUrl.pathname =
      pathFragments.map(decodeURIComponent).join('/') + '/did.json'
  }

  if (hashFragment) {
    parsedUrl.hash = hashFragment
  }
  return parsedUrl.toString()
}

/**
 * Returns the subnode of a DID document identified by `id`, with the
 * appropriate `@context` attached. Searches `verificationMethod` first, then
 * any other top-level node (e.g. `service`), so it can dereference keys *and*
 * non-key subnodes.
 *
 * @param options {object} - Options hashmap.
 * @param options.didDocument {object} - The DID Document to search.
 * @param options.id {string} - The full id of the subnode to return.
 *
 * @returns {object} The matched subnode, cloned, with `@context`.
 */
export function getNode({
  didDocument,
  id
}: {
  didDocument: any
  id: string
}): any {
  let match = (didDocument.verificationMethod ?? []).find(
    (vm: any) => vm?.id === id
  )
  if (!match) {
    for (const [key, value] of Object.entries(didDocument)) {
      if (key === '@context' || key === 'verificationMethod') {
        continue
      }
      if (Array.isArray(value)) {
        match = value.find((entry: any) => entry?.id === id)
      } else if ((value as any)?.id === id) {
        match = value
      }
      if (match) {
        break
      }
    }
  }

  if (!match) {
    throw new Error(`DID document entity with id "${id}" not found.`)
  }

  return {
    '@context': contextsBySuite.get(match.type) ?? didDocument['@context'],
    ...structuredClone(match)
  }
}

interface VerificationMethodEntry {
  keyPair: AbstractKeyPair | IKeyPair
  fragment?: string
  purposes?: string[]
  serialization?: string
}

export class DidWebResolver implements DidMethodDriver {
  public method: string
  public allowList: string[]
  public fetchOptions: any
  public logger: any
  public _allowedKeyTypes: Map<string, RegisteredKeyType>

  /**
   * @param options {object} - Options hashmap.
   * @param [options.allowList] {string[]} - Hosts permitted as fetch targets
   *   (SSRF gate). Empty/absent means no restriction.
   * @param [options.fetchOptions] {object} - Network limits passed to the http
   *   client (`size` in bytes, `timeout` in ms).
   * @param [options.logger] {object} - Logger object (with .info, .error, etc).
   */
  constructor({
    allowList = [],
    fetchOptions = defaultFetchOptions,
    logger = console
  }: { allowList?: string[]; fetchOptions?: any; logger?: any } = {}) {
    this.method = 'web' // did:web:... (used for didIo resolver harness)
    this.allowList = allowList
    this.fetchOptions = fetchOptions
    this.logger = logger
    this._allowedKeyTypes = new Map()
  }

  /**
   * Registers a key suite this driver may handle when generating documents and
   * rebuilding key pairs from plain descriptions.
   *
   * Preferred form: pass a `keyPairClass` exposing static `multibaseHeader`,
   * `from`, and (optionally) `generate`. The driver reads the header off the
   * class, so callers need not know the literal value.
   *
   * Lower-level form: pass `multibaseMultikeyHeader` plus a `fromMultibase`
   * deserializer. Suites registered this way support resolution/rebuilding but
   * not `generate()`.
   *
   * @param options {object} - Options hashmap.
   * @param [options.keyPairClass] {Function} - A KeyPair suite class.
   * @param [options.multibaseMultikeyHeader] {string} - Multibase header.
   * @param [options.fromMultibase] {Function} - `{publicKeyMultibase}` to key.
   */
  use({
    keyPairClass,
    multibaseMultikeyHeader,
    fromMultibase
  }: {
    keyPairClass?: KeyPairClass
    multibaseMultikeyHeader?: string
    fromMultibase?: FromMultibase
  } = {}): void {
    if (keyPairClass) {
      const header = keyPairClass.multibaseHeader
      if (!(header && typeof header === 'string')) {
        throw new TypeError('"keyPairClass.multibaseHeader" must be a string.')
      }
      if (typeof keyPairClass.from !== 'function') {
        throw new TypeError('"keyPairClass.from" must be a function.')
      }
      this._allowedKeyTypes.set(header, {
        fromMultibase: keyPairClass.from.bind(keyPairClass),
        generate:
          typeof keyPairClass.generate === 'function'
            ? keyPairClass.generate.bind(keyPairClass)
            : undefined
      })
      return
    }
    if (
      !(multibaseMultikeyHeader && typeof multibaseMultikeyHeader === 'string')
    ) {
      throw new TypeError('"multibaseMultikeyHeader" must be a string.')
    }
    if (typeof fromMultibase !== 'function') {
      throw new TypeError('"fromMultibase" must be a function.')
    }
    this._allowedKeyTypes.set(multibaseMultikeyHeader, { fromMultibase })
  }

  /**
   * Adds a single verification method to a DID document: exports the key's
   * public node, assigns it the id `${did}#${fragment}`, pushes it into
   * `verificationMethod`, references it under each requested purpose, and
   * accumulates the key's `@context`.
   *
   * This is the foundational document-building primitive; it works on a freshly
   * created document or on one fetched and republished with rotated keys.
   *
   * @param options {object} - Options hashmap.
   * @param options.didDocument {object} - Document to mutate (must have `id`).
   * @param options.keyPair {object} - A registered key suite instance, or a
   *   plain public key description (e.g. from a KMS), which is rebuilt into a
   *   live instance via the registered suites.
   * @param [options.keyPairs] {Map} - Optional key-id to key-pair map to update.
   * @param [options.fragment] {string} - Author-chosen fragment (defaults to
   *   the key fingerprint).
   * @param [options.purposes] {string[]} - Verification relationships to wire.
   * @param [options.serialization] {string} - `'multibase'` (default); `'jwk'`
   *   is reserved for when key suites expose JWK export.
   *
   * @returns {Promise<object>} The mutated DID document.
   */
  async addVerificationMethod({
    didDocument,
    keyPairs,
    keyPair,
    fragment,
    purposes = DEFAULT_PURPOSES,
    serialization = 'multibase'
  }: {
    didDocument: any
    keyPairs?: Map<string, AbstractKeyPair>
    keyPair: AbstractKeyPair | IKeyPair
    fragment?: string
    purposes?: string[]
    serialization?: string
  }): Promise<IDidDocument> {
    if (!didDocument?.id) {
      throw new TypeError(
        '"didDocument.id" is required to add a verification method.'
      )
    }
    if (!keyPair) {
      throw new TypeError('A "keyPair" is required.')
    }
    if (serialization !== 'multibase') {
      throw new Error(`Serialization "${serialization}" is not yet supported.`)
    }
    const did = didDocument.id
    // Accept either a live key pair instance or a plain key description,
    // rebuilding the latter into an instance that can `export()`.
    const livePair = await this._toKeyPair(keyPair)
    fragment = fragment ?? _defaultFragment(livePair)
    livePair.controller = did
    livePair.id = `${did}#${fragment}`

    const publicNode = livePair.export({ publicKey: true, includeContext: true })
    const context = publicNode['@context']
    delete publicNode['@context']
    if (context) {
      _addContext({ didDocument, context })
    }

    didDocument.verificationMethod = didDocument.verificationMethod ?? []
    didDocument.verificationMethod.push(publicNode)

    for (const purpose of purposes) {
      if (!VERIFICATION_RELATIONSHIPS.has(purpose)) {
        throw new Error(`Unsupported key purpose: "${purpose}".`)
      }
      didDocument[purpose] = didDocument[purpose] ?? []
      didDocument[purpose].push(publicNode.id)
    }

    keyPairs?.set(livePair.id!, livePair)
    return didDocument
  }

  /**
   * Generates a new `did:web` DID Document.
   *
   * @example
   *   const { didDocument, keyPairs } = await didWeb.generate({
   *     url: 'https://example.com', verificationKeyPair
   *   })
   *   didDocument.id // -> 'did:web:example.com'
   *
   * Either an `id` or a `url` is required. For the single-key common case, pass
   * a `verificationKeyPair` (or `seed`/`keyType` to generate one from a
   * registered suite) and optionally a `keyAgreementKeyPair`. For multi-key
   * documents, pass `verificationMethods`.
   *
   * @param options {object} - Options hashmap.
   * @param [options.id] {string} - A did:web DID (else derived from `url`).
   * @param [options.url] {string} - HTTPS url of the DID document.
   * @param [options.seed] {string|Uint8Array} - Secret seed to derive a key.
   * @param [options.keyType] {Function|string} - Which registered suite to
   *   generate with (a key class or its multibase header).
   * @param [options.verificationKeyPair] {object} - A pre-made verification key
   *   (a live instance or a plain key description).
   * @param [options.keyAgreementKeyPair] {object} - A pre-made keyAgreement key
   *   (a live instance or a plain key description).
   * @param [options.verificationMethods] {Array} - Multi-key entries, each
   *   `{ keyPair, fragment?, purposes?, serialization? }`.
   *
   * @returns {Promise<{didDocument: object, keyPairs: Map, methodFor: Function}>}
   */
  async generate({
    id,
    url,
    seed,
    keyType,
    verificationKeyPair,
    keyAgreementKeyPair,
    verificationMethods
  }: {
    id?: string
    url?: string
    seed?: string | Uint8Array
    keyType?: KeyPairClass | string
    verificationKeyPair?: AbstractKeyPair | IKeyPair
    keyAgreementKeyPair?: AbstractKeyPair | IKeyPair
    verificationMethods?: VerificationMethodEntry[]
  } = {}): Promise<{
    didDocument: IDidDocument
    keyPairs: Map<string, AbstractKeyPair>
    methodFor: (options: { purpose: string }) => AbstractKeyPair
  }> {
    if (!id && !url) {
      throw new TypeError('A "url" or an "id" parameter is required.')
    }

    const did = id ?? didFromUrl({ url })
    assertDomain({ allowList: this.allowList, url: url ?? urlFromDid({ did }) })

    const didDocument: any = { '@context': [DID_CONTEXT_URL], id: did }
    const keyPairs = new Map<string, AbstractKeyPair>()

    if (verificationMethods && verificationMethods.length > 0) {
      for (const entry of verificationMethods) {
        await this.addVerificationMethod({
          didDocument,
          keyPairs,
          keyPair: entry.keyPair,
          fragment: entry.fragment,
          purposes: entry.purposes,
          serialization: entry.serialization
        })
      }
    } else {
      let keyPair = verificationKeyPair
      if (!keyPair && !keyAgreementKeyPair) {
        keyPair = await this._generateKeyPair({ seed, keyType })
      }
      if (keyPair) {
        await this.addVerificationMethod({
          didDocument,
          keyPairs,
          keyPair,
          purposes: DEFAULT_PURPOSES
        })
      }
      if (keyAgreementKeyPair) {
        await this.addVerificationMethod({
          didDocument,
          keyPairs,
          keyPair: keyAgreementKeyPair,
          purposes: ['keyAgreement']
        })
      }
    }

    // Convenience function that returns the public/private key pair instance
    // for a given purpose (authentication, assertionMethod, keyAgreement, etc).
    const methodFor = ({ purpose }: { purpose: string }): AbstractKeyPair => {
      const method: any = didIo.findVerificationMethod({
        doc: didDocument,
        purpose
      })
      return keyPairs.get(method?.id)!
    }

    return { didDocument, keyPairs, methodFor }
  }

  /**
   * Generates a `did:web` DID Document from existing key pairs. A `url` or `id`
   * is required (unlike `did:key`, a `did:web` identifier is not derivable from
   * key material alone).
   *
   * Either key pair may be a live `AbstractKeyPair` instance or a plain public
   * key description (e.g. from a KMS); plain descriptions are rebuilt into live
   * instances via the registered key suites.
   *
   * @param options {object} - Options hashmap.
   * @param [options.url] {string} - HTTPS url of the DID document.
   * @param [options.id] {string} - A did:web DID.
   * @param [options.verificationKeyPair] {object} - A verification KeyPair.
   * @param [options.keyAgreementKeyPair] {object} - A keyAgreement KeyPair.
   *
   * @returns {Promise<{didDocument: object, keyPairs: Map, methodFor: Function}>}
   */
  async fromKeyPair({
    url,
    id,
    verificationKeyPair,
    keyAgreementKeyPair
  }: {
    url?: string
    id?: string
    verificationKeyPair?: AbstractKeyPair | IKeyPair
    keyAgreementKeyPair?: AbstractKeyPair | IKeyPair
  } = {}): Promise<{
    didDocument: IDidDocument
    keyPairs: Map<string, AbstractKeyPair>
    methodFor: (options: { purpose: string }) => AbstractKeyPair
  }> {
    if (!(verificationKeyPair || keyAgreementKeyPair)) {
      throw new TypeError(
        '"verificationKeyPair" or "keyAgreementKeyPair" must be provided.'
      )
    }
    if (!url && !id) {
      throw new TypeError(
        'A "url" or "id" is required to build a did:web document.'
      )
    }
    // `generate()` rebuilds any plain key descriptions into live instances
    // (via `addVerificationMethod`), so they can be passed straight through.
    return this.generate({ url, id, verificationKeyPair, keyAgreementKeyPair })
  }

  /**
   * Converts a public key description to a `did:web` DID Document. A `url` or
   * `id` is required. Unlike `generate()`, no `keyPairs` map is returned.
   *
   * @param options {object} - Options hashmap.
   * @param [options.url] {string} - HTTPS url of the DID document.
   * @param [options.id] {string} - A did:web DID.
   * @param options.publicKeyDescription {object} - A key pair instance or a
   *   plain public key description (e.g. from a KMS).
   *
   * @returns {Promise<{didDocument: object}>}
   */
  async publicKeyToDidDoc({
    url,
    id,
    publicKeyDescription
  }: {
    url?: string
    id?: string
    publicKeyDescription?: AbstractKeyPair | IKeyPair
  } = {}): Promise<{ didDocument: IDidDocument }> {
    if (!publicKeyDescription) {
      throw new TypeError('"publicKeyDescription" is required.')
    }
    if (!url && !id) {
      throw new TypeError(
        'A "url" or "id" is required to build a did:web document.'
      )
    }
    const did = id ?? didFromUrl({ url })
    const didDocument: any = { '@context': [DID_CONTEXT_URL], id: did }
    await this.addVerificationMethod({
      didDocument,
      keyPair: publicKeyDescription,
      purposes: DEFAULT_PURPOSES
    })
    return { didDocument }
  }

  /**
   * Fetches a `did:web` DID Document for a given DID, or dereferences a subnode
   * when the DID carries a `#fragment`. Applies the SSRF allow list, network
   * limits, and verifies that the fetched document's `id` matches the DID.
   *
   * @param options {object} - Options hashmap.
   * @param [options.did] {string} - For example, 'did:web:example.com'.
   * @param [options.url] {string} - Alias for `did`, for readability.
   * @param [options.agent] {object} - Optional agent to customize network
   *   behavior in Node.js (such as `rejectUnauthorized: false`).
   * @param [options.fetchOptions] {object} - Per-request network limits,
   *   merged over the driver's defaults.
   * @param [options.logger] {object} - Logger object.
   *
   * @throws {Error}
   *
   * @returns {Promise<IDidDocument | IPublicKey>} The DID Document, or a public
   *   key / subnode.
   */
  async get({
    did,
    url,
    agent,
    fetchOptions = {},
    logger = this.logger
  }: {
    did?: string
    url?: string
    agent?: any
    fetchOptions?: any
    logger?: any
    [_key: string]: unknown
  } = {}): Promise<IDidDocument | IPublicKey> {
    did = did ?? url
    if (!did) {
      throw new TypeError('A DID or a URL is required to fetch.')
    }

    // Separate the bare DID authority from any `?query` or `#fragment`.
    const [didAuthority = ''] = did.split(/[#?]/)
    const fragment = did.includes('#')
      ? did.slice(did.indexOf('#') + 1)
      : undefined

    const fetchUrl = urlFromDid({ did: didAuthority })
    // SSRF gate: reject disallowed hosts before making any network request.
    assertDomain({ allowList: this.allowList, url: fetchUrl })

    let didDocument: any
    try {
      logger.info(`Fetching "${fetchUrl}" via http client.`)
      const result = await httpClient.get(fetchUrl, {
        ...this.fetchOptions,
        ...fetchOptions,
        agent
      })
      didDocument = result.data
    } catch (err: any) {
      // status is HTTP status code; data is the server's JSON error if any.
      const { data, status } = err ?? {}
      logger.error(`Http ${status ?? ''} error:`, data)
      throw err
    }

    if (didDocument?.id !== didAuthority) {
      throw new Error(`DID document for DID "${didAuthority}" not found.`)
    }

    if (fragment) {
      // Dereference an individual subnode (key or service) by id.
      return getNode({ didDocument, id: `${didDocument.id}#${fragment}` })
    }

    return didDocument
  }

  /**
   * Returns the public key (verification method) object for a given DID
   * Document and purpose. Useful in conjunction with a `.get()` call.
   *
   * @param options {object} - Options hashmap.
   * @param options.didDocument {object} - DID Document (retrieved via a
   *   `.get()` or from some other source).
   * @param options.purpose {string} - Verification method purpose, such as
   *   'authentication', 'assertionMethod', 'keyAgreement' and so on.
   *
   * @returns {object} The public key object (without a `@context`).
   */
  publicMethodFor({
    didDocument,
    purpose
  }: { didDocument?: IDidDocument; purpose?: string } = {}): IPublicKey {
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
    return method as IPublicKey
  }

  /**
   * Generates a verification key pair from a registered suite.
   *
   * @param options {object} - Options hashmap.
   * @param [options.seed] {string|Uint8Array} - Secret seed.
   * @param [options.keyType] {Function|string} - Which registered suite to use.
   *
   * @returns {Promise<object>} The generated key pair.
   */
  async _generateKeyPair({
    seed,
    keyType
  }: {
    seed?: string | Uint8Array
    keyType?: KeyPairClass | string
  } = {}): Promise<AbstractKeyPair> {
    let header: string | undefined
    if (keyType) {
      header = typeof keyType === 'string' ? keyType : keyType.multibaseHeader
    } else if (this._allowedKeyTypes.size === 1) {
      ;[header] = this._allowedKeyTypes.keys()
    } else if (this._allowedKeyTypes.size === 0) {
      throw new Error(
        'No key suite registered; call "use({keyPairClass})" or pass a ' +
          '"verificationKeyPair".'
      )
    } else {
      throw new Error(
        'Multiple key suites registered; specify which via "keyType" or pass ' +
          'a "verificationKeyPair".'
      )
    }

    const registered = this._allowedKeyTypes.get(header!)
    if (!registered?.generate) {
      throw new Error(
        `Registered suite "${header}" cannot generate keys; register it via ` +
          '"use({keyPairClass})".'
      )
    }
    const seedBytes = seed === undefined ? undefined : _decodeSeed(seed)
    return registered.generate({ seed: seedBytes })
  }

  /**
   * Resolves a key pair instance from either a live key pair (with `.export`)
   * or a plain public key description (rebuilt via the registry).
   *
   * @param description {object} - A key pair instance or key description.
   *
   * @returns {Promise<object>} A live key pair instance.
   */
  async _toKeyPair(description: any): Promise<AbstractKeyPair> {
    if (typeof description?.export === 'function') {
      return description
    }
    const publicKeyMultibase = description?.publicKeyMultibase
    if (!publicKeyMultibase) {
      throw new TypeError(
        '"publicKeyMultibase" is required to rebuild a key pair.'
      )
    }
    const header = publicKeyMultibase.slice(0, 4)
    const registered = this._allowedKeyTypes.get(header)
    if (!registered) {
      throw new Error(
        `Unsupported multibase header "${header}". Register the suite via ` +
          '"use()".'
      )
    }
    return registered.fromMultibase({ publicKeyMultibase })
  }
}

/**
 * Adds one or more contexts to a DID document's `@context`, de-duplicating.
 *
 * @param options {object} - Options hashmap.
 * @param options.didDocument {object} - The document to mutate.
 * @param options.context {string|string[]} - Context(s) to add.
 */
function _addContext({
  didDocument,
  context
}: {
  didDocument: any
  context: string | string[]
}): void {
  const contexts = Array.isArray(didDocument['@context'])
    ? didDocument['@context']
    : [didDocument['@context']]
  const toAdd = Array.isArray(context) ? context : [context]
  for (const ctx of toAdd) {
    if (!contexts.includes(ctx)) {
      contexts.push(ctx)
    }
  }
  didDocument['@context'] = contexts
}

/**
 * Returns a default fragment for a key pair: its fingerprint when available,
 * otherwise its `publicKeyMultibase`.
 *
 * @param keyPair {object} - The key pair.
 *
 * @returns {string} The fragment (without a leading `#`).
 */
function _defaultFragment(keyPair: any): string {
  if (typeof keyPair?.fingerprint === 'function') {
    return keyPair.fingerprint()
  }
  if (keyPair?.publicKeyMultibase) {
    return keyPair.publicKeyMultibase
  }
  throw new TypeError(
    'Cannot determine a default fragment; provide a "fragment".'
  )
}

/**
 * Decodes a secret key seed to bytes. Accepts a multibase/multihash-encoded
 * string (must start with `z1A`) or a `Uint8Array`.
 *
 * @param seed {string|Uint8Array} - The seed.
 *
 * @returns {Uint8Array} The decoded seed bytes.
 */
function _decodeSeed(seed: string | Uint8Array): Uint8Array {
  if (typeof seed === 'string') {
    if (!seed.startsWith('z1A')) {
      throw new TypeError(
        '"seed" parameter must be a multibase/multihash encoded string, or a ' +
          'Uint8Array.'
      )
    }
    return decodeSecretKeySeed({ secretKeySeed: seed })
  }
  return new Uint8Array(seed)
}
