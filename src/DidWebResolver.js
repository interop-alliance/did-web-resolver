'use strict'

// import axios from 'axios' // todo: consider 'apisauce' instead
import { DidDocument } from 'did-io'
import { URL } from 'whatwg-url'

const DEFAULT_KEY_MAP = {
  capabilityInvocation: 'ed25519',
  authentication: 'ed25519',
  assertionMethod: 'ed25519',
  capabilityDelegation: 'ed25519'
  // keyAgreement: 'x25519'  // <- not yet supported
}

export function didFromUrl ({ url } = {}) {
  if(!url) {
    throw new TypeError('Cannot convert url to did, missing url.')
  }
  if(url.startsWith('http:')) {
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
  if(!did) {
    throw new TypeError('Cannot convert did to url, missing did.')
  }
  if(!did.startsWith('did:web:')) {
    throw new TypeError(`DID Method not supported: "${did}".`)
  }

  const [_did, _web, host, ...pathFragments ] = did.split(':')

  let pathname = ''
  if(pathFragments.length === 0) {
    pathname = '/.well-known/did.json'
  } else {
    pathname = '/' + pathFragments.map(decodeURIComponent).join('/')
  }

  return 'https://' + decodeURIComponent(host) + pathname
}

export class DidWebResolver {
  constructor ({ cryptoLd, keyMap = DEFAULT_KEY_MAP } = {}) {
    // did:web:...
    this.method = 'web'
    this.cryptoLd = cryptoLd
    this.keyMap = keyMap
  }

  /**
   * Generates a new DID Document and initializes various authentication
   * and authorization proof purpose keys.
   *
   * Usage:
   * ```
   *   const url = 'https://example.com'
   *   const { didDocument, didKeys } = await didWeb.generate({url})
   *   didDocument.id
   *   // -> 'did:web:example.com'
   * ```
   *
   * Either an `id` or a `url` is required:
   * @param [id] {string} - A did:web DID. If absent, will be converted from url
   * @param [url] {string}
   *
   * @throws {Error}
   *
   * @returns {Promise<{didDocument: DidDocument, didKeys: object}>}
   */
  async generate ({ id, url, keyMap = this.keyMap, cryptoLd = this.cryptoLd } = {}) {
    const didDocument = new DidDocument({ id: id || didFromUrl({ url }) })
    const { didKeys } = await didDocument.initKeys({ cryptoLd, keyMap })
    return { didDocument, didKeys }
  }

  /**
   * Fetches a DID Document for a given DID.
   * @param {string} did
   *
   * @returns {Promise<DidDocument>}
   */
  async get () {}
}
