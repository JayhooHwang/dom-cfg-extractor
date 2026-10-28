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
                    // 对于数组，直接应用（string[] -> string[]）
                    result = action.run(result, context, ...params);
                }else{
                    // 对于非数组，报错（string -> string[]）
                    throw new DomExtractorError(`Action ${action.name} 不能应用于非数组`)
                }
            }else{
                // Single Action
                if(Array.isArray(result)){
                    // 对于数组，遍历应用（string[] -> string[]）
                    result = result.map(item => action.run(item, context, ...params));
                }else{
                    // 对于非数组，直接应用（string -> string）
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
        throw new DomExtractorError("action.name is required and must be a string");
    }
    if(!Array.isArray(params)){
        throw new DomExtractorError("action.params must be an array");
    }
    return { name, params };
}