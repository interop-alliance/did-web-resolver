import { DidWebResolver, didFromUrl, urlFromDid } from './DidWebResolver.js'

const driver = (options: { cryptoLd?: any, keyMap?: object | undefined, logger?: any } | undefined): DidWebResolver => {
  return new DidWebResolver(options)
}

export { driver, DidWebResolver, didFromUrl, urlFromDid }
