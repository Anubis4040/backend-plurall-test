// Utilidades de paginación y ordenamiento reutilizables
// Objetivo: Estandarizar forma de leer query params y generar meta de paginación

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 200

/**
 * Normaliza page y limit provenientes de req.query
 * @param {object} query - req.query
 * @param {object} opts - opciones { defaultLimit, maxLimit }
 * @returns {{page:number, limit:number, offset:number}}
 */
export function getPaginationParams (query = {}, opts = {}) {
  const { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = opts
  let { page = DEFAULT_PAGE, limit = defaultLimit } = query

  page = parseInt(page, 10)
  limit = parseInt(limit, 10)

  if (isNaN(page) || page < 1) page = DEFAULT_PAGE
  if (isNaN(limit) || limit < 1) limit = defaultLimit
  if (limit > maxLimit) limit = maxLimit

  const offset = (page - 1) * limit
  return { page, limit, offset }
}

/**
 * Construye fragmento ORDER BY de forma segura (lista blanca)
 * @param {string} requested - columna solicitada
 * @param {string[]} allowed - columnas permitidas
 * @param {string} order - ASC / DESC
 * @param {string} defaultColumn - columna por defecto
 * @returns {string}
 */
export function buildSortClause (requested, allowed = [], order = 'DESC', defaultColumn = 'created_at') {
  const dir = (order || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
  const col = allowed.includes(requested) ? requested : defaultColumn
  return `${col} ${dir}`
}

/**
 * Genera metadata estandarizada
 * @param {number} total - total de registros
 * @param {number} page
 * @param {number} limit
 */
export function buildMeta (total, page, limit) {
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0
  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1
  }
}

/**
 * Ejecuta dos consultas: datos y count (si es necesario) usando la misma cláusula base.
 * @param {function} queryFn - función para ejecutar query (e.g. query de pg)
 * @param {string} baseSelect - SELECT principal sin ORDER/LIMIT/OFFSET
 * @param {string} countSelect - SELECT COUNT(*) FROM ... (si no se pasa, se intenta derivar)
 * @param {Array} params - parámetros compartidos para ambas consultas
 * @param {object} options - { sortClause, limit, offset }
 */
export async function paginateQuery ({ queryFn, baseSelect, countSelect, params = [], options = {} }) {
  const { sortClause = 'created_at DESC', limit, offset } = options

  // Consulta de datos
  const dataSQL = `${baseSelect}\nORDER BY ${sortClause}\nLIMIT $${params.length + 1} OFFSET $${params.length + 2}`
  const dataParams = [...params, limit, offset]

  // Consulta de conteo
  let countSQL = countSelect
  if (!countSQL) {
    // Intento simple: reemplazar SELECT ... FROM por SELECT COUNT(*) AS total FROM
    countSQL = baseSelect.replace(/SELECT[\s\S]*?FROM/i, 'SELECT COUNT(*) AS total FROM')
  }
  const countResult = await queryFn(countSQL, params)
  const total = parseInt(countResult.rows[0]?.total || 0, 10)

  const dataResult = await queryFn(dataSQL, dataParams)
  return { rows: dataResult.rows, total }
}
