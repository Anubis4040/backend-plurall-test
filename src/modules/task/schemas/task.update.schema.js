import { taskBaseSchema } from './task.common.schema.js'

export const taskUpdateSchema = taskBaseSchema
  .pick({
    title: true,
    description: true,
    status: true,
    priority: true,
    assigned_to: true,
    due_date: true,
    estimated_hours: true,
    actual_hours: true,
    project_id: true
  })
  .partial()
  .refine(obj => Object.keys(obj).length > 0, { message: 'Debe enviar al menos un campo para actualizar' })
