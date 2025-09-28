import { z } from 'zod'

export const notificationIdParamSchema = z.object({
  id: z.string().uuid('Formato de ID inválido')
})

export const notificationListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sort_by: z.enum(['created_at', 'title', 'is_read']).optional(),
  order: z.enum(['ASC', 'DESC']).optional(),
  unread: z.string().transform(v => v === 'true').optional()
})
