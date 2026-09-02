/**
 * Register inherent actions for spider
 */
import { ActionRegistry } from "./action-registry";

export const inherentActions = new ActionRegistry();
// 默认 action
inherentActions.register('split', (strArr:string[], splitter:string)=>{
    if(!splitter || !splitter.length){
        throw new Error("Action [split] 必须传递 1 个参数")
    }
    const [str] = strArr;
    return str.split(splitter);
}, 'group');

inherentActions.register('replace', (str:string, from:string, to:string)=>{
    if(!from || !from.length || typeof to === 'undefined'){
        throw new Error("Action [replace] 必须传递 2 个参数")
    }
    const serachRgx = new RegExp(from, 'g');
    return str.replace(serachRgx, to);
})

/**
 * 使用正则表达式提取，所提取的内容是第一个子匹配
 */
inherentActions.register('extract', (str:string, pattern:string)=>{
    if(!pattern || !pattern.length){
        throw new Error("Action [extract] 必须传递 1 个参数")
    }
    const serachRgx = new RegExp(pattern);
    const matcher = str.match(serachRgx);
    if(matcher && matcher.length > 1){
        return matcher[1];
    }
    return "";
})

inherentActions.register('remove', (str:string, target:string)=>{
    if(!target || !target.length){
        throw new Error("Action [remove] 必须传递 1 个参数")
    }
    const serachRgx = new RegExp(target, 'g');
    return str.replace(serachRgx, "");
})