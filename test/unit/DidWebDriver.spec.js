'use strict'

import { DidWebDriver, urlFromDid, didFromUrl } from '../../src'

import chai from 'chai'
import dirtyChai from 'dirty-chai'
chai.use(dirtyChai)
chai.should()
const { expect } = chai

describe('DidWebDriver', () => {
  describe('constructor', () => {
    it('should exist', () => {
      expect(new DidWebDriver()).to.exist()
    })
  })

  describe('urlFromDid', () => {
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
      expect(urlFromDid({ did: 'did:web:example.com:path:some%2Bsubpath' }))
        .to.equal('https://example.com/path/some+subpath')
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
