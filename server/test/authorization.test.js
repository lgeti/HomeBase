import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canInvite, canRemoveMember } from '../src/authorization.js'

const member = (id, role) => ({ household_member_id: id, role })
const owner = member('owner-1', 'owner')
const admin = member('admin-1', 'admin')
const otherAdmin = member('admin-2', 'admin')
const regular = member('member-1', 'member')
const otherRegular = member('member-2', 'member')

describe('canInvite', () => {
  it('lets owners invite admins and members', () => {
    assert.equal(canInvite('owner', 'admin'), true)
    assert.equal(canInvite('owner', 'member'), true)
  })

  it('lets admins invite members but not admins', () => {
    assert.equal(canInvite('admin', 'member'), true)
    assert.equal(canInvite('admin', 'admin'), false)
  })

  it('does not let members invite anyone', () => {
    assert.equal(canInvite('member', 'member'), false)
    assert.equal(canInvite('member', 'admin'), false)
  })

  it('never allows inviting someone as owner', () => {
    assert.equal(canInvite('owner', 'owner'), false)
  })
})

describe('canRemoveMember', () => {
  it('never allows removing the owner', () => {
    assert.equal(canRemoveMember(admin, owner), false)
    assert.equal(canRemoveMember(regular, owner), false)
    assert.equal(canRemoveMember(owner, owner), false)
  })

  it('lets owners remove admins and members', () => {
    assert.equal(canRemoveMember(owner, admin), true)
    assert.equal(canRemoveMember(owner, regular), true)
  })

  it('lets admins remove members but not other admins', () => {
    assert.equal(canRemoveMember(admin, regular), true)
    assert.equal(canRemoveMember(admin, otherAdmin), false)
  })

  it('does not let members remove anyone', () => {
    assert.equal(canRemoveMember(regular, otherRegular), false)
    assert.equal(canRemoveMember(regular, admin), false)
  })

  it('does not let anyone remove themselves through this path', () => {
    assert.equal(canRemoveMember(admin, admin), false)
  })

  it('rejects missing actor or target', () => {
    assert.equal(canRemoveMember(null, regular), false)
    assert.equal(canRemoveMember(owner, null), false)
  })
})
