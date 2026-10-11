import express from 'express'
import { fetchPage, PageError } from '../fetchPage.js'
import { sendError } from '../http.js'
import {
  ikeaProductUrl,
  MAX_IMPORT_ITEMS,
  mergeQuantity,
  nameFromUrl,
  normalizeImportedItem,
  parseIkeaShareLink,
  parseProductPage,
  sourceKeyFor,
  validateImportedItem,
} from '../linkImport.js'
import { requireAuth, requireHouseholdMember } from '../middleware.js'
import { OPEN_STATUS } from '../shopping.js'
import { supabase } from '../supabase.js'

const router = express.Router()
const base = '/api/households/:householdId/shopping-lists/:listId'

const findList = (householdId, listId) =>
  supabase
    .from('shopping_lists')
    .select('list_id')
    .eq('household_id', householdId)
    .eq('list_id', listId)
    .is('deleted_at_utc', null)
    .maybeSingle()

// Reads one product page. A page we cannot read still gives an item: the link, and a name guessed from it.
const readProduct = async (link, quantity = 1) => {
  try {
    const page = await fetchPage(link)
    const product = parseProductPage(page.html, page.url)
    return {
      name: product.name || nameFromUrl(link),
      quantity: String(quantity),
      price: product.price,
      link: page.url,
      imageUrl: product.imageUrl,
      sourceKey: sourceKeyFor(page.url) || sourceKeyFor(link),
      found: Boolean(product.name),
    }
  } catch (error) {
    if (!(error instanceof PageError)) console.error('Link import failed:', error.message)
    return { name: nameFromUrl(link), quantity: String(quantity), price: null, link, imageUrl: null, sourceKey: sourceKeyFor(link), found: false }
  }
}

// Runs `work` over `values`, a few at a time, keeping their order
const mapLimited = async (values, limit, work) => {
  const results = new Array(values.length)
  let next = 0
  const worker = async () => {
    while (next < values.length) {
      const index = next++
      results[index] = await work(values[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker))
  return results
}

// What a link would add, without saving anything: a shared IKEA list gives all its items, any other link one item
router.post(`${base}/import-preview`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, listId } = request.params
  const link = typeof request.body.url === 'string' ? request.body.url.trim() : ''

  let url
  try {
    url = new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`)
  } catch {
    return sendError(response, 400, 'Paste a link that starts with https://')
  }

  const { data: list, error: listError } = await findList(householdId, listId)
  if (listError) return sendError(response, 500, listError.message)
  if (!list) return sendError(response, 404, 'List not found')

  const share = parseIkeaShareLink(url.href)
  if (share) {
    const items = await mapLimited(share.items, 4, (item) =>
      readProduct(ikeaProductUrl({ ...share, itemNumber: item.itemNumber }), item.quantity))
    return response.json({ kind: 'list', items })
  }

  if (url.protocol !== 'https:') return sendError(response, 400, 'Only https links can be imported')
  response.json({ kind: 'product', items: [await readProduct(url.href)] })
})

// Saves the items the person kept from a preview. An item already open on the list (same product)
// gets the quantities added instead of a duplicate.
router.post(`${base}/import`, requireAuth, requireHouseholdMember, async (request, response) => {
  const { householdId, listId } = request.params
  const rawItems = Array.isArray(request.body.items) ? request.body.items : []
  if (rawItems.length === 0) return sendError(response, 400, 'Choose at least one item to import')
  if (rawItems.length > MAX_IMPORT_ITEMS) return sendError(response, 400, `At most ${MAX_IMPORT_ITEMS} items can be imported at once`)

  const items = rawItems.map((raw) => normalizeImportedItem(raw, listId))
  const invalid = items.map(validateImportedItem).find(Boolean)
  if (invalid) return sendError(response, 400, invalid)

  const { data: list, error: listError } = await findList(householdId, listId)
  if (listError) return sendError(response, 500, listError.message)
  if (!list) return sendError(response, 404, 'List not found')

  const sourceKeys = items.map((item) => item.source_key).filter(Boolean)
  const { data: existing, error: existingError } = sourceKeys.length
    ? await supabase
      .from('shopping_items')
      .select('*')
      .eq('household_id', householdId)
      .eq('list_id', listId)
      .eq('status', OPEN_STATUS.buy)
      .in('source_key', sourceKeys)
      .is('deleted_at_utc', null)
    : { data: [], error: null }
  if (existingError) return sendError(response, 500, existingError.message)

  const bySource = new Map(existing.map((item) => [item.source_key, item]))
  const saved = []
  let merged = 0

  for (const item of items) {
    const match = item.source_key ? bySource.get(item.source_key) : null
    const { data, error } = match
      ? await supabase
        .from('shopping_items')
        .update({ quantity: mergeQuantity(match.quantity, item.quantity), updated_at_utc: new Date().toISOString() })
        .eq('item_id', match.item_id)
        .select()
        .single()
      : await supabase
        .from('shopping_items')
        .insert({ ...item, household_id: householdId, added_by_member_id: request.householdMember.household_member_id })
        .select()
        .single()

    if (error) return sendError(response, 400, error.message)
    if (match) merged += 1
    // The same product twice in one import adds up too
    if (data.source_key) bySource.set(data.source_key, data)
    saved.push(data)
  }

  // Each item once, as it ended up
  const latest = new Map(saved.map((item) => [item.item_id, item]))
  response.status(201).json({ items: [...latest.values()], added: saved.length - merged, merged })
})

export default router
