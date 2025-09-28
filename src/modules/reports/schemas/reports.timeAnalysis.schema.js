import { z } from 'zod'

export const timeAnalysisQuerySchema = z.object({
  user_id: z.string().uuid('user_id debe ser UUID').optional(),
  project_id: z.string().uuid('project_id debe ser UUID').optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).optional(),
  group_by: z.enum(['day','week','month']).default('day').optional()
}).strict().superRefine((d, ctx) => {
  if (d.start_date && d.end_date && new Date(d.start_date) > new Date(d.end_date)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['start_date'],
      message: 'start_date no puede ser mayor que end_date'
    })
  }
})
