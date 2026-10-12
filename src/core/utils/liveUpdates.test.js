import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sectionsToReload } from './liveUpdates.js'

describe('sectionsToReload', () => {
  it('reloads the sections another device changed, once each', () => {
    assert.deepEqual(sectionsToReload({ sections: ['fridge', 'shopping', 'fridge'], clientId: 'other' }, 'me'), ['fridge', 'shopping'])
  })

  it('skips this copy of the app’s own changes and malformed messages', () => {
    assert.deepEqual(sectionsToReload({ sections: ['shopping'], clientId: 'me' }, 'me'), [])
    assert.deepEqual(sectionsToReload({ sections: 'shopping' }, 'me'), [])
    assert.deepEqual(sectionsToReload(null, 'me'), [])
  })
})
