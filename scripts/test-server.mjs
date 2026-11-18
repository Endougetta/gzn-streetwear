import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const state = mkdtempSync(join(tmpdir(), 'gzn-test-'))
const wrangler = 'node_modules/wrangler/bin/wrangler.js'
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' }
const migration = spawnSync(process.execPath, [
  wrangler, 'd1', 'migrations', 'apply', 'gzn-local', '--local', '--persist-to', state,
], { env, stdio: 'inherit' })
if (migration.status !== 0) {
  rmSync(state, { recursive: true, force: true })
  process.exit(migration.status ?? 1)
}
const server = spawn(process.execPath, [
  wrangler, 'pages', 'dev', 'dist', '--port', '8788', '--persist-to', state,
  '--binding', 'SITE_URL=http://localhost:8788', 'LOCAL_MAIL=1',
  'TOKEN_SECRET=gzn-test-only-secret-0123456789abcdef',
  'ADMIN_TOKEN=gzn-test-only-admin-0123456789abcdef',
], { env, stdio: 'inherit' })
process.on('SIGTERM', () => server.kill('SIGTERM'))
server.on('exit', code => {
  rmSync(state, { recursive: true, force: true })
  process.exit(code ?? 0)
})
