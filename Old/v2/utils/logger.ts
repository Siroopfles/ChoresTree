export class Logger {
    constructor(private context: string) {}

    info(message: string): void {
        console.warn(`[${this.context}] INFO: ${message}`);
    }

    error(message: string, error?: unknown): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${this.context}] ERROR: ${message}`, errorMessage);
    }

    warn(message: string): void {
        console.warn(`[${this.context}] WARN: ${message}`);
    }

    debug(message: string): void {
        console.warn(`[${this.context}] DEBUG: ${message}`);
    }
}