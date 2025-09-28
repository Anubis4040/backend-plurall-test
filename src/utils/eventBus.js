import EventEmitter from 'events'
import logger from './logger.js'

class AppEventBus extends EventEmitter {
  emit(event, ...args) {
    // Log en debug todos los eventos emitidos (sin romper performance severamente)
    if (logger && logger.debug) {
      logger.debug(`Event emitted: ${event}`)
    }
    return super.emit(event, ...args)
  }
}

const bus = new AppEventBus()
// Evitar warnings si agregamos muchos listeners legítimamente
bus.setMaxListeners(50)

bus.on('error', (err) => {
  // Evitar que un error no manejado en un listener tumbe el proceso
  logger.appError('Error no manejado en eventBus', err)
})

export default bus
