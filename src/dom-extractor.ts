import { ActionRegistry } from "./action/action-registry.ts";
import { ActionRunner } from "./action/action-runner.ts";
import { inherentActions } from "./action/inherent-actions.ts";
import { DomExtractorError, resolveCatch, type ErrorOccur } from "./error.ts";
import { clickAndQuery, querySelectorDeep, readPropOrAttrFromElement } from "./html-utils.ts";
import { resolveExcuteMapItem, type ExcuteMapItem, type ExtractorSearchingContext, type SearchMap } from "./search-map-resolver.ts";
import { getSpecialSelectorResult, isSpecialSelector } from "./sepcial-selector.ts";

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
        this.#actionRunner = new ActionRunner(ActionRegistry.getMerges(inherentActions, options.actionRegistry))
        this.#context = options.context || {}
    }

    async search(dom:Document|Element, map:SearchMap): Promise<Record<string, string|string[]>>{
        if(!isQueryableNode(dom)){
            throw new DomExtractorError("INVALID_DOM", "dom 必须是 Document 或 Element");
        }
        if(!isPlainObject(map)){
            throw new DomExtractorError("INVALID_MAP", "map 必须是 plain object");
        }
        let currentItem:ErrorOccur = { key: "" };
        try{
            const resultObj:Record<string, string|string[]> = {};
            for (const [rawKey, rawItem] of Object.entries(map)){
                currentItem = { key: rawKey, item: rawItem };
                const item = resolveExcuteMapItem(rawKey, rawItem, this.#groupKeys, this.#context);

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
    
    #searchItemValue(baseNode:Document|Element, mapItem:ExcuteMapItem):string|string[]{
        const {selector, attr, group, actions, context, optional} = mapItem;
        let result:string|string[];

        if(group){
            result = getRawDatas(baseNode, selector, attr, optional);
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
 * 从单一目标中获取原始数据（单一目标，可以是某个 DOM，或者其它，比如 location）
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

function getRawDatas(baseNode:Document|Element, selector:string, attr:string, optional:boolean):string[]{
    const elList = baseNode.querySelectorAll(selector);
    const rawDatas:string[] = [];
    for(const el of elList){
        rawDatas.push(getRawDataByAttr(el, attr, optional));
    }
    return rawDatas;
}

/**
 * 从 element 中获取原始数据
 */
function getRawDataByAttr(el:Element|null, attr:string, silent:boolean):string{
    if(!el){
        if(silent){
            return "";
        }
        throw new DomExtractorError("ELEMENT_NOT_FOUND", "找不到指定的 element");
    }
    const rawData = readPropOrAttrFromElement(el, attr);
    if(typeof rawData === 'string'){
        return rawData.trim();
    }else{
        throw new DomExtractorError("ATTR_READ_FAILED", `无法从指定的 element 中正确获取 ${attr} 属性`);
    }
}