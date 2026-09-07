import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function run(scriptName) {
  const scriptPath = join(root, 'scripts', scriptName)
  const result = spawnSync(process.execPath, [scriptPath], { stdio: 'inherit' })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('Setting up editor extensions...\n')
run('install-editor-extensions.mjs')

console.log('\nApplying editor keybindings...\n')
run('apply-editor-keybindings.mjs')

console.log('\nEditor setup complete.')
