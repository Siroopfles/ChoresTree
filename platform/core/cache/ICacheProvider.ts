/**
 * Interface voor cache providers
 * Definieert basis cache operaties
 */
export interface ICacheProvider {
  /**
   * Haalt een waarde op uit de cache
   * @param key De cache key
   * @returns Promise met de waarde of null als niet gevonden
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Zet een waarde in de cache
   * @param key De cache key
   * @param value De waarde om te cachen
   * @param ttl Time-to-live in seconden
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Verwijdert een waarde uit de cache
   * @param key De cache key
   */
  invalidate(key: string): Promise<void>;
}
