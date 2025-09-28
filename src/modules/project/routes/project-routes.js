import express from 'express'
import { authenticateToken, authorizeRoles } from '../../auth/middlewares/auth.js'
import validate from '../../shared/middlewares/validate.js'
import { projectTimelineParamsSchema, projectTimelineQuerySchema } from '../schemas/project.timeline.schema.js'
import { getProjectTimeline } from '../controllers/projectController.js'

const router = express.Router()

// Timeline de actividad del proyecto
router.get(
  '/:projectId/timeline',
  authenticateToken,
  authorizeRoles('admin', 'manager'), // Ajustar si se requiere restricción más fina
  validate({ params: projectTimelineParamsSchema, query: projectTimelineQuerySchema }),
  getProjectTimeline
)

export default router
