/**
 * Utilidades para paginación consistente
 */
function getPaginationParams(query, defaultLimit = 10, maxLimit = 100) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function buildPaginatedResponse(items, totalItems, page, limit) {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  return {
    items,
    pagination: {
      total: totalItems,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

module.exports = {
  getPaginationParams,
  buildPaginatedResponse
};
