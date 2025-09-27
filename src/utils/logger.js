import winston from 'winston'

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
    winston.format.json()
  ),
  // defaultMeta: { service: 'plurall-backend' },
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
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        const baseMsg = stack || message
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
        return `${timestamp} ${level}: ${baseMsg} ${metaStr}`
      })
    )
  }))
}

logger.debug(`Logger inicializado con nivel '${LOG_LEVEL}'`)

export default logger