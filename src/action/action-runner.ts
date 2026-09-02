
import { ActionCaller, ActionData, ActionHandle, ApplyFor } from "../types";
import { DomExtractorError } from "../error";
import { ActionRegistry } from "./action-registry"

export class ActionRunner{

    #actionRegistry: ActionRegistry

    constructor(initActionRegistry:ActionRegistry){
        this.#actionRegistry = initActionRegistry || new ActionRegistry();
    }

    /**
     * @param name The registration name of the Action
     * @param actionHandle The specific handling function of the action
     * @param applyFor Set whether it applies to single text or array, defaults to 'single'
     */
    registerAction(name:string, actionHandle:ActionHandle, applyFor:ApplyFor){
        return this.#actionRegistry.register(name, actionHandle, applyFor);
    }

    appendActionRegistry(newRegistry:ActionRegistry){
        this.#actionRegistry = ActionRegistry.getMerges(this.#actionRegistry, newRegistry);
    }

    runGroupActions(rawArray:string[], actionCallers:ActionCaller[], context:object){
        const pipeRunner = new ActionPipeRunner(this.#actionRegistry, context, 'group');
        return pipeRunner.run(rawArray, actionCallers);
    }

    runSingleActions(rawData:string, actionCallers:ActionCaller[], context:object){
        const pipeRunner = new ActionPipeRunner(this.#actionRegistry, context, 'single');
        return pipeRunner.run(rawData, actionCallers);
    }  
}

class ActionPipeRunner{
    #actionRegistry
    #context
    #applyFor

    constructor(actionRegistry:ActionRegistry, context:object, applyFor:ApplyFor){
        this.#actionRegistry = actionRegistry;
        this.#context = context;
        this.#applyFor = applyFor;
    }

    run(rawData:ActionData, actionCallers:ActionCaller[]){
        let result = rawData;
        if(!actionCallers){
            return result;
        }
        for(let caller of actionCallers){
            const { name, params } = _resolveActionCaller(caller);
            const action = this.#actionRegistry.getAction(name);
            if(action.applyFor !== this.#applyFor){
                throw new DomExtractorError(`Action "${action.name}" is not applicable for ${this.#applyFor}`)
            }
            result = action.run(result, this.#context, ...params);
        }
        return result;
    }
}

/**
 * 
 * @param { ActionCaller } actionCaller 
 * @returns 
 */
function _resolveActionCaller(actionCaller:ActionCaller){
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