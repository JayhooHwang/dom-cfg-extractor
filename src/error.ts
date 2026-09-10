type ErrorOccur = {key?:string,item?:any}

const PREFIX = "[DOM_EXTRACTOR_ERR]"

export class DomExtractorError extends Error {
    name = "DomExtractorError";
    occur?:ErrorOccur=undefined

    constructor(message:string, cause?:Error, occur?:ErrorOccur){
        super(`${PREFIX} ${getErrorMessage(message, occur)}`, {cause});
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

export function resolveCatch(ex:unknown, occur?:ErrorOccur){
    if(ex instanceof Error){
        throw new DomExtractorError(ex.message, ex, occur);
    }else{
        throw new DomExtractorError(String(ex), undefined, occur);
    }
}