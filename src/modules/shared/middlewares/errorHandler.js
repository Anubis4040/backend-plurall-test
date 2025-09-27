import logger from '../utils/logger.js'

export const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  logger.error(`Error: ${err.message}`)

  if (err.name === 'CastError') {
    const message = 'Recurso no encontrado'
    error = { message, stack: err.stack }
  }

  if (err.code === 11000) {
    const message = 'Recurso duplicado'
    error = { message, duplicateField: Object.keys(err.keyValue) }
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ')
    error = { message, validationErrors: err.errors }
  }

  res.status(500).json({
    success: false,
    error: error.message || 'Error del servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : err.stack,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  })
}