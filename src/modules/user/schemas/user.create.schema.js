import { z } from 'zod'
import { userBaseSchema } from './user.common.schema.js'

export const userCreateSchema = userBaseSchema.extend({
  password: z.string()
    .min(8, 'Password mínimo 8 caracteres')
    .max(64, 'Password máximo 64 caracteres')
    // TODO: Remove this comment and enforce stronger password rules
    // .regex(/[A-Z]/, 'Password debe incluir al menos una mayúscula')
    // .regex(/[a-z]/, 'Password debe incluir al menos una minúscula')
    .regex(/\d/, 'Password debe incluir al menos un número')
})
