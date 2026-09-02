export class DomExtractorError extends Error {
    constructor(message: string) {
        super(`[Dom-Cfg-Extractor] ${message}`);
        this.name = 'DomExtractorError'; 
        
        Object.setPrototypeOf(this, DomExtractorError.prototype);
    }
}