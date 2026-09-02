import { existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = join(__dirname, '..')
const systemTempRoot = join(tmpdir(), 'accounting-lighthouse')

function removePathBestEffort(path) {
  if (!existsSync(path)) {
    return true
  }

  try {
    rmSync(path, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
    console.log(`✅ Removed: ${path}`)
    return true
  } catch (error) {
    console.warn(`⚠️  Could not remove ${path}: ${error.message}`)
    return false
  }
}

console.log('Cleaning Lighthouse temp artifacts...\n')
console.log('If removal fails, close headless Chrome in Task Manager, then rerun this command.\n')

let hadCriticalFailures = false

if (!removePathBestEffort(systemTempRoot)) hadCriticalFailures = true
if (!removePathBestEffort(join(workspaceRoot, '.lighthouseci', 'tmp'))) hadCriticalFailures = true
if (!removePathBestEffort(join(workspaceRoot, '.lighthouseci', 'profiles'))) hadCriticalFailures = true

console.log('\nReports in .lighthouseci/report.html are kept.')
console.log('You can run Lighthouse even if a legacy profile folder remains locked.')

if (hadCriticalFailures) {
  process.exitCode = 1
}
