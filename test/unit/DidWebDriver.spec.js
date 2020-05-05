'use strict'

import { DidWebDriver } from '../../src'

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
})
