import { ActionHandle, ApplyFor } from "../types";
import { DomExtractorError } from "../error";
import { Action } from "./action";

export class ActionRegistry{
    #registry: Map<string, Action>;

    constructor(){
        this.#registry = new Map();
    }

    // todo: 暴露了 registry，有可能被改动
    get registryMap(){
        return this.#registry;
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
        if(this.includes(name)){
            throw new Error(`action ${name} has already been registered`);
        }
        this.#registry.set(name, new Action(name, applyFor, actionHandle));
    }
    includes(name:string){
        return this.#registry.has(name);
    }

    static getMerges(...actionRegistries:ActionRegistry[]){
        const mergedRegistry = new ActionRegistry();
        actionRegistries.forEach(actionRegistry=>{
            mergedRegistry.#registry = new Map([...mergedRegistry.registryMap, ...actionRegistry.registryMap])
        });
        return mergedRegistry;
    }
}