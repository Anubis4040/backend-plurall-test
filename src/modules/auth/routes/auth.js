import express from 'express'
import { register, login, getProfile } from '../controllers/authController.js'
import { authenticateToken } from '../middlewares/auth.js'
import { authLimiter } from '../../shared/middlewares/rateLimiter.js'
import validate from '../../shared/middlewares/validate.js'
import { authRegisterSchema } from '../schemas/auth.register.schema.js'
import { authLoginSchema } from '../schemas/auth.login.schema.js'

const router = express.Router()

router.post('/register', validate({ body: authRegisterSchema }), register) 
router.post('/login', authLimiter, validate({ body: authLoginSchema }), login) 
router.get('/profile', authenticateToken, getProfile)


export default router