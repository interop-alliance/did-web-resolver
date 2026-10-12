import {
  DidWebResolver,
  defaultFetchDocument,
  didFromUrl,
  getNode,
  urlFromDid
} from './DidWebResolver.js'
import { assertDomain } from './assertions.js'
import type { DidWebResolverOptions } from './types.js'

const driver = (options: DidWebResolverOptions = {}): DidWebResolver => {
  return new DidWebResolver(options)
}

export {
  driver,
  DidWebResolver,
  assertDomain,
  defaultFetchDocument,
  didFromUrl,
  getNode,
  urlFromDid
}
export type {
  DidWebResolverOptions,
  FetchDocument,
  FromMultibase,
  KeyPairClass
} from './types.js'
