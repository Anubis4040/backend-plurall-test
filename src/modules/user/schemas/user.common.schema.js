import { z } from 'zod'

export const userIdParamSchema = z.object({
  id: z.string().uuid('id debe ser un UUID válido')
})

const usernameSchema = z.string()
  .min(3, 'username mínimo 3 caracteres')
  .max(50, 'username máximo 50')
  .regex(/^[a-zA-Z0-9_]+$/, 'username solo permite letras, números y guion bajo')

const emailSchema = z.string()
  .email('Email inválido')
  .max(255, 'Email demasiado largo')
  .transform(v => v.toLowerCase().trim())

const roleSchema = z.enum(['user','admin','manager']).default('user')

export const userBaseSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  first_name: z.string().min(1, 'first_name requerido').max(100).optional(),
  last_name: z.string().min(1, 'last_name requerido').max(100).optional(),
  role: roleSchema,
  avatar_url: z.string().url('avatar_url debe ser URL válida').optional().nullable(),
  is_active: z.boolean().default(true).optional(),
  email_verified: z.boolean().default(true).optional()
}).strict()
