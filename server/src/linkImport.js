// Turning links into shopping items. Pure functions so they can be tested without the network.
import { normalizeItem, validateItem } from './shopping.js'

export const MAX_IMPORT_ITEMS = 100

// IKEA item numbers: 8 digits, sometimes with an "s" in front for combinations
const IKEA_ITEM = /^s?\d{8}$/i

const isIkeaHost = (hostname) => hostname === 'ikea.com' || hostname.endsWith('.ikea.com')

const toUrl = (value) => {
  try {
    return new URL(String(value).trim())
  } catch {
    return null
  }
}

// A shared IKEA favourites list: every item number and quantity is in the link itself, e.g.
// https://www.ikea.com/si/sl/favourites/receive-share/10401484:1,20620061:2?source=favourites
export const parseIkeaShareLink = (link) => {
  const url = toUrl(link)
  if (!url || !isIkeaHost(url.hostname)) return null

  const match = url.pathname.match(/^\/([a-z]{2})\/([a-z]{2})\/favourites\/receive-share\/([^/]+)/i)
  if (!match) return null

  const [, country, language, list] = match
  const items = decodeURIComponent(list)
    .split(',')
    .map((entry) => {
      const [itemNumber, quantity] = entry.split(':')
      const count = Number.parseInt(quantity, 10)
      return { itemNumber: itemNumber?.trim(), quantity: Number.isInteger(count) && count > 0 ? Math.min(count, 99) : 1 }
    })
    .filter((item) => IKEA_ITEM.test(item.itemNumber || ''))
    .slice(0, MAX_IMPORT_ITEMS)

  return items.length ? { country: country.toLowerCase(), language: language.toLowerCase(), items } : null
}

export const ikeaProductUrl = ({ country, language, itemNumber }) =>
  `https://www.ikea.com/${country}/${language}/p/-${itemNumber.toLowerCase()}/`

// The item number of an IKEA product page, e.g. .../p/vivalla-stojalo-za-tablico-bambusov-furnir-10401484/
export const ikeaItemNumber = (link) => {
  const url = toUrl(link)
  if (!url || !isIkeaHost(url.hostname)) return null
  return url.pathname.match(/\/p\/(?:[^/]*-)?(s?\d{8})\/?$/i)?.[1].toLowerCase() || null
}

// What identifies a product, so importing it twice adds to its quantity instead of a duplicate
export const sourceKeyFor = (link) => {
  const itemNumber = ikeaItemNumber(link)
  if (itemNumber) return `ikea:${itemNumber}`
  const url = toUrl(link)
  if (!url) return null
  return `${url.hostname.toLowerCase().replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}`.slice(0, 500)
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

const decodeEntities = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const value = code[1].toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10)
      return Number.isFinite(value) ? String.fromCodePoint(value) : whole
    }
    return ENTITIES[code.toLowerCase()] ?? whole
  })

const metaContent = (html, key) => {
  const tags = html.match(/<meta\s[^>]*>/gi) || []
  for (const tag of tags) {
    const name = tag.match(/\s(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1]
    if (name?.toLowerCase() === key) {
      const content = tag.match(/\scontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\scontent\s*=\s*'([^']*)'/i)?.[1]
      if (content) return decodeEntities(content).trim()
    }
  }
  return null
}

// Every Product described in the page's JSON-LD blocks, including ones inside @graph
const jsonLdProducts = (html) => {
  const products = []
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    const types = [].concat(node['@type'] || [])
    if (types.includes('Product')) products.push(node)
    if (node['@graph']) visit(node['@graph'])
  }
  for (const block of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(block[1]))
    } catch {
      // A broken block is skipped; the meta tags are the fallback
    }
  }
  return products
}

const firstImage = (image) => {
  const value = [].concat(image || [])[0]
  if (!value) return null
  return typeof value === 'string' ? value : value.contentUrl || value.url || null
}

const toPrice = (value) => {
  const number = Number.parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(number) && number >= 0 ? number : null
}

