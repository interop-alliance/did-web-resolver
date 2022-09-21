import chai from 'chai'
import dirtyChai from 'dirty-chai'

import { DidWebResolver, urlFromDid, didFromUrl } from '../../src'

import { Ed25519VerificationKey2020 }
  from '@digitalcredentials/ed25519-verification-key-2020'
import { X25519KeyAgreementKey2020 }
  from '@digitalcredentials/x25519-key-agreement-key-2020'
import { CryptoLD } from 'crypto-ld'
chai.use(dirtyChai)
chai.should()
const { expect } = chai

const cryptoLd = new CryptoLD()
cryptoLd.use(Ed25519VerificationKey2020)
cryptoLd.use(X25519KeyAgreementKey2020)

describe('DidWebDriver', () => {
  describe('constructor', () => {
    it('should exist', () => {
      expect(new DidWebResolver()).to.exist()
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

      expect(keyAgreementKey.type).to.equal('X25519KeyAgreementKey2020')
    })
  })

  describe('generate()', () => {
    let didWeb

    beforeEach(async () => {
      didWeb = new DidWebResolver({ cryptoLd })
    })

    it('should generate using default key map', async () => {
      const url = 'https://example.com'
      const { didDocument, keyPairs } = await didWeb.generate({ url })

      expect(didDocument).to.have.property('@context')
      expect(didDocument.id).to.equal('did:web:example.com')
      expect(didDocument.capabilityInvocation[0].type)
        .to.equal('Ed25519VerificationKey2020')
      expect(didDocument.authentication[0].type)
        .to.equal('Ed25519VerificationKey2020')
      expect(didDocument.assertionMethod[0].type)
        .to.equal('Ed25519VerificationKey2020')
      expect(didDocument.capabilityDelegation[0].type)
        .to.equal('Ed25519VerificationKey2020')

      expect(keyPairs).to.exist()
    })

    it('should return methodFor convenience function', async () => {
      const url = 'https://example.com'
      const { methodFor } = await didWeb.generate({ url })

      const keyAgreementKey = methodFor({ purpose: 'keyAgreement' })

      expect(keyAgreementKey).to.have.property('type', 'X25519KeyAgreementKey2020')
      expect(keyAgreementKey).to.have.property('controller', 'did:web:example.com')
      expect(keyAgreementKey).to.have.property('publicKeyMultibase')
      expect(keyAgreementKey).to.have.property('privateKeyMultibase')
    })

    it('should generate from seed', async () => {
      const seed = 'z1AhV1bADy7RepJ64mvH7Kk7htFNGc7EA1WA5nGzLSTWc6o'
      const url = 'https://example.com'
      const { didDocument, methodFor } = await didWeb.generate({ url, seed })

      expect(didDocument).to.have.property('id', 'did:web:example.com')

      const assertionKey = methodFor({ purpose: 'assertionMethod' })
      expect(assertionKey).to.have.property('id', 'did:web:example.com#z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB')
      expect(assertionKey).to.have.property('type', 'Ed25519VerificationKey2020')
      expect(assertionKey).to.have.property('controller', 'did:web:example.com')
      expect(assertionKey).to.have.property('publicKeyMultibase', 'z6MkmDMjfkjs9XPCN1LfoQQRHz1mJ8PEdiVYC66XKhj3wGyB')
      expect(assertionKey).to.have.property('privateKeyMultibase')
    })
  })

  describe('urlFromDid()', () => {
    it('should error on missing did', () => {
      let error
      try {
        urlFromDid()
      } catch (e) {
        error = e
      }
      expect(error.message).to.equal('Cannot convert did to url, missing did.')
    })

    it('should error on non-did:web dids', () => {
      let error
      try {
        urlFromDid({ did: 'did:example:1234' })
      } catch (e) {
        error = e
      }
      expect(error.message)
        .to.equal('DID Method not supported: "did:example:1234".')
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
        } catch (e) {
          error = e
        }
        if (error) {
          expect(error.message)
            .to.contain('domain-name cannot contain a path.')
        } else {
          expect.fail('should have thrown error for did: ' + did)
        }
      })
    })

    it('should convert first id fragment to pathname plus default path', () => {
      expect(urlFromDid({ did: 'did:web:example.com' }))
        .to.equal('https://example.com/.well-known/did.json')
    })

    it('should url-decode host', () => {
      expect(urlFromDid({ did: 'did:web:localhost%3A8080' }))
        .to.equal('https://localhost:8080/.well-known/did.json')
    })

    it('should preserve hash fragments for dids without paths', () => {
      const url = urlFromDid({ did: 'did:web:localhost%3A8080#keyId' })
      expect(url).to.equal('https://localhost:8080/.well-known/did.json#keyId')
    })

    // See: https://w3c-ccg.github.io/did-method-web/#example-creating-the-did-with-optional-path
    it('should work with optional path', () => {
      const url = urlFromDid({ did: 'did:web:w3c-ccg.github.io:user:alice' })
      expect(url).to.equal('https://w3c-ccg.github.io/user/alice/did.json')
    })

    // See: https://w3c-ccg.github.io/did-method-web/#example-creating-the-did-with-optional-path-and-port
    it('should work with optional path and port', () => {
      const url = urlFromDid({ did: 'did:web:example.com%3A3000:user:alice' })
      expect(url).to.equal('https://example.com:3000/user/alice/did.json')
    })

    it('should preserve hash fragments for dids with optional path', () => {
      const url = urlFromDid({ did: 'did:web:w3c-ccg.github.io:user:alice#keyId' })
      expect(url).to.equal('https://w3c-ccg.github.io/user/alice/did.json#keyId')
    })

    it('should preserve hash fragments for dids with optional path and port', () => {
      const url = urlFromDid({ did: 'did:web:example.com%3A3000:user:alice#keyId' })
      expect(url).to.equal('https://example.com:3000/user/alice/did.json#keyId')
    })
  })

  describe('didFromUrl', () => {
    it('should error on missing url', () => {
      let error
      try {
        didFromUrl()
      } catch (e) {
        error = e
      }
      expect(error.message).to.equal('Cannot convert url to did, missing url.')
    })

    it('should error on http URLs', () => {
      let error
      try {
        didFromUrl({ url: 'http://example.com' })
      } catch (e) {
        error = e
      }
      expect(error.message).to.equal('did:web does not support non-HTTPS URLs.')
    })

    it('should error on invalid URLs', () => {
      let error
      try {
        didFromUrl({ url: 'non-url' })
      } catch (e) {
        error = e
      }
      expect(error.message).to.equal('Invalid url: "non-url".')
    })

    it('should convert host to did identifier', () => {
      expect(didFromUrl({ url: 'https://localhost' }))
        .to.equal('did:web:localhost')
      expect(didFromUrl({ url: 'https://example.com' }))
        .to.equal('did:web:example.com')
    })

    it('should url-encode host', () => {
      expect(didFromUrl({ url: 'https://localhost:8080' }))
        .to.equal('did:web:localhost%3A8080')
    })

    it('should leave off the default / path', () => {
      expect(didFromUrl({ url: 'https://example.com/' }))
        .to.equal('did:web:example.com')
    })

    it('should encode path / separators as :', () => {
      expect(didFromUrl({ url: 'https://example.com/path/subpath/did.json' }))
        .to.equal('did:web:example.com:path:subpath:did.json')
    })

    it('should drop the default /.well-known/did.json pathname', () => {
      expect(didFromUrl({ url: 'https://example.com/.well-known/did.json' }))
        .to.equal('did:web:example.com')
    })

    it('should url-encode path fragments', () => {
      expect(didFromUrl({ url: 'https://example.com/path/some+subpath' }))
        .to.equal('did:web:example.com:path:some%2Bsubpath')
    })
  })
})
