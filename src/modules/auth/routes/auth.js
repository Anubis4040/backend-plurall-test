import express from 'express'
import { register, login, getProfile } from '../../../controllers/authController.js'
import { authenticateToken } from '../../../middleware/auth.js'
import { authLimiter } from '../../../middleware/rateLimiter.js'

const router = express.Router()

router.post('/register', register) // Listo 
router.post('/login', authLimiter, login) // Listo
router.get('/profile', authenticateToken, getProfile) // Listo


export default router