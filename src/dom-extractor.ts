import { ActionRegistry } from "./action/action-registry.ts";
import { ActionRunner } from "./action/action-runner.ts";
import { inherentActions } from "./action/inherent-actions.ts";
import { DomExtractorError, resolveCatch, type ErrorOccurrence } from "./error.ts";
import { clickAndQuery, querySelectorDeep, readPropOrAttrFromElement } from "./html-utils.ts";
import { resolveExecuteMapItem, type ExecuteMapItem, type ExtractorSearchingContext, type SearchMap } from "./search-map-resolver.ts";
import { getSpecialSelectorResult, isSpecialSelector } from "./special-selector.ts";

export type ExtractorOptions = {
    groupKeys?:string[],
    actionRegistry?: ActionRegistry
    context?:ExtractorSearchingContext
}

export class DomExtractor{
    #groupKeys:string[]
    #actionRunner:ActionRunner
    #context:ExtractorSearchingContext

    constructor(options:ExtractorOptions={}){
        this.#groupKeys = options.groupKeys ?? []        
        this.#actionRunner = new ActionRunner(ActionRegistry.getMerged(inherentActions, options.actionRegistry))
        this.#context = options.context || {}
    }

    async search(dom:Document|Element, map:SearchMap): Promise<Record<string, string|string[]>>{
        if(!isQueryableNode(dom)){
            throw new DomExtractorError("INVALID_DOM", "dom must be a Document or Element");
        }
        if(!isPlainObject(map)){
            throw new DomExtractorError("INVALID_MAP", "map must be a plain object");
        }
        let currentItem:ErrorOccurrence = { key: "" };
        try{
            const resultObj:Record<string, string|string[]> = {};
            for (const [rawKey, rawItem] of Object.entries(map)){
                currentItem = { key: rawKey, item: rawItem };
                const item = resolveExecuteMapItem(rawKey, rawItem, this.#groupKeys, this.#context);

                if(item.click){
                    await clickAndQuery(dom, item.selector, item.click )
                };

                resultObj[item.key] = this.#searchItemValue(dom, item);
            }
            return resultObj;
        }catch(ex){
            resolveCatch(ex, currentItem);
        }
    }
    
    #searchItemValue(baseNode:Document|Element, mapItem:ExecuteMapItem):string|string[]{
        const {selector, attr, group, actions, context, optional} = mapItem;
        let result:string|string[];

        if(group){
            result = getRawDataArray(baseNode, selector, attr, optional);
        }else{
            result = getRawData(baseNode, selector, attr, optional);
        }

        if(actions){
            result = this.#actionRunner.run(result, actions, context);
        }
        return result;
    }
}

function isQueryableNode(node:unknown):node is Document|Element{
    if(!node || typeof node !== 'object') return false;
    const candidate = node as Pick<Element, "querySelector"|"querySelectorAll">;
    return typeof candidate.querySelector === 'function' && typeof candidate.querySelectorAll === 'function';
}

function isPlainObject(value:unknown):value is Record<string, unknown>{
    if(typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/**
 * Get raw data from a single target (a DOM node, or something else such as location)
 */
function getRawData(baseNode:Document|Element, selector:string, attr:string, optional:boolean):string{
    let rawData = "";
    if(isSpecialSelector(selector)){
        rawData = getSpecialSelectorResult(selector);
    }else{
        const el = querySelectorDeep(baseNode, selector);
        rawData = getRawDataByAttr(el, attr, optional);
    }
    return rawData;
}

function getRawDataArray(baseNode:Document|Element, selector:string, attr:string, optional:boolean):string[]{
    const elList = baseNode.querySelectorAll(selector);
    const rawDataArray:string[] = [];
    for(const el of elList){
        rawDataArray.push(getRawDataByAttr(el, attr, optional));
    }
    return rawDataArray;
}

/**
 * Get raw data from an element
 */
function getRawDataByAttr(el:Element|null, attr:string, silent:boolean):string{
    if(!el){
        if(silent){
            return "";
        }
        throw new DomExtractorError("ELEMENT_NOT_FOUND", "The specified element was not found");
    }
    const rawData = readPropOrAttrFromElement(el, attr);
    if(typeof rawData === 'string'){
        return rawData.trim();
    }else{
        throw new DomExtractorError("ATTR_READ_FAILED", `Failed to read "${attr}" from the specified element`);
    }
}