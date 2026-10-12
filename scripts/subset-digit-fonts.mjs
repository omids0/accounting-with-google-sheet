/**
 * One-off: builds the digit-only `Vazirmatn FD` subsets in src/assets/fonts/.
 *
 * The app uses `Vazirmatn FD` only for amounts (Latin digits drawn as Persian
 * digits); the full files are ~49 kB per weight. The subsets keep just digits,
 * separators, signs and space; src/styles/fonts.css loads them with a matching
 * `unicode-range`, so every other character falls back to the normal Vazirmatn.
 *
 * Source: node_modules/vazirmatn/misc/Farsi-Digits/fonts/ttf/Vazirmatn-FD-<Weight>.ttf
 * Rerun (after a `vazirmatn` upgrade, or to change weights or characters):
 *   node scripts/subset-digit-fonts.mjs
 * Keep CHARACTERS in sync with the `unicode-range` in src/styles/fonts.css.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import subsetFont from 'subset-font'

const SOURCE_DIR = join(
  process.cwd(),
  'node_modules',
  'vazirmatn',
  'misc',
  'Farsi-Digits',
  'fonts',
  'ttf'
)
const OUTPUT_DIR = join(process.cwd(), 'src', 'assets', 'fonts')

/** The weights fonts.css declares for `Vazirmatn FD`. */
const WEIGHTS = ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black']

/** U+0030–0039, U+06F0–06F9, U+066B, U+066C, U+002C, U+002E, U+2212, U+002B, U+0025, U+0020 */
const CHARACTERS = [
  ...range(0x30, 0x39),
  ...range(0x6f0, 0x6f9),
  0x66b,
  0x66c,
  0x2c,
  0x2e,
  0x2212,
  0x2b,
  0x25,
  0x20
]
  .map(code => String.fromCodePoint(code))
  .join('')

function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index)
}

await mkdir(OUTPUT_DIR, { recursive: true })

for (const weight of WEIGHTS) {
  const source = await readFile(join(SOURCE_DIR, `Vazirmatn-FD-${weight}.ttf`))
  const subset = await subsetFont(source, CHARACTERS, { targetFormat: 'woff2' })
  const target = join(OUTPUT_DIR, `Vazirmatn-FD-${weight}-digits.woff2`)

  await writeFile(target, subset)
  console.log(`${target}: ${(subset.length / 1024).toFixed(1)} kB`)
}
