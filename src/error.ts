export type ErrorOccurrence = {key?:string,item?:any}

export type ErrorCode =
    | "INVALID_DOM"
    | "INVALID_MAP"
    | "SELECTOR_EMPTY"
    | "INVALID_ACTIONS"
    | "ELEMENT_NOT_FOUND"
    | "ATTR_READ_FAILED"
    | "ACTION_NOT_FOUND"
    | "ACTION_DUPLICATE"
    | "INVALID_ACTION_NAME"
    | "INVALID_APPLY_FOR"
    | "INVALID_ACTION_HANDLE"
    | "INVALID_ACTION_PARAMS"
    | "ACTION_PARAMS_REQUIRED"
    | "INVALID_ACTION_DATA"
    | "ACTION_TYPE_MISMATCH"
    | "REGEXP_INPUT_TOO_LONG"
    | "INVALID_REGEX_GUARD_OPTIONS"
    | "UNKNOWN_ERROR"

const PREFIX = "[DOM_EXTRACTOR_ERR]"

export class DomExtractorError extends Error {
    name = "DomExtractorError";
    readonly code:ErrorCode;
    occur:ErrorOccurrence|undefined;

    constructor(code:ErrorCode, message:string, cause?:Error, occur?:ErrorOccurrence){
        super(`${PREFIX} ${getErrorMessage(message, occur)}`, {cause});
        this.code = code;
        this.occur = occur;
        // Rewrite the stack: replace the first line of cause.stack with the first line of this.stack
        if(cause && cause.stack){
            const [, ...causeStacks] = cause.stack.split("\n");
            const thisStacks = this.stack?.split("\n") || [];
            this.stack = [thisStacks[0], ...causeStacks].join("\n");
        }

        Object.setPrototypeOf(this, DomExtractorError.prototype);
    }
}

export function consoleWarning(message:string, ex?:Error|unknown){
    console.warn(`${PREFIX} ${message}`, ex)
}

function getErrorMessage(message:string, occur?:ErrorOccurrence){
    let msg = message;
    if(occur){
        msg += "(occur key=" + occur?.key + ")";
    }
    return msg;
}

export function resolveCatch(ex:unknown, occur?:ErrorOccurrence):never{
    if(ex instanceof DomExtractorError){
        // When a prefixed DomExtractorError is used as cause, avoid duplicating the prefix and keep the original code
        const message = ex.message.slice(PREFIX.length).trim();
        throw new DomExtractorError(ex.code, message, ex, occur);
    }else if(ex instanceof Error){
        throw new DomExtractorError("UNKNOWN_ERROR", ex.message, ex, occur);
    }else{
        throw new DomExtractorError("UNKNOWN_ERROR", String(ex), undefined, occur);
    }
}