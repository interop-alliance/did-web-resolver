/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { assert } from 'chai'

import { DidWebResolver, urlFromDid, didFromUrl } from '../src'

import { Ed25519VerificationKey2020 }
  from '@digitalcredentials/ed25519-verification-key-2020'
import { X25519KeyAgreementKey2020 }
  from '@digitalcredentials/x25519-key-agreement-key-2020'
import { CryptoLD } from 'crypto-ld'

const cryptoLd = new CryptoLD()
cryptoLd.use(Ed25519VerificationKey2020)
cryptoLd.use(X25519KeyAgreementKey2020)

describe('DidWebDriver', () => {
  describe('constructor', () => {
    it('should exist', () => {
      assert(new DidWebResolver())
    })
  })

  describe('publicMethodFor()', () => {
    it('should fetch a public key object for a given purpose', async () => {
      const didWeb = new DidWebResolver({ cryptoLd })
      const url = 'https://example.com'
      const { didDocument } = await didWeb.generate({ url })

      const keyAgreementKey = didWeb.publicMethodFor({
        didDocument, purpose: 'keyAgreement'
      })

      assert.equal(keyAgreementKey.type, 'X25519KeyAgreementKey2020')
    })
  })

  describe('generate()', () => {
    let didWeb: DidWebResolver

    beforeEach(async () => {
      didWeb = new DidWebResolver({ cryptoLd })
    })

    it('should generate using default key map', async () => {
      const url = 'https://example.com'
      const { didDocument, keyPairs } = await didWeb.generate({ url })

      assert.property(didDocument, '@context')
      assert.equal(didDocument.id, 'did:web:example.com')
      assert.equal(didDocument.capabilityInvocation[0].type, 'Ed25519VerificationKey2020')
      assert.equal(didDocument.authentication[0].type, 'Ed25519VerificationKey2020')
      assert.equal(didDocument.assertionMethod[0].type, 'Ed25519VerificationKey2020')
      assert.equal(didDocument.capabilityDelegation[0].type, 'Ed25519VerificationKey2020')

      assert(keyPairs)
    })

    it('should return methodFor convenience function', async () => {
      const url = 'https://example.com'
      const { methodFor } = await didWeb.generate({ url })

      const keyAgreementKey = methodFor({ purpose: 'keyAgreement' })

      assert.property(keyAgreementKey, 'type', 'X25519KeyAgreementKey2020')
      assert.property(keyAgreementKey, 'controller', 'did:web:example.com')
      assert.property(keyAgreementKey, 'publicKeyMultibase')
      assert.property(keyAgreementKey, 'privateKeyMultibase')
    })

    it('should generate from seed', async () => {
      const seed = 'z1AhV1bADy7RepJ64mvH7Kk7htFNGc7EA1WA5nGzLSTWc6o'
      const url = 'https://example.com'
      const { didDocument, methodFor } = await didWeb.generate({ url, seed })

      assert.property(didDocument, 'id', 'did:web:example.com')

      const assertionKey = methodFor({ purpose: 'assertionMethod' })
      assert.property(assertionKey, 'id', 'did:web:example.com#z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB')
      assert.property(assertionKey, 'type', 'Ed25519VerificationKey2020')
      assert.property(assertionKey, 'controller', 'did:web:example.com')
      assert.property(assertionKey, 'publicKeyMultibase', 'z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB')
      assert.property(assertionKey, 'privateKeyMultibase')
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
      assert.equal(error.message, 'DID Method not supported: "did:example:1234".')
    })

    it('should error on pattern did:web:domain/path/subpath', () => {
      const invalidDids = [
        'did:web:example.com/path',
        'did:web:example.com/path/subpath',
        'did:web:example.com/path/subpath?query=string',
        'did:web:example.com/path/subpath#fragment',
        'did:web:example.com/:user:alice'
      ]
      invalidDids.forEach((did) => {
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
      assert.equal(urlFromDid({ did: 'did:web:example.com' }), 'https://example.com/.well-known/did.json')
    })

    it('should url-decode host', () => {
      assert.equal(urlFromDid({ did: 'did:web:localhost%3A8080' }), 'https://localhost:8080/.well-known/did.json')
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
      const url = urlFromDid({ did: 'did:web:w3c-ccg.github.io:user:alice#keyId' })
      assert.equal(url, 'https://w3c-ccg.github.io/user/alice/did.json#keyId')
    })

    it('should preserve hash fragments for dids with optional path and port', () => {
      const url = urlFromDid({ did: 'did:web:example.com%3A3000:user:alice#keyId' })
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
      assert.equal(didFromUrl({ url: 'https://localhost' }), 'did:web:localhost')
      assert.equal(didFromUrl({ url: 'https://example.com' }), 'did:web:example.com')
    })

    it('should url-encode host', () => {
      assert.equal(didFromUrl({ url: 'https://localhost:8080' }), 'did:web:localhost%3A8080')
    })

    it('should leave off the default / path', () => {
      assert.equal(didFromUrl({ url: 'https://example.com/' }), 'did:web:example.com')
    })

    it('should encode path / separators as :', () => {
      assert.equal(didFromUrl({ url: 'https://example.com/path/subpath/did.json' }), 'did:web:example.com:path:subpath')
    })

    it('should drop the default /.well-known/did.json pathname', () => {
      assert.equal(didFromUrl({ url: 'https://example.com/.well-known/did.json' }), 'did:web:example.com')
    })

    it('should url-encode path fragments', () => {
      assert.equal(didFromUrl({ url: 'https://example.com/path/some+subpath' }), 'did:web:example.com:path:some%2Bsubpath')
    })
  })
})
