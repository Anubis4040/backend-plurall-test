import { z } from 'zod'

export const authLoginSchema = z.object({
  email: z.string().email('Email inválido').max(255).transform(v => v.toLowerCase().trim()),
  password: z.string().min(1,'Password requerido')
}).strict()