// The price to pay: offers.price, or on a sale the priceSpecification that is not the struck-through old price
const firstPrice = (offers) => {
  for (const offer of [].concat(offers || [])) {
    const direct = toPrice(offer?.price ?? offer?.lowPrice)
    if (direct !== null) return direct
    const current = [].concat(offer?.priceSpecification || [])
      .find((spec) => !String(spec?.priceType || '').includes('StrikethroughPrice') && toPrice(spec?.price) !== null)
    if (current) return toPrice(current.price)
  }
  return null
}

const httpsUrl = (value, pageUrl) => {
  if (!value) return null
  try {
    const url = new URL(value, pageUrl)
    return url.protocol === 'https:' && url.href.length <= 2000 ? url.href : null
  } catch {
    return null
  }
}

// " - IKEA", " | Temu" and similar shop names at the end of a page title
const cleanName = (name) =>
  name
    .replace(/\s+/g, ' ')
    .replace(/\s+[-|–]\s+(IKEA|Temu|AliExpress|Amazon(\.[a-z.]+)?)\s*$/i, '')
    .trim()
    .slice(0, 120)

// Name, price and photo of a product page, from its JSON-LD Product or its og: meta tags
export const parseProductPage = (html, pageUrl) => {
  const product = jsonLdProducts(html)[0]
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
  const name = product?.name || metaContent(html, 'og:title') || metaContent(html, 'twitter:title') || (title && decodeEntities(title))
  const metaPrice = toPrice(metaContent(html, 'product:price:amount') || metaContent(html, 'og:price:amount'))

  return {
    name: name ? cleanName(decodeEntities(String(name))) : null,
    price: firstPrice(product?.offers) ?? metaPrice,
    imageUrl: httpsUrl(firstImage(product?.image) || metaContent(html, 'og:image'), pageUrl),
  }
}

// A readable guess from the address when a shop does not let us read the page,
// e.g. .../wireless-earbuds-bluetooth-g-601099512345.html -> "Wireless earbuds bluetooth"
export const nameFromUrl = (link) => {
  const url = toUrl(link)
  if (!url) return ''
  const segment = url.pathname.split('/').filter(Boolean).pop() || ''
  const words = decodeURIComponent(segment)
    .replace(/\.(html?|php|aspx?)$/i, '')
    .split(/[-_+\s]+/)
  while (words.length && (/\d{4,}/.test(words.at(-1)) || words.at(-1).length <= 1)) words.pop()
  const text = words.join(' ').trim()
  return text ? (text[0].toUpperCase() + text.slice(1)).slice(0, 120) : ''
}

// Importing an item that is already on the list adds the quantities when both are plain numbers
export const mergeQuantity = (existing, added) => {
  const current = existing ? String(existing).trim() : '1'
  const extra = added ? String(added).trim() : '1'
  return /^\d+$/.test(current) && /^\d+$/.test(extra) ? String(Number(current) + Number(extra)) : existing
}

// Addresses the server must never fetch: loopback, private networks, link-local and the like
export const isPrivateAddress = (address) => {
  const ip = address.toLowerCase().replace(/^::ffff:(?=\d+\.)/, '')
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (v4) {
    const [a, b] = v4.slice(1).map(Number)
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
  }
  return ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith('::ffff:')
}

// The columns for one item the app confirmed from a preview. Imported items are always to buy.
export const normalizeImportedItem = (raw, listId) => {
  const item = normalizeItem({
    listId,
    kind: 'buy',
    name: raw?.name,
    quantity: raw?.quantity === undefined || raw?.quantity === null ? '' : String(raw.quantity),
    price: raw?.price,
    link: raw?.link,
  })
  const imageUrl = typeof raw?.imageUrl === 'string' ? raw.imageUrl.trim() : ''
  const sourceKey = typeof raw?.sourceKey === 'string' ? raw.sourceKey.trim().slice(0, 500) : ''
  return { ...item, image_url: imageUrl || null, source_key: sourceKey || null }
}

export const validateImportedItem = (item) => {
  if (item.image_url && (item.image_url.length > 2000 || !/^https:\/\/[^\s]+$/i.test(item.image_url))) return 'Photos must be https links'
  return validateItem(item)
}
