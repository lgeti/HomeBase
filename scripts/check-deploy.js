// Runs before `npm run deploy` (as "predeploy") and stops it unless this folder matches GitHub's main exactly.
import { execSync } from 'node:child_process'
import { deployProblem } from './deployCheck.js'

const git = (command) => execSync(`git ${command}`, { encoding: 'utf8' }).trim()

try {
  git('fetch --quiet origin main')
} catch {
  console.error('Deploy stopped: could not reach GitHub to check that this folder is up to date.')
  process.exit(1)
}

const problem = deployProblem({
  branch: git('rev-parse --abbrev-ref HEAD'),
  changedFiles: git('status --porcelain').split('\n').filter(Boolean).map((line) => line.slice(3)),
  behind: Number(git('rev-list --count HEAD..origin/main')),
  ahead: Number(git('rev-list --count origin/main..HEAD')),
})

if (problem) {
  console.error(`Deploy stopped: ${problem}`)
  process.exit(1)
}

console.log(`Deploying main at ${git('log -1 --format="%h %s"')}`)
