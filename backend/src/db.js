const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true })

const knex = require('knex')
const config = require('../knexfile.js')
const environment = process.env.NODE_ENV || 'development'
const environmentConfig = config[environment]
const dbConfig = environment === 'production'
  ? {
    ...environmentConfig,
    pool: {
      ...environmentConfig.pool,
      min: 0,
      max: 10,
      acquireTimeoutMillis: 30_000,
      createTimeoutMillis: 30_000,
      createRetryIntervalMillis: 200,
      idleTimeoutMillis: 10_000,
    },
  }
  : environmentConfig
const db = knex(dbConfig)

/**
 * Retry wrapper for critical queries that may fail while a Neon serverless
 * database is waking up from a cold start (transient connection drops).
 *
 * Usage: await db.withRetry(() => db('users').where({ id }).first())
 */
async function withRetry(fn, { retries = 3, minDelay = 500, maxDelay = 5000 } = {}) {
  let lastError
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const message = String(err.message || err || '')
      const retryable = /terminating|connection|timeout|socket|ECONNREFUSED|ETIMEDOUT/i.test(message)
      if (!retryable || attempt === retries - 1) break
      const delay = Math.min(maxDelay, minDelay * 2 ** attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

db.withRetry = withRetry

module.exports = db
