import { query } from '../../../config/database.js'
import logger from '../../../utils/logger.js'
import { getPaginationParams, buildSortClause, buildMeta, paginateQuery } from '../../../utils/pagination.js'

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
    logger.error(`Error creando tarea: ${error.message}`)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getTasks = async (req, res) => {
  try {
    const { status, priority, assigned_to, project_id, sort_by, order } = req.query

    const { page, limit, offset } = getPaginationParams(req.query, { defaultLimit: 10, maxLimit: 100 })

    const allowedSort = ['created_at', 'due_date', 'priority', 'estimated_hours', 'actual_hours']
    const sortClause = buildSortClause(sort_by, allowedSort, order, 'created_at')

    const filters = []
    const params = []

    if (status) {
      params.push(status)
      filters.push(`t.status = $${params.length}`)
    }
    if (priority) {
      params.push(priority)
      filters.push(`t.priority = $${params.length}`)
    }
    if (assigned_to) {
      params.push(assigned_to)
      filters.push(`t.assigned_to = $${params.length}`)
    }
    if (project_id) {
      params.push(project_id)
      filters.push(`t.project_id = $${params.length}`)
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const baseSelect = `
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
      ${where}`

    const { rows, total } = await paginateQuery({
      queryFn: query,
      baseSelect,
      params,
      options: { sortClause, limit, offset }
    })

    res.json({
      success: true,
      tasks: rows,
      pagination: buildMeta(total, page, limit)
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
    // Campos permitidos para actualización
    const allowed = ['title','description','status','priority','assigned_to','due_date','estimated_hours','actual_hours']
    const entries = Object.entries(req.body).filter(([k]) => allowed.includes(k))

    if (entries.length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' })
    }

    // Construcción dinámica de SET
    const setFragments = entries.map(([k], idx) => `${k} = $${idx + 1}`)
    const values = entries.map(([, v]) => v)

    // Manejo especial de completed_at si status -> 'completed'
    // Construimos un fragmento adicional para la consulta
    let completedAtFragment = ''
    const statusIndex = entries.findIndex(([k]) => k === 'status')
    if (statusIndex !== -1) {
      // El valor de status estará en values[statusIndex]
      const newStatus = values[statusIndex]
      if (newStatus === 'completed') {
        completedAtFragment = ', completed_at = CASE WHEN completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END'
      }
    }

    // Siempre actualizamos updated_at
    const setClause = setFragments.join(', ') + completedAtFragment
    values.push(id)
    const updateQuery = `UPDATE tasks SET ${setClause} WHERE id = $${values.length} RETURNING *`

    const result = await query(updateQuery, values)
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' })
    }

    logger.info(`Tarea actualizada: ${result.rows[0].title}`)
    res.json({ success: true, message: 'Tarea actualizada exitosamente', task: result.rows[0] })
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

