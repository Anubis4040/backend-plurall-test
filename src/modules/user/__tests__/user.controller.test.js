import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals'
import bcrypt from 'bcryptjs'

// Factory para mockear módulo DB antes de importar el controller (ESM constraint)
const mockQuery = jest.fn()
jest.unstable_mockModule('../../../config/database.js', () => ({
  query: mockQuery,
  connectDB: jest.fn(),
  // default export dummy (pool)
  default: {}
}))

let createUser

// Import dinámico después de registrar mocks ESM
beforeAll(async () => {
  ({ createUser } = await import('../controllers/userController.js'))
})

// Mock de response Express sencillo
function createMockRes() {
  const res = {}
  res.statusCode = 200
  res.status = (code) => { res.statusCode = code; return res }
  res.jsonPayload = null
  res.json = (payload) => { res.jsonPayload = payload; return res }
  return res
}

describe('User Controller - createUser', () => {
  beforeEach(() => {
    mockQuery.mockReset().mockResolvedValue({ rows: [] })
    if (!jest.isMockFunction(bcrypt.hash)) {
      bcrypt.hash = jest.fn()
    } else {
      bcrypt.hash.mockReset()
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('crea usuario exitosamente', async () => {
    const passwordHash = 'hashed-pass'
    bcrypt.hash.mockResolvedValue(passwordHash)
    const fakeRow = { id: '1', username: 'user1', email: 'user@mail.com', role: 'user' }
    mockQuery.mockResolvedValue({ rows: [fakeRow] })

    const req = { body: { username: 'user1', email: 'user@mail.com', password: 'secret123', role: 'user', first_name: 'Test', last_name: 'User' } }
    const res = createMockRes()

    await createUser(req, res)

    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', expect.any(Number))
    expect(mockQuery).toHaveBeenCalled()
    expect(res.statusCode).toBe(201)
    expect(res.jsonPayload).toEqual({ success: true, user: fakeRow })
  })

  it('maneja violación de unicidad (23505)', async () => {
    bcrypt.hash.mockResolvedValue('hash')
    const error = new Error('duplicate'); error.code = '23505'
    mockQuery.mockRejectedValue(error)

    const req = { body: { username: 'user1', email: 'user@mail.com', password: 'secret123', role: 'user', first_name: 'Test', last_name: 'User' } }
    const res = createMockRes()

    await createUser(req, res)

    expect(res.statusCode).toBe(409)
    expect(res.jsonPayload).toEqual({ error: 'Usuario o email ya existe' })
  })

  it('maneja error interno', async () => {
    bcrypt.hash.mockResolvedValue('hash')
    const error = new Error('db down')
    mockQuery.mockRejectedValue(error)

    const req = { body: { username: 'user1', email: 'user@mail.com', password: 'secret123', role: 'user', first_name: 'Test', last_name: 'User' } }
    const res = createMockRes()

    await createUser(req, res)

    expect(res.statusCode).toBe(500)
    expect(res.jsonPayload).toEqual({ error: 'Error interno del servidor' })
  })
})
