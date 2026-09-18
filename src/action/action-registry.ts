import { ActionHandle, ApplyFor } from "../types";
import { DomExtractorError } from "../error";
import { Action } from "./action";

export class ActionRegistry{
    #registry: Map<string, Action>;

    constructor(){
        this.#registry = new Map();
    }

    [Symbol.iterator](){
        return this.#registry.values()[Symbol.iterator]()
    }

    getAction(name:string){
        const action = this.#registry.get(name);
        if(!action){
            throw new DomExtractorError(`Action "${ name }" does not exist`);
        }
        return action;
    }
    
    /**
     * @param name The registration name of the Action
     * @param actionHandle The specific handling function of the action
     * @param applyFor Set whether it applies to single text or array, defaults to 'single'
     */
    register(name:string, actionHandle:ActionHandle, applyFor:ApplyFor='single'){
        this.#duplicateNameCheck(name);
        this.#registry.set(name, new Action(name, applyFor, actionHandle));
    }
    
    includes(name:string){
        return this.#registry.has(name);
    }

    #duplicateNameCheck(name:string):void{
        if(this.includes(name)){
            throw new DomExtractorError(`action ${name} has already been registered`);
        }
    }

    static getMerges(...actionRegistries:(ActionRegistry|undefined)[]){
        const mergedRegistry = new ActionRegistry();
        actionRegistries.forEach(actionRegistry=>{
            if(!actionRegistry) return;
            for(const action of actionRegistry){
                mergedRegistry.#duplicateNameCheck(action.name);
                mergedRegistry.#registry.set(action.name, action);
            }
        });
        return mergedRegistry;
    }
}