import {
  DidWebResolver,
  didFromUrl,
  getNode,
  urlFromDid
} from './DidWebResolver.js'

const driver = (
  options: { allowList?: string[], fetchOptions?: any, logger?: any } = {}
): DidWebResolver => {
  return new DidWebResolver(options)
}

export { driver, DidWebResolver, didFromUrl, getNode, urlFromDid }
