import pkg from 'pg'
const { Pool } = pkg
import logger from '../utils/logger.js'
import { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_TIMEZONE } from './env.js'

const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

logger.info(`🗄️ Config pool DB host=${DB_HOST} db=${DB_NAME} user=${DB_USER}`)

// Validación ligera de timezone (no exhaustiva). Acepta 'UTC' o formato Region/Ciudad
if (DB_TIMEZONE && !/^([A-Za-z_]+\/[A-Za-z_]+|UTC|GMT[+-]?\d{0,2})$/.test(DB_TIMEZONE)) {
  logger.warn(`Formato potencialmente inválido de DB_TIMEZONE='${DB_TIMEZONE}'. Ejemplos válidos: 'UTC', 'America/Bogota', 'Europe/Madrid'`)
}

export const connectDB = async () => {
  try {
    const client = await pool.connect()
    if (DB_TIMEZONE) {
      try {
        await client.query(`SET TIME ZONE '${DB_TIMEZONE.replace(/'/g, "''")}'`)
        logger.info(`🕒 Time zone de sesión establecido a ${DB_TIMEZONE}`)
      } catch (tzErr) {
        logger.warn(`No se pudo establecer DB_TIMEZONE='${DB_TIMEZONE}': ${tzErr.message}`)
      }
    }
    logger.info('✅ Conectado a PostgreSQL')
    client.release()
  } catch (error) {
    logger.error('❌ Error conectando a PostgreSQL:', error);
  }
}

export const query = async (text, params) => {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    logger.info(`Query executed in ${duration}ms: ${text.substring(0, 100)}...`)
    return result
  } catch (error) {
    logger.error('Database query error:', {
      query: text,
      params: params,
      error: error.message
    })
    throw error
  }
}

export const getClient = async () => {
  return await pool.connect()
}

process.on('SIGINT', () => {
  pool.end()
  process.exit(0)
})

export default pool