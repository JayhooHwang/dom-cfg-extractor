/**
 * Register inherent actions for spider
 */
import { DomExtractorError } from "../error.ts";
import { ActionRegistry } from "./action-registry.ts";

export const inherentActions = new ActionRegistry();
// Inherent actions
inherentActions.register('split', (strArr:string[], splitter:string)=>{
    if(!splitter || !splitter.length){
        throw new DomExtractorError("ACTION_PARAMS_REQUIRED", "Action [split] requires exactly 1 parameter");
    }
    if(strArr.length > 1){
        throw new DomExtractorError("ACTION_TYPE_MISMATCH", "Action [split] can only be applied to a single-element array");
    }

    if(strArr.length === 0){
        return [];
    }
    const [str=""] = strArr;
    return str.split(splitter);
}, 'group');

inherentActions.register('replace', (str:string, from:string, to:string)=>{
    if(!from || !from.length || typeof to === 'undefined'){
        throw new DomExtractorError("ACTION_PARAMS_REQUIRED", "Action [replace] requires exactly 2 parameters")
    }
    const searchRgx = new RegExp(from, 'g');
    return str.replace(searchRgx, to);
})

/**
 * Extract with a regular expression; returns the first submatch
 */
inherentActions.register('extract', (str:string, pattern:string)=>{
    if(!pattern || !pattern.length){
        throw new DomExtractorError("ACTION_PARAMS_REQUIRED", "Action [extract] requires exactly 1 parameter")
    }
    const searchRgx = new RegExp(pattern);
    const matcher = str.match(searchRgx);
    if(!matcher){
        return ""
    }
    if(matcher && matcher.length > 1){
        return matcher[1] ?? "";
    }else{
        return matcher[0] ?? "";
    }
})

inherentActions.register('remove', (str:string, target:string)=>{
    if(!target || !target.length){
        throw new DomExtractorError("ACTION_PARAMS_REQUIRED", "Action [remove] requires exactly 1 parameter")
    }
    const searchRgx = new RegExp(target, 'g');
    return str.replace(searchRgx, "");
})

inherentActions.register('trim', (str:string)=>str.trim())