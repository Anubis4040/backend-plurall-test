/**
 * Configuración básica de Jest para proyecto ESM.
 * "type": "module" en package.json hace que .js ya sea tratado como ESM,
 * por eso eliminamos extensionsToTreatAsEsm para evitar el error de validación.
 */
export default {
  testEnvironment: 'node',
  // Sin transform: Node 18 soporta ESM y sintaxis usada.
  testMatch: [
    '**/src/modules/user/**/__tests__/**/*.test.js',
    '**/src/modules/user/**/*.test.js'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/modules/user/**/*.{js}',
    '!src/modules/user/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
}
