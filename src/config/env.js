import dotenv from 'dotenv'

// Carga .env una sola vez
dotenv.config()

// Helper para variables obligatorias
function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Falta variable de entorno requerida: ${name}`)
  }
  return value
}

// Exportar variables (ajusta según tus necesidades)
export const NODE_ENV = process.env.NODE_ENV || 'development'
export const PORT = Number(process.env.PORT || 3000)
export const DB_HOST = process.env.DB_HOST || 'localhost'
export const DB_PORT = Number(process.env.DB_PORT || 5432)
export const DB_NAME = process.env.DB_NAME || 'plurall_test'
export const DB_USER = process.env.DB_USER || 'postgres'
export const DB_PASSWORD = process.env.DB_PASSWORD || 'password'
export const DB_TIMEZONE = process.env.DB_TIMEZONE || 'UTC'

// Ejemplo para otras variables sensibles (JWT, etc.)
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export function summaryEnv() {
  return {
    NODE_ENV,
    PORT,
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_TIMEZONE,
    HAS_DB_PASSWORD: !!DB_PASSWORD,
    HAS_JWT_SECRET: !!JWT_SECRET
  }
}
