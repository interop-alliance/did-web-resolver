'use strict'

import { DidWebResolver } from '../../src'

import chai from 'chai'
import dirtyChai from 'dirty-chai'
chai.use(dirtyChai)
chai.should()
const { expect } = chai

describe('DidWebResolver', () => {
  describe('constructor', () => {
    it('should exist', () => {
      expect(new DidWebResolver()).to.exist()
    })
  })
})
