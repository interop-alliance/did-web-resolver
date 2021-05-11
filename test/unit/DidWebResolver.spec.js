import chai from 'chai'
import dirtyChai from 'dirty-chai'

import { DidWebResolver, urlFromDid, didFromUrl } from '../../src'

import { Ed25519VerificationKey2020 }
  from '@digitalbazaar/ed25519-verification-key-2020'
import { X25519KeyAgreementKey2020 }
  from '@digitalbazaar/x25519-key-agreement-key-2020'
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

    it('should convert first id fragment to pathname plus default path', () => {
      expect(urlFromDid({ did: 'did:web:example.com' }))
        .to.equal('https://example.com/.well-known/did.json')
    })

    it('should url-decode host', () => {
      expect(urlFromDid({ did: 'did:web:localhost%3A8080' }))
        .to.equal('https://localhost:8080/.well-known/did.json')
    })

    it('should url-decode path fragments', () => {
      expect(urlFromDid({ did: 'did:web:example.com/path/some%2Bsubpath' }))
        .to.equal('https://example.com/path/some+subpath')
    })

    it('should preserve hash fragments for dids without paths', () => {
      const url = urlFromDid({ did: 'did:web:localhost%3A8080#keyId' })
      expect(url).to.equal('https://localhost:8080/.well-known/did.json#keyId')
    })

    it('should preserve hash fragments for dids with paths', () => {
      const url = urlFromDid({ did: 'did:web:example.com/path/some%2Bsubpath#keyId' })
      expect(url).to.equal('https://example.com/path/some+subpath#keyId')
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
