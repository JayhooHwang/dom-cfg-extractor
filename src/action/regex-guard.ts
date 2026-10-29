import { DomExtractorError } from "../error.ts"

export type RegexGuardOptions = {
    /**
     * Maximum number of characters accepted by regex-based actions.
     * Use `Infinity` to disable the limit.
     */
    inputLimit?:number
}

const DEFAULT_INPUT_LIMIT = 8192

/**
 * Checks that data passed to a regular expression is safe to process.
 * Input length is capped to bound the worst-case backtracking cost of
 * a single call; pattern-level checks may be added here later.
 */
export class RegexGuard{
    #inputLimit:number

    constructor(options:RegexGuardOptions = {}){
        const inputLimit = options.inputLimit ?? DEFAULT_INPUT_LIMIT;
        if(inputLimit !== Number.POSITIVE_INFINITY && !(Number.isInteger(inputLimit) && inputLimit > 0)){
            throw new DomExtractorError("INVALID_REGEX_GUARD_OPTIONS", "inputLimit must be a positive integer or Infinity");
        }
        this.#inputLimit = inputLimit;
    }

    get inputLimit(){
        return this.#inputLimit;
    }

    /**
     * @param input The data about to be matched
     * @param regexp The pattern about to run against `input`
     */
    assertSafe(input:string, regexp:RegExp):void{
        if(input.length > this.#inputLimit){
            throw new DomExtractorError("REGEXP_INPUT_TOO_LONG", `Input is ${input.length} characters long, exceeding the ${this.#inputLimit} character limit for pattern ${String(regexp)}`);
        }
    }
}
