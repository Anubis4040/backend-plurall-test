import express from 'express'
import {
  getDashboardStats,
  getUserProductivityReport,
  getProjectReport,
  getTimeTrackingAnalysis,
  importTasksFromCSV,
  upload
} from '../controllers/reportController.js'
import { authenticateToken, authorizeRoles } from '../../auth/middlewares/auth.js'

const router = express.Router()

router.get('/dashboard', authenticateToken, getDashboardStats)

router.get('/productivity', authenticateToken, authorizeRoles('manager', 'admin'), getUserProductivityReport)

router.get('/projects', authenticateToken, getProjectReport)

router.get('/time-analysis', authenticateToken, getTimeTrackingAnalysis)

router.post('/import-tasks', authenticateToken, upload.single('csvFile'), importTasksFromCSV)


export default router