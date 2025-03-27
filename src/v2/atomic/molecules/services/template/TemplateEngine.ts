/**
 * Interface voor template rendering
 */
export interface TemplateEngine {
  /**
   * Rendered een template met de gegeven data
   * @param templateName Naam van de template
   * @param data Data voor de template
   * @returns De gerenderde template als string
   */
  render(templateName: string, data: Record<string, unknown>): Promise<string>;
}