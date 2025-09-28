import { taskBaseSchema } from './task.common.schema.js'

// Para agregar futuras propiedades de forma controlada
export const taskCreateSchema = taskBaseSchema.extend({
  title: taskBaseSchema.shape.title
})
