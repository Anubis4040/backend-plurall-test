import { query } from '../../../config/database.js'
import logger from '../../../utils/logger.js'

/**
 * Estructura esperada para createNotification:
 * { userId, type, title, message, relatedId }
 */
export async function createNotification({ userId, type, title, message, relatedId = null }) {
  try {
    if (!userId) throw new Error('userId requerido')
    if (!type) throw new Error('type requerido')
    if (!title) throw new Error('title requerido')
    if (!message) throw new Error('message requerido')

    const insert = `
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `
    const result = await query(insert, [userId, type, title, message, relatedId])
    logger.debug('Notificación creada', { id: result.rows[0].id, type })
    return result.rows[0]
  } catch (err) {
    logger.appError('Fallo creando notificación', err, { userId, type })
    return null // Evitar propagar y romper flujo de negocio
  }
}

// export async function notifyUsers({ userIds = [], type, build }) {
//   // build: (userId) => { title, message, relatedId }
//   const creations = userIds.map(async (uid) => {
//     try {
//       const { title, message, relatedId } = build(uid)
//       return await createNotification({ userId: uid, type, title, message, relatedId })
//     } catch (err) {
//       logger.appError('Error en build de notificación para usuario', err, { uid, type })
//       return null
//     }
//   })
//   return Promise.all(creations)
// }

export default { createNotification }
