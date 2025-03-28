/**
 * Opties voor het zoeken van entities
 */
export interface FindOptions {
  /**
   * Maximum aantal resultaten om terug te geven
   */
  limit?: number;

  /**
   * Aantal resultaten om over te slaan (voor paginatie)
   */
  offset?: number;

  /**
   * Velden om op te sorteren
   * Key is de veldnaam, value is 'ASC' of 'DESC'
   */
  orderBy?: Record<string, 'ASC' | 'DESC'>;

  /**
   * Filter condities
   * Key is de veldnaam, value is de waarde om op te filteren
   */
  where?: Record<string, any>;
}
