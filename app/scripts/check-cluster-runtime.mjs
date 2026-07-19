import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = resolve(appRoot, '..')
const launcherPath = resolve(appRoot, 'cluster-server.cjs')
const processTreeCheckPath = resolve(appRoot, 'scripts/check-cluster-process-tree.sh')
const require = createRequire(import.meta.url)
const { DEFAULT_WORKERS, MAX_WORKERS, parseWorkerCount } = require(launcherPath)

assert.equal(DEFAULT_WORKERS, 4)
assert.equal(MAX_WORKERS, 16)
assert.equal(parseWorkerCount(undefined), 4)
assert.equal(parseWorkerCount(''), 4)
assert.equal(parseWorkerCount('1'), 1)
assert.equal(parseWorkerCount('4'), 4)
assert.equal(parseWorkerCount('16'), 16)
for (const invalid of ['0', '-1', '1.5', ' 4', '4 ', '17', 'abc']) {
  assert.throws(() => parseWorkerCount(invalid), /FRONTEND_WORKERS/)
}

const [dockerfile, compose, template, entrypoint, packageJson] = await Promise.all([
  readFile(resolve(appRoot, 'Dockerfile'), 'utf8'),
  readFile(resolve(workspaceRoot, 'docker-compose.yml'), 'utf8'),
  readFile(resolve(workspaceRoot, 'templates/entorno/.env.example'), 'utf8'),
  readFile(resolve(appRoot, 'docker-entrypoint.sh'), 'utf8'),
  readFile(resolve(appRoot, 'package.json'), 'utf8'),
])

assert.match(dockerfile, /cluster-server\.cjs/)
assert.match(dockerfile, /check-cluster-process-tree\.sh/)
assert.match(
  dockerfile,
  /chmod 755 \/usr\/local\/bin\/docker-entrypoint\.sh \/app\/check-cluster-process-tree\.sh/,
)
assert.match(dockerfile, /CMD \["node", "cluster-server\.cjs"\]/)
assert.equal((compose.match(/FRONTEND_WORKERS: \$\{FRONTEND_WORKERS:-4\}/g) || []).length, 2)
assert.equal((compose.match(/command: node cluster-server\.cjs/g) || []).length, 2)
assert.match(template, /^FRONTEND_WORKERS=4$/m)
assert.match(entrypoint, /FRONTEND_WORKERS/)
assert.match(JSON.parse(packageJson).scripts['cluster:check'], /check-cluster-runtime\.mjs/)

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', rejectRun)
    child.once('exit', (code, signal) => resolveRun({ code, signal, stdout, stderr }))
  })
}

const invalidRun = await run(process.execPath, [launcherPath], {
  cwd: appRoot,
  env: { ...process.env, FRONTEND_WORKERS: '0' },
})
assert.equal(invalidRun.code, 64)
assert.match(invalidRun.stderr, /FRONTEND_WORKERS/)

const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'frontend-cluster-check-'))
try {
  await writeFile(resolve(fixtureRoot, 'cluster-server.cjs'), await readFile(launcherPath))
  await writeFile(resolve(fixtureRoot, 'server.js'), `
    const http = require('node:http')
    const server = http.createServer((_request, response) => response.end('ok'))
    server.listen(0, '127.0.0.1', () => console.log('FIXTURE_READY:' + process.pid))
    process.once('SIGTERM', () => server.close(() => process.exit(0)))
  `)

  const graceful = spawn(process.execPath, ['cluster-server.cjs'], {
    cwd: fixtureRoot,
    env: { ...process.env, FRONTEND_WORKERS: '2' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let gracefulOutput = ''
  graceful.stdout.on('data', (chunk) => { gracefulOutput += chunk })
  graceful.stderr.on('data', (chunk) => { gracefulOutput += chunk })

  await new Promise((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => rejectReady(new Error(`Cluster fixture did not become ready:\n${gracefulOutput}`)), 8_000)
    const checkReady = () => {
      const readyPids = new Set([...gracefulOutput.matchAll(/FIXTURE_READY:(\d+)/g)].map((match) => match[1]))
      if (readyPids.size === 2) {
        clearTimeout(timeout)
        resolveReady()
      } else {
        setTimeout(checkReady, 25)
      }
    }
    checkReady()
  })
  const processTree = await run('sh', [processTreeCheckPath, '2'], {
    cwd: fixtureRoot,
    env: { ...process.env, CLUSTER_INIT_PID: String(process.pid) },
  })
  assert.equal(processTree.code, 0, processTree.stderr)
  assert.match(processTree.stdout, /workers=2/)
  graceful.kill('SIGTERM')
  const gracefulExit = await new Promise((resolveExit, rejectExit) => {
    const timeout = setTimeout(() => rejectExit(new Error('Cluster fixture did not stop gracefully.')), 5_000)
    graceful.once('exit', (code, signal) => {
      clearTimeout(timeout)
      resolveExit({ code, signal })
    })
  })
  assert.deepEqual(gracefulExit, { code: 0, signal: null })
  assert.match(gracefulOutput, /SIGTERM recibido/)

  await writeFile(resolve(fixtureRoot, 'server.js'), 'process.exit(42)\n')
  const failed = await run(process.execPath, ['cluster-server.cjs'], {
    cwd: fixtureRoot,
    env: { ...process.env, FRONTEND_WORKERS: '1' },
  })
  assert.equal(failed.code, 70)
  assert.match(`${failed.stdout}\n${failed.stderr}`, /presupuesto de reinicios agotado/)
} finally {
  await rm(fixtureRoot, { recursive: true, force: true })
}

console.log(`Frontend cluster runtime check passed (${basename(launcherPath)}; default=${DEFAULT_WORKERS}).`)
