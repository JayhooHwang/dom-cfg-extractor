import { ApplyFor, ActionHandle, ActionData, SingleActionHandle, GroupActionHandle } from "../types"
import { DomExtractorError } from "../error"

export class Action{
    #name:string
    #applyFor:ApplyFor
    #handle:ActionHandle
    
    /**
     * 
     * @param name Action name
     * @param applyFor Target type of the Action ('single' - single text, 'group' - array of texts)
     * @param handle The specific execution function of the Action
     */
    constructor(name:string, applyFor:ApplyFor, handle:ActionHandle){
        _checkConstructor(name, applyFor, handle)
        this.#name = name;
        this.#applyFor = applyFor;
        this.#handle = handle;
    }

    get name(){
        return this.#name;
    }
    get applyFor(){
        return this.#applyFor;
    }

    /**
     * Execute the Action
     * @param rawData The raw data delegated to the Action, also the 1st parameter of the handle function
     * @param context The 'this' context for the handle function execution
     * @param params Additional parameters for the handle function, 2nd to nth
     * @returns The processed data
     */
    run(rawData:string, context:object, ...params:string[]):string
    run(rawData:string[], context:object, ...params:string[]):string[]
    run(rawData:ActionData, context:object, ...params:string[]){
        if(!Array.isArray(rawData) && typeof rawData !== 'string'){
            throw new DomExtractorError(`Action "${this.#name}" can only process arrays`);
        }
        if(Array.isArray(rawData) && this.#applyFor === 'single'){
            throw new DomExtractorError(`Action ${this.#name} cannot be used to process arrays`);
        }
        if(!Array.isArray(rawData) && this.#applyFor === 'group'){
            throw new DomExtractorError(`Action ${this.#name} cannot be used to process single text`);
        }
        if(typeof rawData === 'string'){
            return (this.#handle as SingleActionHandle).call(context, rawData, ...params);
        }else{
            return (this.#handle as GroupActionHandle).call(context, rawData, ...params);
        }
    }
}

function _checkConstructor(name:string, applyFor:ApplyFor, handle:ActionHandle){
    if(typeof name !== 'string'){
        throw new DomExtractorError("name must be of type string");
    }
    if(applyFor !== 'single' && applyFor !== 'group'){
        throw new DomExtractorError("applyFor must be either 'single' or 'group'");
    }
    if(typeof handle !== 'function' || handle.length === 0){
        throw new DomExtractorError("action handler must be a function with at least one parameter");
    }
}