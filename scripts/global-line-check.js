#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const MAX_LINES = 300
const ROOT_DIR = process.cwd()
const SEARCH_DIRS = ['src', 'public', 'scripts']
const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.html']
const EXCLUDED_FILES = []

console.log('🔍 Checking all files for line count...')

let hasErrors = false
let filesChecked = 0
let filesExceedingLimit = 0

function checkFile(filePath) {
  if (EXCLUDED_FILES.some(excluded => filePath.includes(excluded))) {
    return
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lineCount = content.split('\n').length

  filesChecked++

  if (lineCount > MAX_LINES) {
    console.log(`❌ ${filePath}: ${lineCount} lines (exceeds ${MAX_LINES})`)
    hasErrors = true
    filesExceedingLimit++
  }
}

function traverseDirectory(dir) {
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      traverseDirectory(fullPath)
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase()

      if (FILE_EXTENSIONS.includes(ext)) {
        checkFile(fullPath)
      }
    }
  }
}

SEARCH_DIRS.forEach(dir => {
  const fullDirPath = path.join(ROOT_DIR, dir)

  if (fs.existsSync(fullDirPath)) {
    traverseDirectory(fullDirPath)
  }
})

console.log(`\n📊 Results:`)
console.log(`- Files checked: ${filesChecked}`)
console.log(`- Files exceeding limit: ${filesExceedingLimit}`)

if (hasErrors) {
  console.log('\n❌ Some files exceed the line limit. Please split them into smaller files.')
  process.exit(1)
} else {
  console.log('\n✅ All files are within the line limit!')
  process.exit(0)
}
