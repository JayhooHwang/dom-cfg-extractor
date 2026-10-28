export type ErrorOccur = {key?:string,item?:any}

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
    | "UNKNOWN_ERROR"

const PREFIX = "[DOM_EXTRACTOR_ERR]"

export class DomExtractorError extends Error {
    name = "DomExtractorError";
    readonly code:ErrorCode;
    occur:ErrorOccur|undefined;

    constructor(code:ErrorCode, message:string, cause?:Error, occur?:ErrorOccur){
        super(`${PREFIX} ${getErrorMessage(message, occur)}`, {cause});
        this.code = code;
        this.occur = occur;
        //处理 stack —— 用 this.stack 的第一行，替换 cause.stack 的第一行，赋值回 this.stack
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

function getErrorMessage(message:string, occur?:ErrorOccur){
    let msg = message;
    if(occur){
        msg += "(occur key=" + occur?.key + ")";
    }
    return msg;
}

export function resolveCatch(ex:unknown, occur?:ErrorOccur):never{
    if(ex instanceof DomExtractorError){
        //已带前缀的 DomExtractorError 作为 cause 时，避免前缀重复，并保留原有 code
        const message = ex.message.slice(PREFIX.length).trim();
        throw new DomExtractorError(ex.code, message, ex, occur);
    }else if(ex instanceof Error){
        throw new DomExtractorError("UNKNOWN_ERROR", ex.message, ex, occur);
    }else{
        throw new DomExtractorError("UNKNOWN_ERROR", String(ex), undefined, occur);
    }
}