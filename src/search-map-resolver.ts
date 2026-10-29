import { DomExtractorError } from "./error.ts";
import type { ActionCaller } from "./action/types.ts";

export type SearchMap = Record<string, MapItem|string>

export interface MapItem{
    /**
     * Selector of the element that contains the desired data
     */
    selector: string;
    /**
     * Attribute or property name of the element, including innerText (alias: text) and innerHTML (alias: html)
     */
    attr?: string;
    /**
     * A series of transformations applied to the raw value
     */
    actions?: ActionCaller[];
    /**
     * Trigger a click beforehand; the value is the selector of the element to click
     */
    click?: string;
}

export interface ExecuteMapItem extends MapItem{
    attr: string
    /**
     * Original key from the user configuration
     */
    rawKey: string;
    /**
     * Normalized key used for execution
     */
    key: string;
    /**
     * Whether the key is optional (declared with a trailing ?, e.g. key?:"#selector")
     */
    optional: boolean;
    /**
     * Whether to return an array
     */
    group: boolean;
    /**
     * Lookup context; may carry additional information
     */
    context: ExtractorSearchingContext;
}

export type ExtractorSearchingContext = {
    [key:string]: string | undefined
}

export function resolveExecuteMapItem(rawKey:string, rawItem:string|MapItem, groupKeys:string[], context:ExtractorSearchingContext):ExecuteMapItem{
    const { key, optional } = resolveOptionalKey(rawKey);

    checkMapItem(rawItem);
    if(typeof rawItem === 'string'){
        return {
            selector: rawItem, 
            attr:"innerText",
            group: groupKeys.includes(key),
            key, rawKey, optional, context, actions:[]
        }
    }else{
        return {
            group: groupKeys.includes(key),
            actions: [],
            ...rawItem, 
            attr: resolveAttrAlias(rawItem.attr ?? "innerText"),
            key, rawKey, optional, context
        }
    }
}

/**
 * Resolve an optional key, marked by a trailing ?
 */
function resolveOptionalKey(rawKey:string){
    let key = rawKey, optional = false;
    if(rawKey.endsWith("?")){
        optional = true;
        key = rawKey.slice(0, -1);
    }
    return {key, optional};
}

function checkMapItem(mapItem:MapItem|string):void|never{
    const selector = typeof mapItem === 'string' ? mapItem : mapItem.selector;
    
    if(!selector || !selector.trim()){
        throw new DomExtractorError("SELECTOR_EMPTY", "selector cannot be empty");
    }

    if(typeof mapItem === 'string') return;
    const {actions} = mapItem;

    if(!!actions && !Array.isArray(actions)){
        throw new DomExtractorError("INVALID_ACTIONS", "actions must be an array");
    }
}

const attrAliasOptions: Record<string, string> = {
    'text': "innerText",
    'html': "innerHTML"
}
function resolveAttrAlias(alias:string):string{
    return attrAliasOptions[alias] || alias;
}