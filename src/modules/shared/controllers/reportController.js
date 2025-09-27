import { query, getClient } from '../../../config/database.js'
import logger from '../../../utils/logger.js'
import multer from 'multer'
import csvParser from 'csv-parser'
import fs from 'fs'

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})

export const upload = multer({ storage })

export const getDashboardStats = async (req, res) => {
  try {
    const totalUsersQuery = 'SELECT COUNT(*) as total FROM users WHERE is_active = true'
    const totalProjectsQuery = 'SELECT COUNT(*) as total FROM projects'
    const totalTasksQuery = 'SELECT COUNT(*) as total FROM tasks'
    const completedTasksQuery = "SELECT COUNT(*) as total FROM tasks WHERE status = 'completed'"

    const [usersResult, projectsResult, tasksResult, completedResult] = await Promise.all([
      query(totalUsersQuery),
      query(totalProjectsQuery),
      query(totalTasksQuery),
      query(completedTasksQuery)
    ])

    res.json({
      success: true,
      stats: {
        total_users: parseInt(usersResult.rows[0].total),
        total_projects: parseInt(projectsResult.rows[0].total),
        total_tasks: parseInt(tasksResult.rows[0].total),
        completed_tasks: parseInt(completedResult.rows[0].total)
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

    const productivityQuery = `
      SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
        AVG(CASE WHEN t.status = 'completed' AND t.estimated_hours > 0
            THEN t.actual_hours::float / t.estimated_hours
            ELSE NULL END) as efficiency_ratio,
        SUM(CASE WHEN t.status = 'completed' THEN t.actual_hours ELSE 0 END) as total_hours_worked
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to
      ${start_date ? "AND t.created_at >= $1" : ""}
      ${end_date ? `AND t.created_at <= $${start_date ? 2 : 1}` : ""}
      WHERE u.is_active = true
      GROUP BY u.id, u.username, u.first_name, u.last_name
      ORDER BY completed_tasks DESC, total_hours_worked DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const params = []
    if (start_date) params.push(start_date)
    if (end_date) params.push(end_date)

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
    const { status, owner_id } = req.query

    let whereClause = 'WHERE 1=1'
    const params = []
    let paramCount = 0

    if (status) {
      paramCount++
      whereClause += ` AND p.status = $${paramCount}`
      params.push(status)
    }

    if (owner_id) {
      paramCount++
      whereClause += ` AND p.owner_id = $${paramCount}`
      params.push(owner_id)
    }

    const projectReportQuery = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.status,
        p.start_date,
        p.end_date,
        p.budget,
        u.username as owner_username,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
        ROUND(
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::numeric /
          NULLIF(COUNT(t.id), 0) * 100, 2
        ) as completion_percentage,
        SUM(t.estimated_hours) as total_estimated_hours,
        SUM(t.actual_hours) as total_actual_hours,
        CASE
          WHEN SUM(t.estimated_hours) > 0
          THEN ROUND((SUM(t.actual_hours)::numeric / SUM(t.estimated_hours)) * 100, 2)
          ELSE 0
        END as time_efficiency_percentage
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN tasks t ON p.id = t.project_id
      ${whereClause}
      GROUP BY p.id, p.name, p.description, p.status, p.start_date, p.end_date, p.budget, u.username
      ORDER BY p.created_at DESC
    `

    const result = await query(projectReportQuery, params)

    res.json({
      success: true,
      projects: result.rows
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

