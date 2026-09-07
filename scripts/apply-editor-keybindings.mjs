import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const referencePath = join(root, '.vscode', 'keybindings.reference.json')
const reference = JSON.parse(readFileSync(referencePath, 'utf8'))

function resolveUserKeybindingsPath() {
  const appData = process.env.APPDATA
  const home = homedir()

  const candidates = [
    appData && join(appData, 'Cursor', 'User', 'keybindings.json'),
    appData && join(appData, 'Code', 'User', 'keybindings.json'),
    join(home, '.config', 'Cursor', 'User', 'keybindings.json'),
    join(home, '.config', 'Code', 'User', 'keybindings.json'),
    join(home, 'Library', 'Application Support', 'Cursor', 'User', 'keybindings.json'),
    join(home, 'Library', 'Application Support', 'Code', 'User', 'keybindings.json')
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  const fallback = candidates[0]
  if (!fallback) {
    throw new Error('Could not determine editor keybindings path for this platform.')
  }

  mkdirSync(dirname(fallback), { recursive: true })
  writeFileSync(fallback, '[]\n', 'utf8')
  return fallback
}

function bindingKey(entry) {
  return `${entry.command}::${entry.key}::${entry.when ?? ''}`
}

const targetPath = resolveUserKeybindingsPath()
const existing = JSON.parse(readFileSync(targetPath, 'utf8'))
const known = new Set(existing.map(bindingKey))
const toAdd = reference.filter(entry => !known.has(bindingKey(entry)))

if (toAdd.length === 0) {
  console.log(`No new keybindings to add (${targetPath}).`)
  process.exit(0)
}

const merged = [...existing, ...toAdd]
writeFileSync(targetPath, `${JSON.stringify(merged, null, '\t')}\n`, 'utf8')

console.log(`Added ${toAdd.length} keybinding(s) to ${targetPath}:`)
for (const entry of toAdd) {
  console.log(`  ${entry.key} → ${entry.command}`)
}
