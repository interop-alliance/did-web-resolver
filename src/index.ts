
import { DidWebResolver, didFromUrl, urlFromDid } from './DidWebResolver'

const driver = (options: { cryptoLd?: any, keyMap?: object | undefined, logger?: any } | undefined): DidWebResolver => {
  return new DidWebResolver(options)
}

export { driver, DidWebResolver, didFromUrl, urlFromDid }
