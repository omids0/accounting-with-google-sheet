#!/usr/bin/env node
// Tiny client for driver.mjs (no curl needed).
//
//   node docs/user-experience-sessions/do.mjs <port> <action> [key=value ...]
//   node docs/user-experience-sessions/do.mjs 4301 goto path=/
//   node docs/user-experience-sessions/do.mjs 4301 click text="ثبت خرج"
//   node docs/user-experience-sessions/do.mjs 4301 fill label="مبلغ" value=120000
//   node docs/user-experience-sessions/do.mjs 4301 shot name=home
//   node docs/user-experience-sessions/do.mjs 4301 text
//
// A value that is a number or true/false is sent as that type (ms=500, full=true).
const [port, action, ...pairs] = process.argv.slice(2)

if (!port || !action) {
  console.error('usage: do.mjs <port> <action> [key=value ...]')
  process.exit(2)
}

const body = { action }

for (const pair of pairs) {
  const at = pair.indexOf('=')
  const key = pair.slice(0, at)
  const raw = pair.slice(at + 1)

  body[key] = /^-?\d+$/.test(raw) ? Number(raw) : raw === 'true' ? true : raw === 'false' ? false : raw
}

try {
  const res = await fetch(`http://127.0.0.1:${port}/do`, {
    method: 'POST',
    body: JSON.stringify(body)
  })

  console.log(await res.text())
} catch (error) {
  console.error(`driver on ${port} is not reachable: ${error.message}`)
  process.exit(1)
}
