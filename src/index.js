
import { DidWebResolver, didFromUrl, urlFromDid } from './DidWebResolver.js'

const driver = options => {
  return new DidWebResolver(options)
}

export { driver, DidWebResolver, didFromUrl, urlFromDid }
