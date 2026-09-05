import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const DIST_ASSETS = join(process.cwd(), 'dist', 'assets')

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

async function listJsChunks() {
  const files = await readdir(DIST_ASSETS)
  const chunks = []

  for (const file of files) {
    if (!file.endsWith('.js')) continue
    const filePath = join(DIST_ASSETS, file)
    const info = await stat(filePath)
    chunks.push({ name: file, bytes: info.size })
  }

  return chunks.sort((a, b) => b.bytes - a.bytes)
}

async function main() {
  const chunks = await listJsChunks()
  const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.bytes, 0)

  console.log('\n=== Bundle Analysis (dist/assets/*.js) ===\n')
  console.log(`Total JS: ${formatKb(totalBytes)} (${chunks.length} files)\n`)

  console.log('Top 15 largest chunks:')
  for (const chunk of chunks.slice(0, 15)) {
    console.log(`  ${formatKb(chunk.bytes).padStart(10)}  ${chunk.name}`)
  }

  const heavyChunks = chunks.filter(c => c.bytes > 100 * 1024)
  if (heavyChunks.length > 0) {
    console.log('\nChunks >100KB (navigation-critical):')
    for (const chunk of heavyChunks) {
      console.log(`  ${formatKb(chunk.bytes).padStart(10)}  ${chunk.name}`)
    }
  }

  const indexChunk = chunks.find(c => c.name.startsWith('index-'))
  if (indexChunk) {
    console.log(`\nMain entry (index): ${formatKb(indexChunk.bytes)}`)
    console.log('  → Loaded on first visit; high RAM baseline.')
  }

  const chartChunk = chunks.find(c => c.name.startsWith('CartesianChart-'))
  if (chartChunk) {
    console.log(`\nRecharts chunk: ${formatKb(chartChunk.bytes)}`)
    console.log('  → Loaded on first sparkline/chart render; deferred from list pages.')
  }

  console.log('\nRecommendations:')
  console.log('  1. Keep main bundle <500KB — currently high memory pressure')
  console.log('  2. Lazy-load Sparkline/recharts outside dashboard')
  console.log('  3. Stagger idle prefetch to avoid RAM spikes after login')
  console.log('  4. Remove flushSync from navigation click handler')
  console.log('')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
