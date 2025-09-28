import { query } from '../../../config/database.js'
import logger from '../../../utils/logger.js'
import { getPaginationParams, buildMeta } from '../../../utils/pagination.js'

// getProjectTimeline: timeline filtrable por tipos de evento
// Tipos implementados: task_created, task_commented, time_logged
// Filtros: start_date, end_date, types (lista separada por comas), paginación page/limit
export const getProjectTimeline = async (req, res) => {
  try {
    const { projectId } = req.params
    const { start_date, end_date, types } = req.query

    const { page, limit, offset } = getPaginationParams(req.query, { defaultLimit: 20, maxLimit: 100 })

    // Convertimos types (array validado por schema) a formato para query text[]
    // Si no hay types -> pasamos null
    const typesArray = Array.isArray(types) ? types : undefined

    const sql = `
      WITH
      task_created AS (
        SELECT
          'task_created'::text AS event_type,
          t.created_at AS occurred_at,
          t.created_by AS actor_id,
          u.username AS actor_username,
          t.id AS task_id,
          t.title AS task_title,
          NULL::UUID AS comment_id,
          NULL::text AS comment_excerpt,
          NULL::numeric AS hours_logged
        FROM tasks t
        LEFT JOIN users u ON u.id = t.created_by
        WHERE t.project_id = $1
          AND ($2::timestamptz IS NULL OR t.created_at >= $2)
          AND ($3::timestamptz IS NULL OR t.created_at <= $3)
      ),
      task_commented AS (
        SELECT
          'task_commented'::text AS event_type,
          c.created_at AS occurred_at,
          c.user_id AS actor_id,
          u.username AS actor_username,
          c.task_id AS task_id,
          t.title AS task_title,
          c.id AS comment_id,
          SUBSTRING(c.content FOR 120) AS comment_excerpt,
          NULL::numeric AS hours_logged
        FROM task_comments c
        JOIN tasks t ON t.id = c.task_id
        LEFT JOIN users u ON u.id = c.user_id
        WHERE t.project_id = $1
          AND ($2::timestamptz IS NULL OR c.created_at >= $2)
          AND ($3::timestamptz IS NULL OR c.created_at <= $3)
      ),
      time_logged AS (
        SELECT
          'time_logged'::text AS event_type,
          te.created_at AS occurred_at,
          te.user_id AS actor_id,
          u.username AS actor_username,
          te.task_id AS task_id,
          t.title AS task_title,
          NULL::UUID AS comment_id,
          NULL::text AS comment_excerpt,
          te.hours_logged AS hours_logged
        FROM time_entries te
        JOIN tasks t ON t.id = te.task_id
        LEFT JOIN users u ON u.id = te.user_id
        WHERE t.project_id = $1
          AND ($2::timestamptz IS NULL OR te.created_at >= $2)
          AND ($3::timestamptz IS NULL OR te.created_at <= $3)
      ),
      unioned AS (
        SELECT * FROM task_created
        UNION ALL
        SELECT * FROM task_commented
        UNION ALL
        SELECT * FROM time_logged
      ),
      filtered AS (
        SELECT * FROM unioned
        WHERE ($4::text[] IS NULL OR event_type = ANY($4))
      ), ranked AS (
        SELECT *, COUNT(*) OVER() AS total_rows
        FROM filtered
      )
      SELECT * FROM ranked
      ORDER BY occurred_at DESC
      LIMIT $5 OFFSET $6;
    `

    const params = [
      projectId,
      start_date || null,
      end_date || null,
      typesArray ? typesArray : null,
      limit,
      offset
    ]

    const result = await query(sql, params)

    const totalRows = result.rows.length ? Number(result.rows[0].total_rows) : 0

    const events = result.rows.map(({ total_rows, ...row }) => ({
      ...row,
      hours_logged: row.hours_logged !== null ? Number(row.hours_logged) : null
    }))

    res.json({
      success: true,
      events,
      pagination: buildMeta(totalRows, page, limit),
      meta: {
        project_id: projectId,
        applied_types: typesArray || null,
        start_date: start_date || null,
        end_date: end_date || null
      }
    })
  } catch (error) {
    logger.error('Error generando timeline de proyecto:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
