import { query, getClient } from '../../../config/database.js'
import logger from '../../../utils/logger.js'
import multer from 'multer'
import csvParser from 'csv-parser'
import fs from 'fs'

// TODO: Crear cron job para borrar archivos subidos hace más de X tiempo

const ensureUploads = () => {
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true })
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploads()
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}-${safeName}`)
  }
})

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true)
  } else {
    cb(new Error('Solo se permiten archivos CSV'))
  }
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }) // 5MB

export const getDashboardStats = async (req, res) => {
  try {
    const dashboardQuery = `
      WITH
      u AS (SELECT COUNT(*) total FROM users WHERE is_active = true),
      p AS (SELECT COUNT(*) total FROM projects),
      t AS (SELECT COUNT(*) total FROM tasks),
      tc AS (SELECT COUNT(*) total FROM tasks WHERE status = 'completed')
      SELECT
      u.total AS total_users,
      p.total AS total_projects,
      t.total AS total_tasks,
      tc.total AS completed_tasks
      FROM u, p, t, tc;
    `

    const result = await query(dashboardQuery)

    const stats = result.rows[0]

    res.json({
      success: true,
      stats: {
        total_users: parseInt(stats.total_users, 10),
        total_projects: parseInt(stats.total_projects, 10),
        total_tasks: parseInt(stats.total_tasks, 10),
        completed_tasks: parseInt(stats.completed_tasks, 10)
      }
    })
  } catch (error) {
    logger.error('Error obteniendo estadísticas:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getUserProductivityReport = async (req, res) => {
  try {
    const { start_date, end_date, limit = 10, offset = 0 } = req.query

    // Parse and validate query parameters
    const startDateOrNull = start_date ? new Date(start_date) : null
    const endDateOrNull = end_date ? new Date(end_date) : null
    const limitParsed = parseInt(limit, 10) || 10
    const offsetParsed = parseInt(offset, 10) || 0

    const productivityQuery = `
      WITH filtered_tasks AS (
      SELECT *
      FROM tasks
      WHERE ($1::timestamptz IS NULL OR created_at >= $1)
        AND ($2::timestamptz IS NULL OR created_at <= $2)
      ),
      agg AS (
      SELECT
        assigned_to AS user_id,
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (WHERE status='completed') AS completed_tasks,
        COUNT(*) FILTER (WHERE status='in_progress') AS in_progress_tasks,
        SUM(CASE WHEN status='completed' THEN actual_hours ELSE 0 END) AS total_hours_worked,
        AVG(CASE WHEN status='completed' AND estimated_hours > 0
          THEN actual_hours::float / estimated_hours END) AS efficiency_ratio,
        SUM(CASE WHEN status='completed' AND estimated_hours > 0 THEN actual_hours END) AS sum_actual_eff,
        SUM(CASE WHEN status='completed' AND estimated_hours > 0 THEN estimated_hours END) AS sum_est_eff
      FROM filtered_tasks
      GROUP BY assigned_to
      )
      SELECT
      u.id,
      u.username,
      u.first_name,
      u.last_name,
      COALESCE(a.total_tasks,0) AS total_tasks,
      COALESCE(a.completed_tasks,0) AS completed_tasks,
      COALESCE(a.in_progress_tasks,0) AS in_progress_tasks,
      a.efficiency_ratio,
      CASE WHEN a.sum_est_eff > 0
         THEN (a.sum_actual_eff::float / a.sum_est_eff)
         ELSE NULL
      END AS efficiency_ratio_weighted,
      COALESCE(a.total_hours_worked,0) AS total_hours_worked
      FROM users u
      LEFT JOIN agg a ON u.id = a.user_id
      WHERE u.is_active = true
      ORDER BY completed_tasks DESC, total_hours_worked DESC
      LIMIT $3 OFFSET $4;
    `
    const params = [
      startDateOrNull,
      endDateOrNull,
      limitParsed,
      offsetParsed
    ]

    const result = await query(productivityQuery, params)

    res.json({
      success: true,
      report: result.rows
    })
  } catch (error) {
    logger.error('Error generando reporte de productividad:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getProjectReport = async (req, res) => {
  try {
    const { status, owner_id, limit = 50, offset = 0 } = req.query

    // Validación / saneo de parámetros
    const allowedStatuses = new Set(['active', 'completed', 'archived', 'cancelled'])
    const statusParam = (typeof status === 'string' && status.trim() !== '' && allowedStatuses.has(status.trim()))
      ? status.trim()
      : null

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    let ownerIdParam = null
    if (typeof owner_id === 'string' && owner_id.trim() !== '') {
      if (!uuidRegex.test(owner_id.trim())) {
        return res.status(400).json({ error: 'owner_id debe ser un UUID válido' })
      }
      ownerIdParam = owner_id.trim()
    }

    const limitParsed = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500) // 1 .. 500
    const offsetParsed = Math.max(parseInt(offset, 10) || 0, 0)

    const projectReportQuery = `
      WITH base_projects AS (
        SELECT
          p.id,
          p.name,
          p.description,
          p.status,
          p.start_date,
          p.end_date,
          p.budget,
          p.created_at,
          p.owner_id
        FROM projects p
        WHERE ($1::text IS NULL OR p.status = $1)
          AND ($2::uuid IS NULL OR p.owner_id = $2::uuid)
      ),
      task_stats AS (
        SELECT
          t.project_id,
          COUNT(*) AS total_tasks,
          COUNT(*) FILTER (WHERE t.status = 'completed') AS completed_tasks,
          COUNT(*) FILTER (WHERE t.status = 'pending') AS pending_tasks,
          COUNT(*) FILTER (WHERE t.status = 'in_progress') AS in_progress_tasks,
          SUM(t.estimated_hours) AS total_estimated_hours,
          SUM(t.actual_hours) AS total_actual_hours
        FROM tasks t
        JOIN base_projects bp ON bp.id = t.project_id
        GROUP BY t.project_id
      )
      SELECT
        bp.id,
        bp.name,
        bp.description,
        bp.status,
        bp.start_date,
        bp.end_date,
        bp.budget,
        u.username AS owner_username,
        COALESCE(ts.total_tasks, 0) AS total_tasks,
        COALESCE(ts.completed_tasks, 0) AS completed_tasks,
        COALESCE(ts.pending_tasks, 0) AS pending_tasks,
        COALESCE(ts.in_progress_tasks, 0) AS in_progress_tasks,
        CASE
          WHEN COALESCE(ts.total_tasks, 0) > 0
            THEN (ts.completed_tasks::numeric / ts.total_tasks) * 100
          ELSE NULL
        END AS completion_percentage,
        COALESCE(ts.total_estimated_hours, 0) AS total_estimated_hours,
        COALESCE(ts.total_actual_hours, 0) AS total_actual_hours,
        CASE
          WHEN COALESCE(ts.total_estimated_hours, 0) > 0
            THEN (ts.total_actual_hours::numeric / ts.total_estimated_hours) * 100
          ELSE NULL
        END AS time_efficiency_percentage,
        COUNT(*) OVER() AS total_rows
      FROM base_projects bp
      LEFT JOIN task_stats ts ON ts.project_id = bp.id
      LEFT JOIN users u ON bp.owner_id = u.id
      ORDER BY bp.created_at DESC
      LIMIT $3 OFFSET $4;
    `

    const params = [
      statusParam,
      ownerIdParam,
      limitParsed,
      offsetParsed
    ]

    const result = await query(projectReportQuery, params)

    const totalRows = result.rows.length > 0 ? parseInt(result.rows[0].total_rows, 10) : 0

    res.json({
      success: true,
      projects: result.rows.map(r => ({
        ...r,
        completion_percentage: r.completion_percentage !== null ? Number(r.completion_percentage) : null,
        time_efficiency_percentage: r.time_efficiency_percentage !== null ? Number(r.time_efficiency_percentage) : null
      })),
      pagination: {
        limit: limitParsed,
        offset: offsetParsed,
        total: totalRows
      },
    })
  } catch (error) {
    logger.error('Error generando reporte de proyectos:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getTimeTrackingAnalysis = async (req, res) => {
  try {
    const {
      user_id,
      project_id,
      start_date,
      end_date,
      group_by = 'day' // day, week, month
    } = req.query

    let dateGrouping
    switch (group_by) {
      case 'week':
        dateGrouping = "DATE_TRUNC('week', te.start_time)"
        break
      case 'month':
        dateGrouping = "DATE_TRUNC('month', te.start_time)"
        break
      default:
        dateGrouping = "DATE_TRUNC('day', te.start_time)"
    }

    let whereClause = 'WHERE 1=1'
    const params = []
    let paramCount = 0

    if (user_id) {
      paramCount++
      whereClause += ` AND te.user_id = $${paramCount}`
      params.push(user_id)
    }

    if (project_id) {
      paramCount++
      whereClause += ` AND t.project_id = $${paramCount}`
      params.push(project_id)
    }

    if (start_date) {
      paramCount++
      whereClause += ` AND te.start_time >= $${paramCount}`
      params.push(start_date)
    }

    if (end_date) {
      paramCount++
      whereClause += ` AND te.start_time <= $${paramCount}`
      params.push(end_date)
    }

    const timeAnalysisQuery = `
      SELECT
        ${dateGrouping} as period,
        COUNT(DISTINCT te.user_id) as active_users,
        COUNT(te.id) as total_entries,
        SUM(te.hours_logged) as total_hours,
        AVG(te.hours_logged) as avg_hours_per_entry,
        COUNT(DISTINCT t.id) as tasks_worked_on,
        COUNT(DISTINCT t.project_id) as projects_involved
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      ${whereClause}
      GROUP BY ${dateGrouping}
      ORDER BY period DESC
    `

    const result = await query(timeAnalysisQuery, params)

    res.json({
      success: true,
      analysis: result.rows,
      group_by: group_by
    })
  } catch (error) {
    logger.error('Error en análisis de tiempo:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const importTasksFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo CSV requerido' })
    }

    const results = []
    const errors = []

    fs.createReadStream(req.file.path)
      .pipe(csvParser())
      .on('data', (data) => {
        results.push(data)
      })
      .on('end', async () => {
        try {
          // console.log(results, 'results');
          for (const row of results) {
            try {
              const insertTaskQuery = `
                INSERT INTO tasks (title, description, status, priority, project_id, assigned_to, created_by, estimated_hours)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              `

              await query(insertTaskQuery, [
                row.title || 'Tarea sin título',
                row.description || '',
                row.status || 'pending',
                row.priority || 'medium',
                row.project_id || null,
                row.assigned_to || req.user.userId,
                req.user.userId,
                parseInt(row.estimated_hours) || null
              ])
            } catch (error) {
              errors.push({
                row: row,
                error: error.message
              })
            }
          }

          res.json({
            success: true,
            message: `Procesadas ${results.length} filas`,
            imported: results.length - errors.length,
            errors: errors.length,
            error_details: errors
          })
        } catch (error) {
          logger.error('Error procesando CSV:', error.message)
          res.status(500).json({ error: 'Error procesando archivo' })
        }
      })
      .on('error', (error) => {
        logger.error('Error leyendo CSV:', error.message)
        res.status(500).json({ error: 'Error leyendo archivo CSV' })
      })

  } catch (error) {
    logger.error('Error en importación:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

