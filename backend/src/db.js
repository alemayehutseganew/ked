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

module.exports = db
