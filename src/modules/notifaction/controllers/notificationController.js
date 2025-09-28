import { query } from '../../../config/database.js'
import logger from '../../../utils/logger.js'
import { getPaginationParams, buildSortClause, buildMeta, paginateQuery } from '../../../utils/pagination.js'

// GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId
    const { unread, sort_by, order } = req.query

    const { page, limit, offset } = getPaginationParams(req.query, { defaultLimit: 10, maxLimit: 100 })

    const allowedSort = ['created_at', 'title', 'is_read']
    const sortClause = buildSortClause(sort_by, allowedSort, order, 'created_at')

    const filters = ['n.user_id = $1']
    const params = [userId]

    if (typeof unread !== 'undefined') {
      params.push(unread === 'true')
      filters.push(`n.is_read = $${params.length}`)
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const baseSelect = `
      SELECT
        n.*
      FROM notifications n
      ${where}`

    const { rows, total } = await paginateQuery({
      queryFn: query,
      baseSelect,
      params,
      options: { sortClause, limit, offset }
    })

    res.json({
      success: true,
      notifications: rows,
      pagination: buildMeta(total, page, limit)
    })
  } catch (error) {
    logger.error('Error obteniendo notificaciones:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// PUT /api/notifications/:id/read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId

    const updateQuery = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `

    const result = await query(updateQuery, [id, userId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' })
    }

    res.json({ success: true, notification: result.rows[0] })
  } catch (error) {
    logger.error('Error marcando notificación como leída:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
