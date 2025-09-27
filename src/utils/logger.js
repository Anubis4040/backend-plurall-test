import winston from 'winston'

// Soporte para parámetros extra (winston usa este símbolo para args adicionales)
const SPLAT = Symbol.for('splat')

// Normaliza objetos Error que lleguen como primer argumento o en parámetros extra.
// Convierte Error en campos planos (message, stack, name) y preserva metadata adicional.
const normalizeErrorsFormat = winston.format((info) => {
  // Si el propio info es un Error (cuando se hace logger.error(error))
  if (info instanceof Error) {
    return {
      level: info.level || 'error',
      message: info.message,
      stack: info.stack,
      name: info.name
    }
  }

  const splat = info[SPLAT]
  if (splat && splat.length) {
    for (const arg of splat) {
      if (arg instanceof Error) {
        // Mapeamos a campos explícitos. Si ya hay stack no sobreescribimos.
        info.error_message = arg.message
        info.error_name = arg.name
        if (!info.stack) info.stack = arg.stack
      } else if (typeof arg === 'object' && arg !== null) {
        // Merge superficial de metadata (sin sobreescribir claves existentes críticas)
        for (const [k, v] of Object.entries(arg)) {
          if (info[k] === undefined) info[k] = v
        }
      } else if (typeof arg === 'string') {
        // Concatenar strings adicionales al mensaje (evitar perder contexto)
        info.message += ` ${arg}`
      }
    }
  }
  return info
})

// Determinar el nivel de log: LOG_LEVEL env override -> debug en desarrollo, info en producción
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true })
)

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    baseFormat,
    normalizeErrorsFormat(), // Enriquecer antes de serializar a JSON
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

// Console sólo (normalmente) fuera de producción, con formato legible y color
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    level: LOG_LEVEL,
    format: winston.format.combine(
      baseFormat,
      normalizeErrorsFormat(),
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, stack, error_message, error_name, ...meta }) => {
        // Prioridad: mostrar stack si existe, si no, message. Añadimos nombre de error si aplica.
        let line = stack || message
        if (!stack && error_name && error_message) {
          line = `${error_name}: ${error_message}`
        }
        const metaClean = { ...meta }
        const metaStr = Object.keys(metaClean).length ? ` ${JSON.stringify(metaClean)}` : ''
        return `${timestamp} ${level}: ${line}${metaStr}`
      })
    )
  }))
}

logger.debug(`Logger inicializado con nivel '${LOG_LEVEL}'`)

// Helper para estandarizar logs de error manteniendo compatibilidad:
// Uso: logger.appError('Contexto descriptivo', error, { metaExtra: 123 })
logger.appError = (contextMessage, error, meta = {}) => {
  if (error instanceof Error) {
    logger.error(contextMessage, { ...meta, error_message: error.message, error_name: error.name, stack: error.stack })
  } else {
    logger.error(contextMessage, { ...meta, detail: error })
  }
}

// Ejemplos de uso esperados ahora soportados:
// logger.error('Falló consulta', err)
// logger.error('No se pudo procesar', err, { userId })
// logger.appError('Persistencia falló', err, { entity: 'Task' })

export default logger