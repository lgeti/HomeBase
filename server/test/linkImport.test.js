import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ikeaItemNumber,
  ikeaProductUrl,
  isPrivateAddress,
  mergeQuantity,
  normalizeImportedItem,
  nameFromUrl,
  parseIkeaShareLink,
  parseProductPage,
  sourceKeyFor,
  validateImportedItem,
} from '../src/linkImport.js'

describe('parseIkeaShareLink', () => {
  it('reads every item number and quantity from a shared favourites link', () => {
    const share = parseIkeaShareLink('https://www.ikea.com/si/sl/favourites/receive-share/10401484:1,20620061:3,s49329542:1?source=favourites')
    assert.deepEqual(share, {
      country: 'si',
      language: 'sl',
      items: [
        { itemNumber: '10401484', quantity: 1 },
        { itemNumber: '20620061', quantity: 3 },
        { itemNumber: 's49329542', quantity: 1 },
      ],
    })
  })

  it('defaults missing quantities to 1 and skips anything that is not an item number', () => {
    const share = parseIkeaShareLink('https://www.ikea.com/de/de/favourites/receive-share/10401484,abc:2,1234:1')
    assert.deepEqual(share.items, [{ itemNumber: '10401484', quantity: 1 }])
  })

  it('ignores other links', () => {
    assert.equal(parseIkeaShareLink('https://www.ikea.com/si/sl/p/vivalla-10401484/'), null)
    assert.equal(parseIkeaShareLink('https://evil.example/si/sl/favourites/receive-share/10401484:1'), null)
    assert.equal(parseIkeaShareLink('not a link'), null)
  })
})

describe('IKEA product links', () => {
  it('builds a product page address from an item number', () => {
    assert.equal(ikeaProductUrl({ country: 'si', language: 'sl', itemNumber: 'S49329542' }), 'https://www.ikea.com/si/sl/p/-s49329542/')
  })

  it('finds the item number in a product link', () => {
    assert.equal(ikeaItemNumber('https://www.ikea.com/si/sl/p/vivalla-stojalo-za-tablico-bambusov-furnir-10401484/'), '10401484')
    assert.equal(ikeaItemNumber('https://www.ikea.com/si/sl/p/-10401484'), '10401484')
    assert.equal(ikeaItemNumber('https://www.temu.com/p/thing-10401484/'), null)
  })
})

describe('sourceKeyFor', () => {
  it('uses the IKEA item number, or the page address without tracking', () => {
    assert.equal(sourceKeyFor('https://www.ikea.com/si/sl/p/vivalla-10401484/?utm=x'), 'ikea:10401484')
    assert.equal(sourceKeyFor('https://www.Temu.com/uk/earbuds-g-601099.html?_x_ads=1#top'), 'temu.com/uk/earbuds-g-601099.html')
  })
})

describe('parseProductPage', () => {
  const page = (body) => `<html><head>${body}</head><body></body></html>`

  it('prefers the JSON-LD product', () => {
    const html = page(`
      <meta property="og:title" content="Fallback - IKEA">
      <script type="application/ld+json">{"@type":"BreadcrumbList"}</script>
      <script type="application/ld+json">{"@type":"Product","name":"VIVALLA Stojalo za tablico","image":[{"@type":"ImageObject","contentUrl":"https://www.ikea.com/img.jpg"}],"offers":{"@type":"Offer","price":"12.99"}}</script>`)
    assert.deepEqual(parseProductPage(html, 'https://www.ikea.com/si/sl/p/x/'), {
      name: 'VIVALLA Stojalo za tablico', price: 12.99, imageUrl: 'https://www.ikea.com/img.jpg',
    })
  })

  it('takes the sale price, not the struck-through one', () => {
    const html = page(`<script type="application/ld+json">{"@type":"Product","name":"ALEX","offers":{"priceSpecification":[
      {"@type":"UnitPriceSpecification","price":"80","priceType":"https://schema.org/StrikethroughPrice"},
      {"@type":"UnitPriceSpecification","price":"65"}]}}</script>`)
    assert.equal(parseProductPage(html, 'https://www.ikea.com/').price, 65)
  })

  it('falls back to meta tags and the title, decoding entities and dropping the shop name', () => {
    const html = page(`
      <title>Ignored</title>
      <meta content="Socks &amp; slippers | Temu" property="og:title">
      <meta property="og:image" content="/images/socks.jpg">
      <meta property="product:price:amount" content="4,50">`)
    assert.deepEqual(parseProductPage(html, 'https://www.temu.com/socks.html'), {
      name: 'Socks & slippers', price: 4.5, imageUrl: 'https://www.temu.com/images/socks.jpg',
    })
  })

  it('finds products inside @graph and survives broken JSON-LD', () => {
    const html = page(`
      <script type="application/ld+json">{ broken</script>
      <script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":["Product"],"name":"Lamp","image":"https://shop.example/lamp.png"}]}</script>`)
    assert.deepEqual(parseProductPage(html, 'https://shop.example/lamp'), { name: 'Lamp', price: null, imageUrl: 'https://shop.example/lamp.png' })
  })

  it('only keeps https photos', () => {
    const html = page('<meta property="og:title" content="Mug"><meta property="og:image" content="http://cdn.example/mug.jpg">')
    assert.equal(parseProductPage(html, 'https://shop.example/mug').imageUrl, null)
  })
})

describe('nameFromUrl', () => {
  it('guesses a readable name when the page cannot be read', () => {
    assert.equal(nameFromUrl('https://www.temu.com/uk/wireless-earbuds-bluetooth-g-601099512345.html?x=1'), 'Wireless earbuds bluetooth')
    assert.equal(nameFromUrl('https://www.aliexpress.com/item/1005006123456789.html'), '')
    assert.equal(nameFromUrl('https://shop.example/'), '')
  })
})

describe('mergeQuantity', () => {
  it('adds plain numbers and treats an empty quantity as one', () => {
    assert.equal(mergeQuantity('2', '1'), '3')
    assert.equal(mergeQuantity(null, '2'), '3')
    assert.equal(mergeQuantity('2 packs', '1'), '2 packs')
  })
})

describe('isPrivateAddress', () => {
  it('blocks loopback, private and link-local addresses', () => {
    for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      assert.equal(isPrivateAddress(address), true, address)
    }
  })

  it('allows public addresses', () => {
    for (const address of ['23.45.67.89', '172.32.0.1', '2a02:26f0::1']) {
      assert.equal(isPrivateAddress(address), false, address)
    }
  })
})

describe('normalizeImportedItem', () => {
  it('makes an open item to buy with its photo and source', () => {
    const item = normalizeImportedItem({
      name: ' VIVALLA ', quantity: 2, price: 12.99, link: 'https://www.ikea.com/si/sl/p/-10401484/', imageUrl: 'https://www.ikea.com/a.jpg', sourceKey: 'ikea:10401484', kind: 'sell',
    }, 'l1')
    assert.deepEqual(item, {
      list_id: 'l1', name: 'VIVALLA', kind: 'buy', status: 'open', quantity: '2', price: 12.99,
      link: 'https://www.ikea.com/si/sl/p/-10401484/', note: null, image_url: 'https://www.ikea.com/a.jpg', source_key: 'ikea:10401484',
    })
    assert.equal(validateImportedItem(item), null)
  })

  it('rejects photos that are not https and items without a name', () => {
    assert.match(validateImportedItem(normalizeImportedItem({ name: 'Mug', imageUrl: 'javascript:alert(1)' }, 'l1')), /https/)
    assert.match(validateImportedItem(normalizeImportedItem({ name: '' }, 'l1')), /Enter what/)
  })
})
