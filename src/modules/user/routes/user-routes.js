import express from 'express'
import { authenticateToken, authorizeRoles } from '../../auth/middlewares/auth.js'
import { listUsers, getUser, createUser, updateUser, deleteUser } from '../controllers/userController.js'

// Prefijo sugerido en server.js: /api/users
// Endpoints:
// GET /        -> lista paginada (requires auth + role admin|manager)
// GET /:id     -> detalle (auth)
// POST /       -> crear usuario (solo admin)
// PUT /:id     -> actualizar (admin o el propio usuario)
// DELETE /:id  -> eliminar (solo admin)

const router = express.Router()

router.get('/', authenticateToken, authorizeRoles('admin','manager'), listUsers)
router.get('/:id', authenticateToken, getUser)
router.post('/', authenticateToken, authorizeRoles('admin'), createUser)

// Middleware inline para permitir que el propio usuario actualice sus datos (excepto role) si no es admin
router.put('/:id', authenticateToken, (req, res, next) => {
	if (req.user.role === 'admin') return next()
	if (req.user.userId !== req.params.id) {
		return res.status(403).json({ error: 'No puedes actualizar otros usuarios' })
	}
	// Evitar que un usuario no admin cambie su role
	if (req.body.role) delete req.body.role
	next()
}, updateUser)

router.delete('/:id', authenticateToken, authorizeRoles('admin'), deleteUser)

export default router
