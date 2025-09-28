import { z } from 'zod'

// Query params para listado de usuarios
export const userListQuerySchema = z.object({
  page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1).refine(v => Number.isInteger(v) && v > 0, 'page debe ser entero > 0'),
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 20).refine(v => Number.isInteger(v) && v > 0 && v <= 100, 'limit inválido'),
  sort_by: z.string().optional().default('created_at'),
  order: z.string().optional().transform(v => (v || '').toLowerCase() === 'asc' ? 'asc' : 'desc'),
  search: z.string().trim().min(1, 'search mínimo 1 char').max(100, 'search máximo 100 chars').optional()
}).strict()
