import { z } from 'zod'

export const productivityRankingQuerySchema = z.object({
  start_date: z
    .string()
    .datetime({ offset: true })
    .transform(v => new Date(v))
    .optional()
    .nullable(),
  end_date: z
    .string()
    .datetime({ offset: true })
    .transform(v => new Date(v))
    .optional()
    .nullable(),
  page: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 1))
    .refine(v => Number.isInteger(v) && v > 0, 'page inválida'),
  limit: z
    .string()
    .optional()
    .transform(v => (v ? parseInt(v, 10) : 20))
    .refine(v => Number.isInteger(v) && v > 0 && v <= 100, 'limit inválido')
}).strict().superRefine((d, ctx) => {
  if (d.start_date && d.end_date && d.start_date > d.end_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['start_date'],
      message: 'start_date no puede ser mayor que end_date'
    })
  }
})
