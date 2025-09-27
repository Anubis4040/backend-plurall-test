// import express from 'express'
// // import User from '../models/User.js'
// import { authenticateToken, authorizeRoles } from '../middleware/auth.js'
// import logger from '../utils/logger.js'

// const router = express.Router()

// router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
//   try {
//     const users = await User.find({})

//     res.json({
//       success: true,
//       users: users
//     })
//   } catch (error) {
//     logger.error('Error obteniendo usuarios:', error.message)
//     res.status(500).json({ error: 'Error interno del servidor' })
//   }
// })

// router.get('/:id', authenticateToken, async (req, res) => {
//   try {
//     const { id } = req.params

//     const user = await User.findById(id)

//     if (!user) {
//       return res.status(404).json({ error: 'Usuario no encontrado' })
//     }

//     res.json({
//       success: true,
//       user
//     })
//   } catch (error) {
//     logger.error('Error obteniendo usuario:', error.message)
//     res.status(500).json({ error: 'Error interno del servidor' })
//   }
// })

// router.put('/:id', authenticateToken, async (req, res) => {
//   try {
//     const { id } = req.params
//     const updates = req.body

//     const user = await User.findByIdAndUpdate(
//       id,
//       updates,
//       { new: true, runValidators: false }
//     )

//     if (!user) {
//       return res.status(404).json({ error: 'Usuario no encontrado' })
//     }

//     res.json({
//       success: true,
//       message: 'Usuario actualizado exitosamente',
//       user
//     })
//   } catch (error) {
//     logger.error('Error actualizando usuario:', error.message)
//     res.status(500).json({ error: 'Error interno del servidor' })
//   }
// })

// router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
//   try {
//     const { id } = req.params

//     const user = await User.findByIdAndDelete(id)

//     if (!user) {
//       return res.status(404).json({ error: 'Usuario no encontrado' })
//     }

//     logger.info(`Usuario eliminado: ${user.username}`)

//     res.json({
//       success: true,
//       message: 'Usuario eliminado exitosamente'
//     })
//   } catch (error) {
//     logger.error('Error eliminando usuario:', error.message)
//     res.status(500).json({ error: 'Error interno del servidor' })
//   }
// })

// export default router