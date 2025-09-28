import express from 'express'
import { getNotifications, markNotificationAsRead } from '../controllers/notificationController.js'
import { authenticateToken } from '../../auth/middlewares/auth.js'
import validate from '../../shared/middlewares/validate.js'
import { notificationIdParamSchema, notificationListQuerySchema } from '../schemas/notifications.common.schema.js'

const router = express.Router()

router.get('/', authenticateToken, validate({ query: notificationListQuerySchema }), getNotifications)
router.put('/:id/read', authenticateToken, validate({ params: notificationIdParamSchema }), markNotificationAsRead)

export default router
