import jwt from 'jsonwebtoken'
// import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'mi-secret-super-seguro'

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', expiredAt: error.expiredAt })
    }
    return res.status(403).json({ error: 'Token inválido', details: error.message })
  }
}

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta acción',
        requiredRoles: roles,
        userRole: req.user.role
      })
    }
    next()
  }
}

export const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  )
}