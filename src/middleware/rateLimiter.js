import rateLimit from 'express-rate-limit'

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000,
  message: {
    error: 'Demasiadas peticiones, intenta más tarde',
    limit: 1000,
    windowMs: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 intentos de login por IP
  message: {
    error: 'Demasiados intentos de login, intenta más tarde',
  },
  // Definido en true para que no cuente los logins exitosos
  skipSuccessfulRequests: true
})