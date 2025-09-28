import { z } from 'zod'
import { statusEnum, priorityEnum } from './task.common.schema.js'

export const taskListQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1).refine(v => Number.isInteger(v) && v > 0, 'page debe ser entero > 0'),
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 10).refine(v => Number.isInteger(v) && v > 0 && v <= 100, 'limit inválido'),
  sort_by: z.string().optional().default('created_at'),
  order: z.string().optional().transform(v => (v || '').toLowerCase() === 'asc' ? 'asc' : 'desc'),
  status: statusEnum.optional(),
  priority: priorityEnum.optional(),
  assigned_to: z.string().uuid('assigned_to debe ser UUID').optional(),
  project_id: z.string().uuid('project_id debe ser UUID').optional()
}).strict()
