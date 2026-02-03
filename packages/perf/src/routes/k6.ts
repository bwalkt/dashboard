import { spawn } from 'node:child_process'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { config } from '../config/env.js'

const ALLOWED_TEST_PATTERN = /^[\w.-]+\.test\.js$/

const SERVER_ENV_KEYS = ['BASE_URL', 'PROXY_TARGET', 'STATIC_CHALLENGE_ANSWER', 'STATIC_CHALLENGE_ID'] as const

const CLIENT_ENV_ALLOWED = ['AUTH_TOKEN'] as const

function sseMessage(data: string, event?: string): string {
  const lines = event ? [`event: ${event}`, `data: ${data}`] : [`data: ${data}`]
  return lines.join('\n') + '\n\n'
}

function streamProcess(send: (data: string, event?: string) => void, proc: ReturnType<typeof spawn>): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!proc.stdout || !proc.stderr) {
      reject(new Error('Process stdout/stderr not available'))
      return
    }
    const onLine = (line: string) => {
      if (line.trim()) send(line.trim(), 'log')
    }
    const rlOut = createInterface({ input: proc.stdout, crlfDelay: Infinity })
    const rlErr = createInterface({ input: proc.stderr, crlfDelay: Infinity })
    rlOut.on('line', onLine)
    rlErr.on('line', onLine)
    proc.on('error', err => {
      rlOut.close()
      rlErr.close()
      reject(err)
    })
    proc.on('close', (code, signal) => {
      rlOut.close()
      rlErr.close()
      resolve(code ?? (signal ? 1 : 0))
    })
  })
}

export default async function k6Routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  let running = false

  /** GET /api/k6/tests - list available test files (compiled .test.js names from dist) */
  fastify.get('/api/k6/tests', async (_request, reply) => {
    const distDir = config.PERF_WORKSPACE
    try {
      await stat(distDir)
    } catch {
      return reply.status(500).send({
        error: 'Perf dist not available',
        details: `PERF_WORKSPACE (${distDir}) missing or not readable`,
      })
    }
    try {
      const files = await readdir(distDir)
      const tests = files.filter(f => f.endsWith('.test.js') && ALLOWED_TEST_PATTERN.test(f)).sort()
      return reply.send({ tests })
    } catch (err) {
      fastify.log.warn({ err, distDir }, 'Failed to list tests')
      return reply.status(500).send({
        error: 'Failed to list tests',
        details: err instanceof Error ? err.message : String(err),
      })
    }
  })

  /** GET /api/k6/run - SSE stream: run k6 from pre-built dist, stream logs. Query: test=xxx, env=base64(JSON) */
  fastify.get('/api/k6/run', async (request, reply) => {
    if (running) {
      return reply.status(409).send({ error: 'A test is already running' })
    }

    const test = request.query as { test?: string; env?: string }
    const testFile = typeof test.test === 'string' && test.test ? test.test : null
    if (testFile && !ALLOWED_TEST_PATTERN.test(testFile)) {
      return reply.status(400).send({ error: 'Invalid test file name' })
    }

    let clientEnv: Record<string, string> = {}
    if (typeof test.env === 'string' && test.env) {
      try {
        const parsed = JSON.parse(Buffer.from(test.env, 'base64').toString('utf8')) as Record<string, string>
        for (const key of CLIENT_ENV_ALLOWED) {
          if (parsed[key] != null && String(parsed[key]).trim() !== '') {
            clientEnv[key] = String(parsed[key]).trim()
          }
        }
      } catch {
        return reply.status(400).send({ error: 'Invalid env parameter' })
      }
    }

    const serverEnv: Record<string, string> = {}
    for (const key of SERVER_ENV_KEYS) {
      const v = process.env[key]
      if (v != null && v !== '') serverEnv[key] = v
    }
    const envForRun = { ...process.env, ...serverEnv, ...clientEnv }

    running = true
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    reply.raw.flushHeaders?.()

    const send = (data: string, event?: string) => {
      try {
        reply.raw.write(sseMessage(data, event))
        const res = reply.raw as NodeJS.WritableStream & { flush?: () => void }
        if (typeof res.flush === 'function') res.flush()
      } catch (e) {
        fastify.log.warn({ err: e }, 'SSE write failed')
      }
    }

    const cleanup = () => {
      running = false
    }

    const distDir = config.PERF_WORKSPACE

    try {
      await stat(distDir)
    } catch (err) {
      send(JSON.stringify({ error: `PERF_WORKSPACE not available: ${distDir}`, exitCode: 1 }), 'done')
      cleanup()
      reply.raw.end()
      return
    }

    try {
      const distFiles = await readdir(distDir)
      const availableTests = distFiles.filter(f => f.endsWith('.test.js') && ALLOWED_TEST_PATTERN.test(f)).sort()

      const envForTest = { ...serverEnv, ...clientEnv }
      const maskKeys = new Set(['AUTH_TOKEN', 'STATIC_CHALLENGE_ANSWER'])
      send('--- Environment for test run ---', 'log')
      for (const [key, value] of Object.entries(envForTest).sort(([a], [b]) => a.localeCompare(b))) {
        const display = maskKeys.has(key) && value ? '***' : value || '(not set)'
        send(`${key}=${display}`, 'log')
      }
      send('--------------------------------', 'log')

      send('Starting k6...', 'log')
      const testFiles = testFile ? (availableTests.includes(testFile) ? [testFile] : []) : availableTests
      let lastCode = 0
      if (testFiles.length === 0) {
        send(
          JSON.stringify({
            error: testFile ? `Test file not found: ${testFile}` : 'No test files found in dist',
            exitCode: 1,
          }),
          'done',
        )
      } else {
        for (const file of testFiles) {
          const scriptPath = join(distDir, file)
          try {
            const k6Proc = spawn("k6", ["run", scriptPath], {
              cwd: distDir,
              env: envForRun,
              stdio: ["ignore", "pipe", "pipe"],
            });
            lastCode = await streamProcess(send, k6Proc);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            send(`k6 error: ${msg}`, "log");
            lastCode = 1;
          }
        }
        send(JSON.stringify({ exitCode: lastCode }), 'done')
      }
    } catch (err) {
      fastify.log.error({ err }, 'k6 run failed')
      send(JSON.stringify({ error: err instanceof Error ? err.message : String(err), exitCode: 1 }), 'done')
    } finally {
      cleanup()
      reply.raw.end()
    }
  })
}
