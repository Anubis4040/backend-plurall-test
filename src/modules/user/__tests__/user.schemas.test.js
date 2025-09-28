import { describe, it, expect } from '@jest/globals'
import { userIdParamSchema, userBaseSchema } from '../schemas/user.common.schema.js'
import { userCreateSchema } from '../schemas/user.create.schema.js'

describe('User Schemas', () => {
  describe('userIdParamSchema', () => {
    it('acepta UUID válido', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000'
      const parsed = userIdParamSchema.parse({ id: uuid })
      expect(parsed.id).toBe(uuid)
    })

    it('rechaza UUID inválido', () => {
      expect(() => userIdParamSchema.parse({ id: 'no-uuid' })).toThrow(/UUID válido/)
    })
  })

  describe('userBaseSchema', () => {
    it('normaliza email a minúsculas y trim', () => {
      const data = {
        username: 'user123',
        email: 'TEST@MAIL.COM',
        role: 'user'
      }
  const parsed = userBaseSchema.extend({ password: userCreateSchema.shape.password }).partial().parse(data)
  expect(parsed.email).toBe('test@mail.com')
    })

    it('falla con username corto', () => {
      const data = { username: 'ab', email: 'test@mail.com', role: 'user' }
      expect(() => userBaseSchema.parse(data)).toThrow(/mínimo 3/)
    })
  })

  describe('userCreateSchema', () => {
    it('requiere password y valida longitud mínima (8)', () => {
      expect(() => userCreateSchema.parse({
        username: 'user123',
        email: 'user@mail.com',
        password: '1234567'
      })).toThrow(/mínimo 8/)
    })
  })
})
