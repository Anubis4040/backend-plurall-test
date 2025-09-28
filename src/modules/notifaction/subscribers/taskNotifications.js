import bus from '../../../utils/eventBus.js'
import logger from '../../../utils/logger.js'
import NotificationTypes from '../notification.types.js'
import { createNotification } from '../services/notificationService.js'

// Listener helper para capturar errores y no reventar el proceso
function safeOn(event, handler) {
  bus.on(event, async (payload) => {
    try {
      await handler(payload)
    } catch (err) {
      logger.appError(`Error procesando listener de evento ${event}`, err)
    }
  })
}

// Tarea creada
safeOn('task.created', async ({ task, actor }) => {
  if (!task?.assigned_to) return
  await createNotification({
    userId: task.assigned_to,
    type: NotificationTypes.TASK_ASSIGNED,
    title: 'Nueva tarea asignada',
    message: `Se te asignó la tarea "${task.title}"`,
    relatedId: task.id
  })
})

// Cambio de estado
safeOn('task.status.changed', async ({ task, oldStatus, newStatus, actor }) => {
  if (!task?.assigned_to) return
  await createNotification({
    userId: task.assigned_to,
    type: NotificationTypes.TASK_STATUS_CHANGED,
    title: 'Cambio de estado de tarea',
    message: `La tarea "${task.title}" cambió de ${oldStatus} a ${newStatus}`,
    relatedId: task.id
  })
})

// Reasignación (cuando assigned_to cambia en update)
safeOn('task.assigned', async ({ task, previousAssignee, newAssignee, actor }) => {
  if (newAssignee) {
    await createNotification({
      userId: newAssignee,
      type: NotificationTypes.TASK_ASSIGNED,
      title: 'Tarea asignada',
      message: `Se te asignó la tarea "${task.title}"`,
      relatedId: task.id
    })
  }
})

// Nuevo comentario
safeOn('task.comment.added', async ({ taskId, comment, actor }) => {
  // Aquí podríamos obtener la tarea para saber assigned_to, simplificado: si comment.targetUserId existe
  if (comment?.user_id === actor?.userId) return // Evitar notificar al que comenta, si se requiere
  // Podrías enriquecer: buscar tarea -> assigned_to, created_by
})

logger.info('Subscribers de tareas para notificaciones registrados')
