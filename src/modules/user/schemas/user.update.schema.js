import { userBaseSchema } from './user.common.schema.js'

// Permitir actualización parcial solamente de campos definidos en base
export const userUpdateSchema = userBaseSchema
  .pick({
    username: true,
    email: true,
    role: true,
    first_name: true,
    last_name: true,
    avatar_url: true,
    is_active: true,
    email_verified: true
  })
  .partial()
  .refine(obj => Object.keys(obj).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar'
  })
