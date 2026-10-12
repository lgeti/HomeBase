import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deployProblem } from './deployCheck.js'

const upToDate = { branch: 'main', changedFiles: [], behind: 0, ahead: 0 }

describe('deployProblem', () => {
  it('lets an up-to-date, clean main deploy', () => {
    assert.equal(deployProblem(upToDate), null)
  })

  it('stops on another branch', () => {
    assert.match(deployProblem({ ...upToDate, branch: 'feat/x' }), /on "feat\/x", not main/)
  })

  it('stops when files have changed', () => {
    assert.match(deployProblem({ ...upToDate, changedFiles: ['BACKLOG.md'] }), /changes that are not on GitHub \(BACKLOG.md\)/)
    assert.match(deployProblem({ ...upToDate, changedFiles: ['a', 'b', 'c', 'd', 'e', 'f'] }), /a, b, c, d, e, …\)/)
  })

  it('stops when behind or ahead of GitHub', () => {
    assert.match(deployProblem({ ...upToDate, behind: 2 }), /2 commits behind.*git pull --ff-only/)
    assert.match(deployProblem({ ...upToDate, behind: 1 }), /1 commit behind/)
    assert.match(deployProblem({ ...upToDate, ahead: 1 }), /1 commit that is not on GitHub's main. Merge it/)
    assert.match(deployProblem({ ...upToDate, ahead: 3 }), /3 commits that are not/)
  })
})
