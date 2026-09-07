import { execSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const extensionsPath = join(root, '.vscode', 'extensions.json')
const { recommendations = [] } = JSON.parse(readFileSync(extensionsPath, 'utf8'))

const cliCandidates = [process.env.EDITOR_CLI, 'cursor', 'code'].filter(Boolean)

function resolveCli() {
  for (const cli of cliCandidates) {
    const result = spawnSync(cli, ['--version'], { stdio: 'ignore', shell: true })
    if (result.status === 0) {
      return cli
    }
  }
  return null
}

const cli = resolveCli()
if (!cli) {
  console.error(
    'Neither Cursor nor VS Code CLI found. Install one and ensure "cursor" or "code" is on PATH.'
  )
  process.exit(1)
}

console.log(`Installing ${recommendations.length} extensions via "${cli}"...\n`)

for (const extensionId of recommendations) {
  console.log(`→ ${extensionId}`)
  execSync(`${cli} --install-extension ${extensionId}`, { stdio: 'inherit', shell: true })
}

console.log('\nDone.')
