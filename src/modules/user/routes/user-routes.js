import express from 'express'
import { authenticateToken, authorizeRoles } from '../../auth/middlewares/auth.js'
import { listUsers, getUser, createUser, updateUser, deleteUser } from '../controllers/userController.js'
import validate from '../../shared/middlewares/validate.js'
import { userIdParamSchema } from '../schemas/user.common.schema.js'
import { userCreateSchema } from '../schemas/user.create.schema.js'
import { userUpdateSchema } from '../schemas/user.update.schema.js'
import { userListQuerySchema } from '../schemas/user.query.schema.js'

// Prefijo sugerido en server.js: /api/users
// Endpoints:
// GET /        -> lista paginada (requires auth + role admin|manager)
// GET /:id     -> detalle (auth)
// POST /       -> crear usuario (solo admin)
// PUT /:id     -> actualizar (admin o el propio usuario)
// DELETE /:id  -> eliminar (solo admin)

const router = express.Router()

router.get('/', authenticateToken, authorizeRoles('admin','manager'), validate({ query: userListQuerySchema }), listUsers)
router.get('/:id', authenticateToken, validate({ params: userIdParamSchema }), getUser)
router.post('/', authenticateToken, authorizeRoles('admin'), validate({ body: userCreateSchema }), createUser)

// Middleware inline para permitir que el propio usuario actualice sus datos (excepto role) si no es admin
router.put('/:id', authenticateToken, validate({ params: userIdParamSchema, body: userUpdateSchema }), (req, res, next) => {
	// Control de autorización dinámica después de validar inputs
	if (req.user.role === 'admin') return next()
	if (req.user.userId !== req.params.id) {
		return res.status(403).json({ error: 'No puedes actualizar otros usuarios' })
	}
	// Evitar que un usuario no admin cambie su role
	if (req.body.role) delete req.body.role
	next()
}, updateUser)

router.delete('/:id', authenticateToken, authorizeRoles('admin'), validate({ params: userIdParamSchema }), deleteUser)

export default router
