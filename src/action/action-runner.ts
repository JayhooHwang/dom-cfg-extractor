import type { ActionCaller } from "./types.ts";
import { DomExtractorError } from "../error.ts";
import type { ActionRegistry } from "./action-registry.ts"

export class ActionRunner{

    #actionRegistry: ActionRegistry

    constructor(actionRegistry:ActionRegistry){
        this.#actionRegistry = actionRegistry;
    }

    run(rawData:string|string[], actionCallers:ActionCaller[], context:object){
        let result = rawData;
        for(const caller of actionCallers){
            const { name, params } = resolveActionCaller(caller);
            const action = this.#actionRegistry.getAction(name);
            if(!action){
                continue;
            }

            if(action.applyFor === 'group'){
                // Group Action
                if(Array.isArray(result)){
                    // For arrays, apply directly (string[] -> string[])
                    result = action.run(result, context, ...params);
                }else{
                    // For non-arrays, throw (string -> string[])
                    throw new DomExtractorError("ACTION_TYPE_MISMATCH", `Action ${action.name} cannot be applied to a non-array value`)
                }
            }else{
                // Single Action
                if(Array.isArray(result)){
                    // For arrays, apply to each item (string[] -> string[])
                    result = result.map(item => action.run(item, context, ...params));
                }else{
                    // For non-arrays, apply directly (string -> string)
                    result = action.run(result, context, ...params);
                }
            }
        }
        return result;
    }
}

/**
 * 
 * @param { ActionCaller } actionCaller 
 * @returns 
 */
function resolveActionCaller(actionCaller:ActionCaller){
    const caller = typeof actionCaller === 'string'
        ? { name: actionCaller, params: [] as string[] }
        : actionCaller;
    const { name } = caller;
    const params = caller.params ?? [];

    if(typeof name !== 'string' || !name.trim().length){
        throw new DomExtractorError("INVALID_ACTION_NAME", "action.name is required and must be a string");
    }
    if(!Array.isArray(params)){
        throw new DomExtractorError("INVALID_ACTION_PARAMS", "action.params must be an array");
    }
    return { name, params };
}