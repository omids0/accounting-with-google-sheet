/**
 * Reorganize part-*.css into Tailwind-friendly structure (non-destructive copy).
 * Run: node scripts/migrate-to-tailwind.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const stylesDir = path.join(root, 'src/styles')

const PART_MAP = {
  'part-02.css': 'forms-select-extra.css',
  'part-03.css': 'forms-focus-layout.css',
  'part-04.css': 'layout-header-menu.css',
  'part-05.css': 'pages-tools-start.css',
  'part-06.css': 'pages-tools.css',
  'part-07.css': 'layout-main-nav.css',
  'part-08.css': 'modals-speeddial.css',
  'part-09.css': 'modals-cards-forms.css',
  'part-10.css': 'forms-cards-lists.css',
  'part-11.css': 'progress-installments.css',
  'part-12.css': 'card-actions.css',
  'part-13.css': 'installments-dang.css',
  'part-14.css': 'dang-receivable.css',
  'part-15.css': 'treasury.css',
  'part-16.css': 'alerts-login-charts.css',
  'part-17.css': 'dashboard-icons.css',
  'part-18.css': 'dashboard-records.css',
  'part-19.css': 'records-filters.css',
  'part-20.css': 'records-list-stat.css',
  'part-21.css': 'charts-filters.css',
  'part-22.css': 'filters-search.css',
  'part-23.css': 'forms-lock.css',
  'part-24.css': 'unlock-about-settings.css',
  'part-25.css': 'settings-about-end.css',
}

function readPart(name) {
  return fs.readFileSync(path.join(stylesDir, name), 'utf8')
}

function writeFile(rel, content) {
  const filePath = path.join(root, rel.startsWith('src/') ? rel : `src/styles/${rel}`)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${content.trim()}\n`, 'utf8')
  console.log(`  ${rel} (${content.trim().split('\n').length} lines)`)
}

function wrapLayer(content) {
  return `@layer components {\n${content.trim()}\n}\n`
}

console.log('Migrating CSS...\n')

const part01 = readPart('part-01.css')
const kfStart = part01.indexOf('@keyframes pageFade')
const baseStart = part01.indexOf('*,')
const selectStart = part01.indexOf('/* ── Custom select')

const themeBlock = part01.slice(0, kfStart).trim()
const part01Keyframes = part01.slice(kfStart, baseStart).trim()
const baseBlock = part01.slice(baseStart, selectStart).trim()
const selectBlock = part01.slice(selectStart).trim()

writeFile(
  'theme.css',
  `${themeBlock}

@theme inline {
  --color-primary: var(--color-primary);
  --color-primary-dark: var(--color-primary-dark);
  --color-primary-light: var(--color-primary-light);
  --color-bg: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-text: var(--color-text);
  --color-muted: var(--color-text-muted);
  --color-border: var(--color-border);
  --color-danger: var(--color-danger);
  --color-success: var(--color-success);
  --color-income: var(--color-income);
  --color-expense: var(--color-expense);
  --color-warning: var(--color-warning);
  --radius-DEFAULT: var(--radius);
  --radius-sm: var(--radius-sm);
  --radius-form: var(--form-radius);
  --shadow-DEFAULT: var(--shadow);
  --shadow-lg: var(--shadow-lg);
  --font-sans: var(--font-text);
  --font-numeric: var(--font-numeric);
  --spacing-touch-min: var(--touch-min);
  --spacing-page: var(--space-page);
  --spacing-card: var(--space-card);
  --spacing-stack: var(--space-stack);
  --duration-fast: var(--duration-fast);
  --duration-normal: var(--duration-normal);
  --duration-slow: var(--duration-slow);
  --duration-page: var(--duration-page);
  --ease-out: var(--ease-out);
  --ease-spring: var(--ease-spring);
  --ease-page: var(--ease-page);
}
`
)

writeFile('animations.css', part01Keyframes)
writeFile('base.css', `@layer base {\n${baseBlock}\n}\n`)
writeFile('components/forms-select.css', wrapLayer(selectBlock))

for (const [part, target] of Object.entries(PART_MAP)) {
  writeFile(`components/${target}`, wrapLayer(readPart(part)))
}

// Reusable core patterns via Tailwind @apply (loaded last to override duplicates)
writeFile(
  'components/core-buttons.css',
  `@layer components {
  .btn {
    @apply relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-sm px-5 py-3 text-[0.95rem] font-bold transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)];
  }
  .btn:active:not(:disabled) { @apply scale-[0.97]; }
  .btn-primary {
    @apply text-white shadow-[0_4px_14px_rgba(15,118,110,0.3)];
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  }
  .btn-primary:hover:not(:disabled) {
    @apply -translate-y-px shadow-[0_6px_20px_rgba(15,118,110,0.35)];
    background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary));
  }
  .btn-primary:disabled { @apply cursor-not-allowed opacity-60; }
  .btn-secondary { @apply border-[1.5px] border-border bg-bg text-primary; }
  .btn-secondary:hover:not(:disabled) { @apply border-primary; }
  .btn-danger { @apply border-[1.5px] border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-danger; }
  .btn-outflow { @apply bg-danger text-white; }
  .btn-outflow:hover:not(:disabled) { @apply bg-[#b91c1c]; }
  .btn-outflow:disabled { @apply cursor-not-allowed opacity-60; }
  .btn-inflow { @apply bg-success text-white; }
  .btn-inflow:hover:not(:disabled) { @apply bg-[#15803d]; }
  .btn-inflow:disabled { @apply cursor-not-allowed opacity-60; }
  .btn-sm { @apply w-auto px-3 py-1.5 text-xs; }
}
`
)

writeFile(
  'components/core-cards.css',
  `@layer components {
  .card {
    @apply mb-stack rounded-[var(--radius)] border border-border bg-surface p-card transition-[box-shadow,transform,border-color] duration-[var(--duration-normal)] ease-[var(--ease-out)];
  }
  .card:hover { @apply shadow-lg; }
  .card-title { @apply mb-2 text-base font-bold text-[var(--color-primary-dark)]; }
}
`
)

writeFile(
  'components/core-alerts.css',
  `@layer components {
  .alert { @apply mb-4 rounded-sm px-4 py-3 text-[0.85rem]; animation: slideDown var(--duration-normal) var(--ease-out); }
  .alert-error { @apply border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-danger; }
  .alert-success { @apply border border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-success; }
  .alert-info { @apply border border-border bg-bg text-[var(--color-primary-dark)]; }
  .alert-warning { @apply border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-warning; }
}
`
)

writeFile(
  'components/core-forms.css',
  `@layer components {
  .app-form { @apply flex flex-col gap-[var(--form-gap)]; }
  .form-group, .form-field { @apply mb-[var(--form-gap)]; }
  .form-field-label, .form-group > label {
    @apply mb-1.5 block text-[0.82rem] font-semibold text-[var(--form-label-color)];
  }
  .form-control {
    @apply min-h-touch-min w-full rounded-form border border-[var(--form-input-border)] bg-[var(--form-input-bg)] px-3.5 py-3 text-text shadow-[var(--form-input-shadow)] transition-[border-color,box-shadow,background-color] duration-fast ease-out;
  }
  .form-control:hover:not(:disabled) { @apply border-[var(--form-input-border-hover)]; }
  .form-control:focus-visible { @apply border-primary outline-none shadow-[var(--form-input-focus-shadow)]; }
  .form-actions { @apply mt-2 flex flex-wrap gap-2; }
}
`
)

const imports = [
  './styles/theme.css',
  './styles/animations.css',
  './styles/base.css',
  './styles/components/forms-select.css',
  ...Object.values(PART_MAP).map((f) => `./styles/components/${f}`),
  './styles/components/core-buttons.css',
  './styles/components/core-cards.css',
  './styles/components/core-alerts.css',
  './styles/components/core-forms.css',
]

writeFile(
  'src/index.css',
  `@import 'tailwindcss';\n${imports.map((i) => `@import '${i}';`).join('\n')}\n`
)

console.log('\nDone.')
