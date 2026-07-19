'use strict'

const cluster = require('node:cluster')

const DEFAULT_WORKERS = 4
const MAX_WORKERS = 16
const RESTART_WINDOW_MS = 60_000
const MIN_RESTART_BUDGET = 8
const RESPAWN_DELAY_MS = 150
const SHUTDOWN_TIMEOUT_MS = 15_000

function parseWorkerCount(rawValue) {
  if (rawValue === undefined || rawValue === '') return DEFAULT_WORKERS

  const value = String(rawValue)
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`FRONTEND_WORKERS debe ser un entero entre 1 y ${MAX_WORKERS}.`)
  }

  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed > MAX_WORKERS) {
    throw new Error(`FRONTEND_WORKERS debe ser un entero entre 1 y ${MAX_WORKERS}.`)
  }

  return parsed
}

function log(message) {
  process.stdout.write(`[frontend-cluster] ${message}\n`)
}

function logError(message) {
  process.stderr.write(`[frontend-cluster] ${message}\n`)
}

function runPrimary(workerCount) {
  const restartBudget = Math.max(MIN_RESTART_BUDGET, workerCount * 2)
  const restartEvents = []
  let shuttingDown = false
  let shutdownExitCode = 0
  let shutdownTimer = null

  const liveWorkers = () => Object.values(cluster.workers).filter(Boolean)

  const finishShutdownIfIdle = () => {
    if (!shuttingDown || liveWorkers().length !== 0) return
    if (shutdownTimer) clearTimeout(shutdownTimer)
    process.exit(shutdownExitCode)
  }

  const beginShutdown = (exitCode, reason) => {
    if (shuttingDown) return
    shuttingDown = true
    shutdownExitCode = exitCode
    log(`${reason}; cerrando ${liveWorkers().length} worker(s).`)

    for (const worker of liveWorkers()) {
      try {
        worker.process.kill('SIGTERM')
      } catch (error) {
        logError(`no se pudo detener worker id=${worker.id}: ${error.message}`)
      }
    }

    shutdownTimer = setTimeout(() => {
      for (const worker of liveWorkers()) {
        try {
          worker.process.kill('SIGKILL')
        } catch {
          // El worker puede haber terminado entre la enumeracion y el kill.
        }
      }
      logError('se agoto el tiempo de apagado; se forzo el cierre del cluster.')
      process.exit(shutdownExitCode || 1)
    }, SHUTDOWN_TIMEOUT_MS)

    finishShutdownIfIdle()
  }

  const forkWorker = () => {
    if (shuttingDown) return
    cluster.fork()
  }

  cluster.on('online', (worker) => {
    log(`worker online id=${worker.id} pid=${worker.process.pid}`)
  })

  cluster.on('exit', (worker, code, signal) => {
    const detail = signal ? `signal=${signal}` : `code=${code}`
    if (shuttingDown) {
      log(`worker detenido id=${worker.id} pid=${worker.process.pid} ${detail}`)
      finishShutdownIfIdle()
      return
    }

    const now = Date.now()
    while (restartEvents.length > 0 && now - restartEvents[0] > RESTART_WINDOW_MS) {
      restartEvents.shift()
    }
    restartEvents.push(now)

    logError(`worker inesperadamente detenido id=${worker.id} pid=${worker.process.pid} ${detail}.`)
    if (restartEvents.length > restartBudget) {
      beginShutdown(70, `presupuesto de reinicios agotado (${restartBudget} en ${RESTART_WINDOW_MS / 1000}s)`)
      return
    }

    setTimeout(forkWorker, RESPAWN_DELAY_MS)
  })

  process.once('SIGTERM', () => beginShutdown(0, 'SIGTERM recibido'))
  process.once('SIGINT', () => beginShutdown(0, 'SIGINT recibido'))

  process.on('uncaughtException', (error) => {
    logError(`error no controlado en primary: ${error.stack || error.message}`)
    beginShutdown(70, 'primary no puede continuar de forma segura')
  })
  process.on('unhandledRejection', (reason) => {
    logError(`promesa rechazada en primary: ${reason instanceof Error ? reason.stack : String(reason)}`)
    beginShutdown(70, 'primary no puede continuar de forma segura')
  })

  log(`primary pid=${process.pid}; iniciando ${workerCount} worker(s).`)
  for (let index = 0; index < workerCount; index += 1) forkWorker()
}

function start() {
  let workerCount
  try {
    workerCount = parseWorkerCount(process.env.FRONTEND_WORKERS)
  } catch (error) {
    logError(error.message)
    process.exit(64)
  }

  if (cluster.isPrimary) {
    runPrimary(workerCount)
    return
  }

  require('./server.js')
}

if (require.main === module) start()

module.exports = {
  DEFAULT_WORKERS,
  MAX_WORKERS,
  parseWorkerCount,
  start,
}
