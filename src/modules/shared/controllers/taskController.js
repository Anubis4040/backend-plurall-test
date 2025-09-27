import { query } from '../config/database.js'
import logger from '../utils/logger.js'

export const createTask = async (req, res) => {
  try {
    const { title, description, project_id, assigned_to, priority, due_date, estimated_hours } = req.body
    const created_by = req.user.userId

    if (!title) {
      return res.status(400).json({ error: 'Título es requerido' })
    }

    const insertQuery = `
      INSERT INTO tasks (title, description, project_id, assigned_to, created_by, priority, due_date, estimated_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const result = await query(insertQuery, [
      title,
      description,
      project_id,
      assigned_to || created_by,
      created_by,
      priority || 'medium',
      due_date,
      estimated_hours
    ])

    const task = result.rows[0]
    logger.info(`Nueva tarea creada: ${title}`)

    res.status(201).json({
      success: true,
      message: 'Tarea creada exitosamente',
      task
    })
  } catch (error) {
    logger.error('Error creando tarea:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      assigned_to,
      project_id,
      sort_by = 'created_at',
      order = 'DESC'
    } = req.query

    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const queryParams = []
    let paramCount = 0

    if (status) {
      paramCount++
      whereClause += ` AND t.status = $${paramCount}`
      queryParams.push(status)
    }

    if (priority) {
      paramCount++
      whereClause += ` AND t.priority = $${paramCount}`
      queryParams.push(priority)
    }

    if (assigned_to) {
      paramCount++
      whereClause += ` AND t.assigned_to = $${paramCount}`
      queryParams.push(assigned_to)
    }

    if (project_id) {
      paramCount++
      whereClause += ` AND t.project_id = $${paramCount}`
      queryParams.push(project_id)
    }

    const tasksQuery = `
      SELECT
        t.*,
        u1.username as assigned_username,
        u1.first_name as assigned_first_name,
        u1.last_name as assigned_last_name,
        u2.username as created_by_username,
        p.name as project_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN projects p ON t.project_id = p.id
      ${whereClause}
      ORDER BY t.${sort_by} ${order}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `

    queryParams.push(limit, offset)

    const result = await query(tasksQuery, queryParams)

    res.json({
      success: true,
      tasks: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: undefined
      }
    })
  } catch (error) {
    logger.error('Error obteniendo tareas:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params

    const taskQuery = `
      SELECT
        t.*,
        u1.username as assigned_username,
        u1.first_name as assigned_first_name,
        u1.last_name as assigned_last_name,
        u1.email as assigned_email,
        u2.username as created_by_username,
        p.name as project_name,
        p.description as project_description
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `

    const result = await query(taskQuery, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' })
    }

    const task = result.rows[0]

    const commentsQuery = `
      SELECT
        tc.*,
        u.username,
        u.first_name,
        u.last_name
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = $1
      ORDER BY tc.created_at ASC
    `

    const commentsResult = await query(commentsQuery, [id])
    task.comments = commentsResult.rows

    res.json({
      success: true,
      task
    })
  } catch (error) {
    logger.error('Error obteniendo tarea:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, status, priority, assigned_to, due_date, estimated_hours, actual_hours } = req.body

    const updateQuery = `
      UPDATE tasks
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        assigned_to = COALESCE($5, assigned_to),
        due_date = COALESCE($6, due_date),
        estimated_hours = COALESCE($7, estimated_hours),
        actual_hours = COALESCE($8, actual_hours),
        updated_at = CURRENT_TIMESTAMP,
        completed_at = CASE WHEN $3 = 'completed' AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $9
      RETURNING *
    `

    const result = await query(updateQuery, [
      title, description, status, priority, assigned_to, due_date, estimated_hours, actual_hours, id
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' })
    }

    logger.info(`Tarea actualizada: ${result.rows[0].title}`)

    res.json({
      success: true,
      message: 'Tarea actualizada exitosamente',
      task: result.rows[0]
    })
  } catch (error) {
    logger.error('Error actualizando tarea:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params

    const deleteQuery = 'DELETE FROM tasks WHERE id = $1 RETURNING *'
    const result = await query(deleteQuery, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' })
    }

    logger.info(`Tarea eliminada: ${result.rows[0].title}`)

    res.json({
      success: true,
      message: 'Tarea eliminada exitosamente'
    })
  } catch (error) {
    logger.error('Error eliminando tarea:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const addComment = async (req, res) => {
  try {
    const { id } = req.params
    const { content } = req.body
    const user_id = req.user.userId

    if (!content) {
      return res.status(400).json({ error: 'Contenido del comentario requerido' })
    }

    const insertCommentQuery = `
      INSERT INTO task_comments (task_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `

    const result = await query(insertCommentQuery, [id, user_id, content])

    res.json({
      success: true,
      message: 'Comentario agregado exitosamente',
      comment: result.rows[0]
    })
  } catch (error) {
    logger.error('Error agregando comentario:', error.message)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

