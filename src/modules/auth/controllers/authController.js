import { query } from '../../../config/database.js'
import bcrypt from 'bcryptjs'
import { generateToken } from '../middlewares/auth.js'
import logger from '../../../utils/logger.js'

export const register = async (req, res) => {
  try {
    const { username, email, password, first_name, last_name } = req.body


    const existingUserQuery = 'SELECT id FROM users WHERE email = $1 OR username = $2'
    const existingUser = await query(existingUserQuery, [email, username])

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Usuario o email ya existe' })
    }

    const saltRounds = 8
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const insertUserQuery = `
      INSERT INTO users (username, email, password_hash, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, first_name, last_name, role, created_at
    `

    const result = await query(insertUserQuery, [username, email, passwordHash, first_name, last_name])
    const user = result.rows[0]

    const token = generateToken(user)
    logger.info(`Nuevo usuario registrado: ${username}`)

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user,
      token
    })
  } catch (error) {
    logger.error('Error en registro:', error.message)
    res.status(500).json({ error: error.message })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body


    const userQuery = `
      SELECT id, username, email, password_hash, role, first_name, last_name, is_active
      FROM users
      WHERE email = $1
    `

    const result = await query(userQuery, [email])

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'No existe usuario con ese email' })
    }

    const user = result.rows[0]

    if (!user.is_active) {
      return res.status(401).json({ error: 'Cuenta desactivada' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }

    const token = generateToken(user)
    logger.info(`Usuario ${user.username} inició sesión`)

    res.json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        password_hash: user.password_hash
      },
      token
    })
  } catch (error) {
    logger.error('Error en login:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getProfile = async (req, res) => {
  try {
    const userQuery = `
      SELECT id, username, email, first_name, last_name, role, is_active,
             email_verified, last_login, created_at
      FROM users
      WHERE id = $1
    `

    const result = await query(userQuery, [req.user.userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    res.json({
      success: true,
      user: result.rows[0]
    })
  } catch (error) {
    logger.error('Error obteniendo perfil:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

