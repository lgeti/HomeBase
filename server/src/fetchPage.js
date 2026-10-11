// Fetches a public web page for link import, refusing anything that could reach private networks.
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { isPrivateAddress } from './linkImport.js'

const TIMEOUT_MS = 8000
const MAX_BYTES = 3 * 1024 * 1024
const MAX_REDIRECTS = 4
// Says who we are instead of pretending to be a browser
const USER_AGENT = 'Mozilla/5.0 (compatible; HomeBase/1.0; +https://lgeti.github.io/HomeBase/)'

export class PageError extends Error {}

const assertPublicUrl = async (url) => {
  if (url.protocol !== 'https:') throw new PageError('Only https links can be imported')
  if (url.username || url.password || (url.port && url.port !== '443')) throw new PageError('That link cannot be imported')

  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true }).catch(() => [])
  if (addresses.length === 0) throw new PageError('That website could not be found')
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new PageError('That link cannot be imported')
}

const readLimited = async (response) => {
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_BYTES) {
      await reader.cancel()
      break
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

// Returns { html, url } where url is the address after redirects
export const fetchPage = async (link) => {
  let url = new URL(link)

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertPublicUrl(url)

    let response
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en' },
      })
    } catch {
      throw new PageError('The website did not answer')
    }

    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url)
      continue
    }
    if (!response.ok) throw new PageError(`The website refused the request (${response.status})`)
    if (!(response.headers.get('content-type') || '').includes('html')) throw new PageError('That link is not a web page')

    return { html: await readLimited(response), url: url.href }
  }

  throw new PageError('Too many redirects')
}
