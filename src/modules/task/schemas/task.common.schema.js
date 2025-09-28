import { z } from 'zod'

export const taskIdParamSchema = z.object({
  id: z.string().uuid('id debe ser UUID válido')
})

// Enums provenientes del schema.sql
export const statusEnum = z.enum(['pending','in_progress','completed','cancelled'])
export const priorityEnum = z.enum(['low','medium','high','urgent'])

export const taskBaseSchema = z.object({
  title: z.string().min(1, 'title requerido').max(255, 'title muy largo'),
  description: z.string().max(5000, 'description muy larga').optional().nullable(),
  project_id: z.string().uuid('project_id debe ser UUID').optional(),
  assigned_to: z.string().uuid('assigned_to debe ser UUID').optional(),
  priority: priorityEnum.default('medium').optional(),
  due_date: z.string().datetime({ offset: true }).optional(), // ISO 8601
  estimated_hours: z.number().int('estimated_hours debe ser entero').positive('estimated_hours > 0').max(200).optional(),
  actual_hours: z.number().int('actual_hours debe ser entero').positive('actual_hours > 0').max(200).optional(),
  status: statusEnum.default('pending').optional()
}).strict()
