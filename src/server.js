import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { connectDB } from './config/database.js'
import logger from './utils/logger.js'
import authRoutes from './modules/auth/routes/auth.js'
import userRoutes from './modules/user/routes/user-routes.js'
import taskRoutes from './modules/task/routes/tasks.js'
import reportRoutes from './modules/reports/routes/reports.js'
import projectRoutes from './modules/project/routes/project-routes.js'
import { errorHandler } from './modules/shared/middlewares/errorHandler.js'
import { rateLimiter } from './modules/shared/middlewares/rateLimiter.js'
import { PORT, NODE_ENV, DB_HOST } from './config/env.js'
import YAML from 'yamljs'
import swaggerUi from "swagger-ui-express";

const swaggerDocument = YAML.load("./openapi.yaml");

const app = express()

logger.info(`Boot env => NODE_ENV=${NODE_ENV} PORT=${PORT} DB_HOST=${DB_HOST}`)

app.use(cors())
app.use(helmet())
app.use(express.json())


app.use('/api', rateLimiter)

connectDB()

const apiRouter = express.Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use('/users', userRoutes)
apiRouter.use('/tasks', taskRoutes)
apiRouter.use('/reports', reportRoutes)
apiRouter.use('/projects', projectRoutes)

app.use('/api', apiRouter)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`Servidor corriendo en puerto ${PORT}`)
  // console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`)
})