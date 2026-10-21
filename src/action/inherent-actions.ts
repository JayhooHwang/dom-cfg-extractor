/**
 * Register inherent actions for spider
 */
import { DomExtractorError } from "../error.ts";
import { ActionRegistry } from "./action-registry.ts";

export const inherentActions = new ActionRegistry();
// 默认 action
inherentActions.register('split', (strArr:string[], splitter:string)=>{
    if(!splitter || !splitter.length){
        throw new DomExtractorError("Action [split] 必须传递 1 个参数");
    }
    if(strArr.length > 1){
        throw new DomExtractorError("Action [split] 只能应用于单元素数组");
    }

    if(strArr.length === 0){
        return [];
    }
    const [str=""] = strArr;
    return str.split(splitter);
}, 'group');

inherentActions.register('replace', (str:string, from:string, to:string)=>{
    if(!from || !from.length || typeof to === 'undefined'){
        throw new DomExtractorError("Action [replace] 必须传递 2 个参数")
    }
    const serachRgx = new RegExp(from, 'g');
    return str.replace(serachRgx, to);
})

/**
 * 使用正则表达式提取，所提取的内容是第一个子匹配
 */
inherentActions.register('extract', (str:string, pattern:string)=>{
    if(!pattern || !pattern.length){
        throw new DomExtractorError("Action [extract] 必须传递 1 个参数")
    }
    const serachRgx = new RegExp(pattern);
    const matcher = str.match(serachRgx);
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
        throw new DomExtractorError("Action [remove] 必须传递 1 个参数")
    }
    const serachRgx = new RegExp(target, 'g');
    return str.replace(serachRgx, "");
})

inherentActions.register('trim', (str:string)=>str.trim())