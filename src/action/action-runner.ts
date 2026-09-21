import { ActionCaller, ActionData, ApplyFor } from "../types";
import { DomExtractorError } from "../error";
import { ActionRegistry } from "./action-registry"

export class ActionRunner{

    #actionRegistry: ActionRegistry

    constructor(actionRegistry:ActionRegistry){
        this.#actionRegistry = actionRegistry;
    }

    run(rawData:string, actionCallers:ActionCaller[], context:object):string
    run(rawData:string[], actionCallers:ActionCaller[], context:object):string[]
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
                    for(let item of result){
                        item = action.run(item, context, ...params);
                    }
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
    if(typeof actionCaller === 'string'){
        // When action is a string, it means an action without any parameters
        actionCaller = { name: actionCaller, params:[] };
    }
    actionCaller.params = actionCaller.params ?? []; // If params is empty, assign []

    const { name, params } = actionCaller;
    if(typeof name !== 'string' || !name.trim().length){
        throw new DomExtractorError("action.name is required and must be a string");
    }
    if(!Array.isArray(params)){
        throw new DomExtractorError("action.params must be an array");
    }
    return actionCaller;
}