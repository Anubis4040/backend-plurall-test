import { ZodError } from 'zod'
import logger from '../../../utils/logger.js'

/**
 * Middleware de validación genérico con Zod.
 * Uso: validate({ body: schemaBody, query: schemaQuery, params: schemaParams })
 */
export const validate = (schemas = {}) => {
  return async (req, res, next) => {
    try {
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params)
        req.params = parsed
      }
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query)
        req.query = parsed
      }
      if (schemas.body) {
        const parsed = schemas.body.parse(req.body)
        req.body = parsed
      }
      return next()
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
            error: 'VALIDATION_ERROR',
            issues: err.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
              code: e.code
            }))
        })
      }
      logger.error('Error en validate middleware:', err)
      return res.status(500).json({ success: false, error: 'Error interno de validación' })
    }
  }
}

export default validate
