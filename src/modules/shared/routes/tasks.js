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

const router = express.Router()

router.post('/', authenticateToken, createTask)
router.get('/', authenticateToken, getTasks)
router.get('/:id', authenticateToken, getTaskById)

router.put('/:id', authenticateToken, updateTask)
router.delete('/:id', authenticateToken, deleteTask)

router.post('/:id/comments', authenticateToken, addComment)


export default router