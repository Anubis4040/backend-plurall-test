import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { connectDB } from './config/database.js'
import logger from './utils/logger.js'
import authRoutes from './routes/auth.js'
// import userRoutes from './routes/users.js'
import taskRoutes from './routes/tasks.js'
import reportRoutes from './routes/reports.js'
import { errorHandler } from './middleware/errorHandler.js'
import { rateLimiter } from './middleware/rateLimiter.js'
import { PORT, NODE_ENV, DB_HOST } from './config/env.js'

const app = express()

logger.info(`Boot env => NODE_ENV=${NODE_ENV} PORT=${PORT} DB_HOST=${DB_HOST}`)

app.use(cors())
app.use(helmet())
app.use(express.json())


app.use('/api', rateLimiter)

connectDB()

app.use('/api/auth', authRoutes)
// app.use('/api/users', userRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/reports', reportRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`Servidor corriendo en puerto ${PORT}`)
  console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`)
})