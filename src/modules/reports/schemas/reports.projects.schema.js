import { z } from 'zod'

const statusEnum = z.enum(['active','completed','archived','cancelled'])

export const projectReportQuerySchema = z.object({
  status: statusEnum.optional(),
  owner_id: z.string().uuid('owner_id debe ser UUID').optional(),
  page: z.string().optional().transform(v => v ? parseInt(v,10) : 1).refine(v => Number.isInteger(v) && v > 0, 'page inválida'),
  limit: z.string().optional().transform(v => v ? parseInt(v,10) : 20).refine(v => Number.isInteger(v) && v > 0 && v <= 100, 'limit inválido')
}).strict()
