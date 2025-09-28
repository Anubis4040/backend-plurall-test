import express from 'express'
import {
  getDashboardStats,
  getUserProductivityReport,
  getProjectReport,
  getTimeTrackingAnalysis,
  importTasksFromCSV,
  getUserProductivityRanking,
  exportTasksToCSV,
  upload
} from '../controllers/reportController.js'
import { authenticateToken, authorizeRoles } from '../../auth/middlewares/auth.js'
import validate from '../../shared/middlewares/validate.js'
import { productivityReportQuerySchema } from '../schemas/reports.productivity.schema.js'
import { projectReportQuerySchema } from '../schemas/reports.projects.schema.js'
import { timeAnalysisQuerySchema } from '../schemas/reports.timeAnalysis.schema.js'
import { productivityRankingQuerySchema } from '../schemas/reports.ranking.schema.js'

const router = express.Router()

router.get('/dashboard', authenticateToken, getDashboardStats)

router.get('/productivity', authenticateToken, authorizeRoles('manager', 'admin'), validate({ query: productivityReportQuerySchema }), getUserProductivityReport)

router.get('/projects', authenticateToken, validate({ query: projectReportQuerySchema }), getProjectReport)

router.get('/time-analysis', authenticateToken, validate({ query: timeAnalysisQuerySchema }), getTimeTrackingAnalysis)

router.get('/productivity-ranking', authenticateToken, authorizeRoles('manager', 'admin'), validate({ query: productivityRankingQuerySchema }), getUserProductivityRanking)

router.post('/import-tasks', authenticateToken, upload.single('csvFile'), importTasksFromCSV)

// Export síncrono de tareas a CSV (variante 3A)
router.get('/export-tasks', authenticateToken, exportTasksToCSV)


export default router