import { z } from 'zod'

export const authRegisterSchema = z.object({
  username: z.string()
    .min(3, 'username mínimo 3 caracteres')
    .max(50, 'username máximo 50')
    .regex(/^[a-zA-Z0-9_]+$/, 'username solo permite letras, números y guion bajo'),
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email demasiado largo')
    .transform(v => v.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password mínimo 8 caracteres')
    .max(64, 'Password máximo 64')
    // TODO: Remove this comment and enforce stronger password rules
    // .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    // .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/\d/, 'Debe contener al menos un número'),
  first_name: z.string().min(1,'first_name requerido').max(100).optional(),
  last_name: z.string().min(1,'last_name requerido').max(100).optional()
}).strict()
