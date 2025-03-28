/**
 * Utility functies voor caching
 */

/**
 * Genereert een cache key voor een entity
 * @param entityName Naam van de entity
 * @param id ID van de entity
 * @returns Cache key string
 */
export const generateEntityCacheKey = (entityName: string, id: string): string => {
  return `entity:${entityName}:${id}`;
};

/**
 * Genereert een cache key voor een collectie entities
 * @param entityName Naam van de entity
 * @param queryParams Query parameters voor filtering
 * @returns Cache key string
 */
export const generateCollectionCacheKey = (
  entityName: string,
  queryParams?: Record<string, any>,
): string => {
  const queryString = queryParams ? `:${JSON.stringify(queryParams)}` : '';
  return `collection:${entityName}${queryString}`;
};
