// Why a deploy should not go ahead, or null when it is safe. Pure so it can be tested.
// `npm run deploy` publishes whatever is in this folder, so it must be exactly what is on GitHub's main.
export const deployProblem = ({ branch, changedFiles, behind, ahead }) => {
  if (branch !== 'main') return `This folder is on "${branch}", not main. Switch to main first: git switch main`
  if (changedFiles.length) return `This folder has changes that are not on GitHub (${changedFiles.slice(0, 5).join(', ')}${changedFiles.length > 5 ? ', …' : ''}). Commit them through a PR or undo them first.`
  if (behind > 0) return `This folder is ${behind} commit${behind === 1 ? '' : 's'} behind GitHub's main. Update it first: git pull --ff-only`
  if (ahead > 0) return `This folder has ${ahead} commit${ahead === 1 ? ' that is' : 's that are'} not on GitHub's main. Merge ${ahead === 1 ? 'it' : 'them'} through a PR first.`
  return null
}
