import {
  DidWebResolver,
  didFromUrl,
  getNode,
  urlFromDid
} from './DidWebResolver.js'
import { assertDomain } from './assertions.js'

const driver = (
  options: { allowList?: string[]; fetchOptions?: any; logger?: any } = {}
): DidWebResolver => {
  return new DidWebResolver(options)
}

export { driver, DidWebResolver, assertDomain, didFromUrl, getNode, urlFromDid }
export type { FromMultibase, KeyPairClass } from './types.js'
