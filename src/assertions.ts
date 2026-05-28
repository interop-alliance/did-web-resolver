/**
 * Assertions guarding the resolver's network path: that a fetch target is an
 * HTTPS URL, that an identifier is a well-formed `did:web` DID, and that a
 * target host is permitted by an optional allow list (SSRF gate).
 */

/**
 * Asserts that the given value is an HTTPS URL.
 *
 * @param url {URL|string} - The URL to check.
 *
 * @throws {TypeError} If the value is not a URL or its protocol is not https.
 */
export function assertHttpsUrl (url: URL | string): void {
  const parsed = assertUrl(url)
  if (parsed.protocol !== 'https:') {
    throw new TypeError(
      `"url" protocol must be "https:"; received "${parsed.protocol}".`)
  }
}

/**
 * Coerces a string to a `URL`, or returns an existing `URL` instance.
 *
 * @param url {URL|string} - The value to coerce.
 *
 * @returns {URL} The parsed URL.
 */
export function assertUrl (url: URL | string): URL {
  if (url instanceof URL) {
    return url
  }
  if (typeof url === 'string') {
    return new URL(url)
  }
  throw new TypeError('"url" must be a string or a URL.')
}

/**
 * Asserts that a DID is a well-formed `did:web` identifier whose
 * method-specific id (the domain component) does not itself contain a path.
 * Sets `err.code` to `'invalidDid'` or `'methodNotSupported'` where relevant.
 *
 * @param did {string} - The DID to check.
 *
 * @throws {Error} If the DID is missing, malformed, or not a did:web DID.
 */
export function assertDidWebUrl (did: string): void {
  if (!did) {
    throw new TypeError('"did" must be a non-zero length string.')
  }
  if (typeof did !== 'string') {
    throw new TypeError(`Expected DID to be a string; received "${typeof did}".`)
  }
  const [scheme, method, domain] = did.split(':', 3)
  if (scheme !== 'did') {
    const err: any = new Error(`Scheme must be "did"; received "${scheme}".`)
    err.code = 'invalidDid'
    throw err
  }
  if (method !== 'web') {
    const err: any = new Error(
      `DID method must be "web"; received "${method}".`)
    err.code = 'methodNotSupported'
    throw err
  }
  if (!domain) {
    throw new Error('Expected domain to be a non-zero length string.')
  }
  if (domain.includes('/')) {
    throw new Error(
      `Expected domain to not contain a path; received "${domain}".`)
  }
}

/**
 * SSRF gate: asserts that the host of `url` is present in `allowList`. An empty
 * or absent allow list disables the check (all hosts permitted).
 *
 * @param options {object} - Options hashmap.
 * @param [options.allowList] {string[]} - Permitted hosts (e.g. 'example.com'
 *   or 'example.com:3000'). When empty/absent, no restriction is applied.
 * @param options.url {URL|string} - The fetch target URL.
 *
 * @throws {Error} If the host is not in a non-empty allow list.
 */
export function assertDomain (
  { allowList, url }: { allowList?: string[], url: URL | string }
): void {
  if (!allowList || allowList.length === 0) {
    return
  }
  const { host } = assertUrl(url)
  if (allowList.includes(host)) {
    return
  }
  throw new Error(`Domain "${host}" is not allowed.`)
}
