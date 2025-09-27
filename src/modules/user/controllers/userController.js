import { query } from '../../../config/database.js'
import logger from '../../../utils/logger.js'
import bcrypt from 'bcryptjs'

export const listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let baseQuery = 'SELECT id, username, email, role, first_name, last_name, avatar_url, is_active, email_verified, last_login, created_at, updated_at FROM users'
    const params = []

    if (search) {
      params.push(`%${search}%`)
      baseQuery += ` WHERE username ILIKE $${params.length} OR email ILIKE $${params.length}`
    }
    const countQuery = baseQuery.replace(/SELECT[^F]*FROM/, 'SELECT COUNT(*) AS total FROM')
    baseQuery += ` ORDER BY created_at DESC LIMIT ${Number(limit)} OFFSET ${offset}`

    const [rowsResult, countResult] = await Promise.all([
      query(baseQuery, params),
      query(countQuery, params)
    ])

    res.json({
      success: true,
      data: rowsResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total)
      }
    })
  } catch (error) {
    logger.error('Error listUsers:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getUser = async (req, res) => {
  try {
    const { id } = req.params
    const result = await query('SELECT id, username, email, role, first_name, last_name, avatar_url, is_active, email_verified, last_login, created_at, updated_at FROM users WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    res.json({ success: true, user: result.rows[0] })
  } catch (error) {
    logger.error('Error getUser:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const createUser = async (req, res) => {
  try {
    const { username, email, password, role, first_name, last_name } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email y password son requeridos' })
    }

    const saltRounds = 8
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const insertQuery = `INSERT INTO users (username, email, password_hash, role, first_name, last_name)
                         VALUES ($1,$2,$3,$4,$5,$6)
                         RETURNING id, username, email, role, first_name, last_name, avatar_url, is_active, email_verified, created_at`;
    const params = [username, email, passwordHash, role, first_name, last_name]

    const result = await query(insertQuery, params)

    res.status(201).json({ success: true, user: result.rows[0] })
  } catch (error) {
    if (error.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'Usuario o email ya existe' })
    }
    logger.error(`Error createUser: ${error.message}`)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const allowed = ['username','email','role','first_name','last_name','avatar_url','is_active','email_verified']
    const entries = Object.entries(req.body).filter(([k,v]) => allowed.includes(k))

    if (entries.length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' })
    }

    const setFragments = entries.map(([k], idx) => `${k} = $${idx+1}`)
    const values = entries.map(([,v]) => v)
    values.push(id)
    const updateQuery = `UPDATE users SET ${setFragments.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING id, username, email, role, first_name, last_name, avatar_url, is_active, email_verified, last_login, created_at, updated_at`;

    const result = await query(updateQuery, values)
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    res.json({ success: true, user: result.rows[0] })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Conflicto de unicidad (username/email)' })
    }
    logger.error('Error updateUser:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    res.json({ success: true, message: 'Usuario eliminado' })
  } catch (error) {
    logger.error('Error deleteUser:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
