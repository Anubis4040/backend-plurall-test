import express from 'express'
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment
} from '../controllers/taskController.js'
import { authenticateToken, authorizeRoles } from '../../auth/middlewares/auth.js'
import validate from '../../shared/middlewares/validate.js'
import { taskIdParamSchema } from '../schemas/task.common.schema.js'
import { taskCreateSchema } from '../schemas/task.create.schema.js'
import { taskUpdateSchema } from '../schemas/task.update.schema.js'
import { taskListQuerySchema } from '../schemas/task.query.schema.js'

const router = express.Router()

router.post('/', authenticateToken, validate({ body: taskCreateSchema }), createTask)
router.get('/', authenticateToken, validate({ query: taskListQuerySchema }), getTasks)
router.get('/:id', authenticateToken, validate({ params: taskIdParamSchema }), getTaskById)

router.put('/:id', authenticateToken , authorizeRoles('admin', 'manager'), validate({ params: taskIdParamSchema, body: taskUpdateSchema }), updateTask)
router.delete('/:id', authenticateToken, validate({ params: taskIdParamSchema }), deleteTask)

router.post('/:id/comments', authenticateToken, validate({ params: taskIdParamSchema, body: taskCreateSchema.pick({ description: false }).extend({ content: taskCreateSchema.shape.title.optional().transform(v=>v).optional() }) }), addComment)


export default router