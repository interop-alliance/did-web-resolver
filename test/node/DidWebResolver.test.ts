import { describe, it, beforeEach, afterEach, assert, vi } from 'vitest'

import { httpClient } from '@interop/http-client'

import {
  DidWebResolver,
  urlFromDid,
  didFromUrl,
  getNode
} from '../../src/index.js'

import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { X25519KeyAgreementKey2020 } from '@digitalcredentials/x25519-key-agreement-key-2020'

function makeResolver(
  options: { allowList?: string[]; fetchOptions?: any; logger?: any } = {}
): DidWebResolver {
  const didWeb = new DidWebResolver(options)
  didWeb.use({ keyPairClass: Ed25519VerificationKey })
  return didWeb
}

// Stubs the http client to return a fixed DID document body.
function stubRequest({ data }: { data: any }): void {
  vi.spyOn(httpClient, 'get').mockResolvedValue({ data } as any)
}

describe('DidWebResolver', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should exist', () => {
      assert(new DidWebResolver())
    })
  })

  describe('use()', () => {
    it('should reject a keyPairClass without a multibaseHeader', () => {
      const didWeb = new DidWebResolver()
      assert.throws(
        () => didWeb.use({ keyPairClass: class {} }),
        '"keyPairClass.multibaseHeader" must be a string.'
      )
    })

    it('should register a low-level fromMultibase deserializer', () => {
      const didWeb = new DidWebResolver()
      didWeb.use({
        multibaseMultikeyHeader: 'z6Mk',
        fromMultibase: Ed25519VerificationKey.from.bind(Ed25519VerificationKey)
      })
      assert(didWeb._allowedKeyTypes.has('z6Mk'))
    })
  })

  describe('publicMethodFor()', () => {
    it('should fetch a public key object for a given purpose', async () => {
      const didWeb = makeResolver()
      const verificationKeyPair = await Ed25519VerificationKey.generate()
      const keyAgreementKeyPair = await X25519KeyAgreementKey2020.generate()
      const url = 'https://example.com'
      const { didDocument } = await didWeb.generate({
        url,
        verificationKeyPair,
        keyAgreementKeyPair
      })

      const keyAgreementKey = didWeb.publicMethodFor({
        didDocument,
        purpose: 'keyAgreement'
      })

      assert.equal(keyAgreementKey.type, 'X25519KeyAgreementKey2020')
    })
  })

  describe('generate()', () => {
    let didWeb: DidWebResolver

    beforeEach(() => {
      didWeb = makeResolver()
    })

    it('should error if neither url nor id is given', async () => {
      let error
      try {
        await didWeb.generate()
      } catch (err: any) {
        error = err
      }
      assert.equal(error.message, 'A "url" or an "id" parameter is required.')
    })

    it('should generate from the single registered key suite', async () => {
      const url = 'https://example.com'
      const { didDocument, keyPairs } = await didWeb.generate({ url })

      assert.property(didDocument, '@context')
      assert.equal(didDocument.id, 'did:web:example.com')
      assert.equal(didDocument.verificationMethod[0].type, 'Multikey')

      // Verification relationships hold id references, not embedded methods.
      const vmId = didDocument.verificationMethod[0].id
      assert.equal(didDocument.authentication[0], vmId)
      assert.equal(didDocument.assertionMethod[0], vmId)
      assert.equal(didDocument.capabilityDelegation[0], vmId)
      assert.equal(didDocument.capabilityInvocation[0], vmId)

      // No keyAgreement is auto-derived.
      assert.notProperty(didDocument, 'keyAgreement')

      assert.equal(keyPairs.size, 1)
      assert(keyPairs.get(vmId))
    })

    it('should return methodFor convenience function', async () => {
      const url = 'https://example.com'
      const { methodFor } = await didWeb.generate({ url })

      const assertionKey = methodFor({ purpose: 'assertionMethod' })

      assert.equal(assertionKey.type, 'Ed25519VerificationKey2020')
      assert.equal(assertionKey.controller, 'did:web:example.com')
      assert.property(assertionKey, 'publicKeyMultibase')
      assert.property(assertionKey, 'privateKeyMultibase')
    })

    it('should generate deterministically from a seed', async () => {
      const seed = 'z1AhV1bADy7RepJ64mvH7Kk7htFNGc7EA1WA5nGzLSTWc6o'
      const expectedKeyId =
        'did:web:example.com#z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB'
      const url = 'https://example.com'
      const { didDocument, methodFor } = await didWeb.generate({ url, seed })

      assert.equal(didDocument.id, 'did:web:example.com')

      const assertionKey = methodFor({ purpose: 'assertionMethod' })
      assert.equal(assertionKey.id, expectedKeyId)
      assert.equal(assertionKey.controller, 'did:web:example.com')
      assert.equal(
        assertionKey.publicKeyMultibase,
        'z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB'
      )
      assert.property(assertionKey, 'privateKeyMultibase')
    })

    it('should place an explicit keyAgreement key', async () => {
      const verificationKeyPair = await Ed25519VerificationKey.generate()
      const keyAgreementKeyPair = await X25519KeyAgreementKey2020.generate()
      const { didDocument, keyPairs } = await didWeb.generate({
        url: 'https://example.com',
        verificationKeyPair,
        keyAgreementKeyPair
      })

      assert.equal(didDocument.verificationMethod.length, 2)
      assert.equal(didDocument.keyAgreement.length, 1)
      const kaId = didDocument.keyAgreement[0]
      const kaNode = didDocument.verificationMethod.find(
        (vm: any) => vm.id === kaId
      )
      assert.equal(kaNode.type, 'X25519KeyAgreementKey2020')
      assert.equal(keyPairs.size, 2)
    })

    it('should build a multi-key document from verificationMethods', async () => {
      const edKey = await Ed25519VerificationKey.generate()
      const { didDocument } = await didWeb.generate({
        url: 'https://example.com',
        verificationMethods: [
          {
            keyPair: edKey,
            fragment: 'ed25519-1',
            purposes: ['authentication', 'assertionMethod']
          }
        ]
      })

      assert.equal(
        didDocument.verificationMethod[0].id,
        'did:web:example.com#ed25519-1'
      )
      assert.equal(
        didDocument.authentication[0],
        'did:web:example.com#ed25519-1'
      )
      assert.equal(
        didDocument.assertionMethod[0],
        'did:web:example.com#ed25519-1'
      )
      assert.notProperty(didDocument, 'capabilityInvocation')
    })

    it('should reject a fetch target outside the allowList', async () => {
      const restricted = makeResolver({ allowList: ['example.com'] })
      let error
      try {
        await restricted.generate({ url: 'https://other.com' })
      } catch (err: any) {
        error = err
      }
      assert.equal(error.message, 'Domain "other.com" is not allowed.')
    })
  })

  describe('get()', () => {
    let didWeb: DidWebResolver

    beforeEach(() => {
      didWeb = makeResolver()
    })

    it('should error when neither did nor url is given', async () => {
      let error
      try {
        await didWeb.get()
      } catch (err: any) {
        error = err
      }
      assert.equal(error.message, 'A DID or a URL is required to fetch.')
    })

    it('should round-trip a generated document', async () => {
      const { didDocument } = await didWeb.generate({
        url: 'https://example.com'
      })
      stubRequest({ data: didDocument })

      const result = await didWeb.get({ did: 'did:web:example.com' })

      assert.deepEqual(result, didDocument)
    })

    it('should fetch the .well-known url for a bare did', async () => {
      const { didDocument } = await didWeb.generate({
        url: 'https://example.com'
      })
      const spy = vi
        .spyOn(httpClient, 'get')
        .mockResolvedValue({ data: didDocument } as any)

      await didWeb.get({ did: 'did:web:example.com' })

      assert.equal(
        spy.mock.calls[0][0],
        'https://example.com/.well-known/did.json'
      )
    })

    it('should reject when the fetched document id mismatches', async () => {
      stubRequest({ data: { id: 'did:web:attacker.example' } })
      let error
      try {
        await didWeb.get({ did: 'did:web:example.com' })
      } catch (err: any) {
        error = err
      }
      assert.equal(
        error.message,
        'DID document for DID "did:web:example.com" not found.'
      )
    })

    it('should dereference a verification method by fragment', async () => {
      const { didDocument } = await didWeb.generate({
        url: 'https://example.com'
      })
      const vmId = didDocument.verificationMethod[0].id
      const fragment = vmId.split('#')[1]
      stubRequest({ data: didDocument })

      const node = await didWeb.get({ did: `did:web:example.com#${fragment}` })

      assert.equal(node.id, vmId)
      assert.equal(node.type, 'Multikey')
      assert.equal(node['@context'], 'https://w3id.org/security/multikey/v1')
    })

    it('should dereference a non-key subnode (service) by fragment', async () => {
      const didDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:web:example.com',
        service: [
          {
            id: 'did:web:example.com#hub',
            type: 'HubService',
            serviceEndpoint: 'https://hub.example.com'
          }
        ]
      }
      stubRequest({ data: didDocument })

      const node = await didWeb.get({ did: 'did:web:example.com#hub' })

      assert.equal(node.id, 'did:web:example.com#hub')
      assert.equal(node.type, 'HubService')
      assert.equal(node.serviceEndpoint, 'https://hub.example.com')
    })

    it('should allow a host present in the allowList', async () => {
      const restricted = makeResolver({ allowList: ['example.com'] })
      const { didDocument } = await restricted.generate({
        url: 'https://example.com'
      })
      stubRequest({ data: didDocument })

      const result = await restricted.get({ did: 'did:web:example.com' })

      assert.equal(result.id, 'did:web:example.com')
    })

    it('should deny a host absent from the allowList', async () => {
      const restricted = makeResolver({ allowList: ['example.com'] })
      let error
      try {
        await restricted.get({ did: 'did:web:other.com' })
      } catch (err: any) {
        error = err
      }
      assert.equal(error.message, 'Domain "other.com" is not allowed.')
    })

    it('should deny a host on a non-allowed port', async () => {
      const restricted = makeResolver({ allowList: ['example.com:3000'] })
      let error
      try {
        await restricted.get({ did: 'did:web:example.com%3A8080' })
      } catch (err: any) {
        error = err
      }
      assert.equal(error.message, 'Domain "example.com:8080" is not allowed.')
    })
  })

  describe('getNode()', () => {
    it('should throw when no entity matches the id', () => {
      const didDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:web:example.com'
      }
      assert.throws(
        () => getNode({ didDocument, id: 'did:web:example.com#missing' }),
        'DID document entity with id "did:web:example.com#missing" not found.'
      )
    })
  })

  describe('urlFromDid()', () => {
    it('should error on non-did:web dids', () => {
      let error
      try {
        urlFromDid({ did: 'did:example:1234' })
      } catch (e: any) {
        error = e
      }
      assert.equal(
        error.message,
        'DID Method not supported: "did:example:1234".'
      )
    })

    it('should error on pattern did:web:domain/path/subpath', () => {
      const invalidDids = [
        'did:web:example.com/path',
        'did:web:example.com/path/subpath',
        'did:web:example.com/path/subpath?query=string',
        'did:web:example.com/path/subpath#fragment',
        'did:web:example.com/:user:alice'
      ]
      invalidDids.forEach(did => {
        let error
        try {
          urlFromDid({ did })
        } catch (e: any) {
          error = e
        }
        if (error) {
          assert.include(error.message, 'domain-name cannot contain a path.')
        } else {
          assert.fail('should have thrown error for did: ' + did)
        }
      })
    })

    it('should convert first id fragment to pathname plus default path', () => {
      assert.equal(
        urlFromDid({ did: 'did:web:example.com' }),
        'https://example.com/.well-known/did.json'
      )
    })

    it('should url-decode host', () => {
      assert.equal(
        urlFromDid({ did: 'did:web:localhost%3A8080' }),
        'https://localhost:8080/.well-known/did.json'
      )
    })

    it('should preserve hash fragments for dids without paths', () => {
      const url = urlFromDid({ did: 'did:web:localhost%3A8080#keyId' })
      assert.equal(url, 'https://localhost:8080/.well-known/did.json#keyId')
    })

    // See: https://w3c-ccg.github.io/did-method-web/#example-creating-the-did-with-optional-path
    it('should work with optional path', () => {
      const url = urlFromDid({ did: 'did:web:w3c-ccg.github.io:user:alice' })
      assert.equal(url, 'https://w3c-ccg.github.io/user/alice/did.json')
    })

    // See: https://w3c-ccg.github.io/did-method-web/#example-creating-the-did-with-optional-path-and-port
    it('should work with optional path and port', () => {
      const url = urlFromDid({ did: 'did:web:example.com%3A3000:user:alice' })
      assert.equal(url, 'https://example.com:3000/user/alice/did.json')
    })

    it('should preserve hash fragments for dids with optional path', () => {
      const url = urlFromDid({
        did: 'did:web:w3c-ccg.github.io:user:alice#keyId'
      })
      assert.equal(url, 'https://w3c-ccg.github.io/user/alice/did.json#keyId')
    })

    it('should preserve hash fragments for dids with optional path and port', () => {
      const url = urlFromDid({
        did: 'did:web:example.com%3A3000:user:alice#keyId'
      })
      assert.equal(url, 'https://example.com:3000/user/alice/did.json#keyId')
    })
  })

  describe('didFromUrl', () => {
    it('should error on missing url', () => {
      let error
      try {
        didFromUrl()
      } catch (e: any) {
        error = e
      }
      assert.equal(error.message, 'Cannot convert url to did, missing url.')
    })

    it('should error on http URLs', () => {
      let error
      try {
        didFromUrl({ url: 'http://example.com' })
      } catch (e: any) {
        error = e
      }
      assert.equal(error.message, 'did:web does not support non-HTTPS URLs.')
    })

    it('should error on invalid URLs', () => {
      let error
      try {
        didFromUrl({ url: 'non-url' })
      } catch (e: any) {
        error = e
      }
      assert.equal(error.message, 'Invalid url: "non-url".')
    })

    it('should convert host to did identifier', () => {
      assert.equal(
        didFromUrl({ url: 'https://localhost' }),
        'did:web:localhost'
      )
      assert.equal(
        didFromUrl({ url: 'https://example.com' }),
        'did:web:example.com'
      )
    })

    it('should url-encode host', () => {
      assert.equal(
        didFromUrl({ url: 'https://localhost:8080' }),
        'did:web:localhost%3A8080'
      )
    })

    it('should leave off the default / path', () => {
      assert.equal(
        didFromUrl({ url: 'https://example.com/' }),
        'did:web:example.com'
      )
    })

    it('should encode path / separators as :', () => {
      assert.equal(
        didFromUrl({ url: 'https://example.com/path/subpath/did.json' }),
        'did:web:example.com:path:subpath'
      )
    })

    it('should drop the default /.well-known/did.json pathname', () => {
      assert.equal(
        didFromUrl({ url: 'https://example.com/.well-known/did.json' }),
        'did:web:example.com'
      )
    })

    it('should url-encode path fragments', () => {
      assert.equal(
        didFromUrl({ url: 'https://example.com/path/some+subpath' }),
        'did:web:example.com:path:some%2Bsubpath'
      )
    })
  })
})
