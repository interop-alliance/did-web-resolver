import { test, expect } from '@playwright/test'

test('did:web conversion helpers work in browser', async ({ page }) => {
  await page.goto('/test/index.html')
  const result = await page.evaluate(async () => {
    const { urlFromDid, didFromUrl } = await import('/src/index.ts')
    return {
      url: urlFromDid({ did: 'did:web:example.com' }),
      did: didFromUrl({ url: 'https://example.com' })
    }
  })
  expect(result.url).toBe('https://example.com/.well-known/did.json')
  expect(result.did).toBe('did:web:example.com')
})
