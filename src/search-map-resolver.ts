import { DomExtractorError } from "./error";
import { ActionCaller } from "./types";

export type SearchMap = Record<string, MapItem|string>

export interface MapItem{
    /**
     * 想要获取的数据所在的元素的 selector
     */
    selector: string;
    /**
     * 想要获取的数据所在的元素的属性名，包含 innerText(可简写：text) 和 innerHTML(可简写：html)
     */
    attr?: string;
    /**
     * 对获取到的原始值进行一系列的处理
     */
    actions?: ActionCaller[];
    /**
     * 预先触发一个点击事件，值为被点击元素的 selector
     */
    click?: string;
}

export interface ExcuteMapItem extends MapItem{
    attr: string
    /**
     * 用户配置中的原始 key
     */
    rawKey: string;
    /**
     * 可用于执行的正式 key
     */
    key: string;
    /**
     * 是否为可选项（由用户在 key 后面加 ? 确定，例如：key?:"#selector"）
     */
    optional: boolean;
    /**
     * 是否返回数组
     */
    group: boolean;
    /**
     * 查找时的上下文，可附加一些特定信息
     */
    context: ExtractorSearchingContext;
}

export type ExtractorSearchingContext = {
    root?: string
}

export function resolveExcuteMapItem(rawKey:string, map:SearchMap, groupKeys:string[], context:ExtractorSearchingContext):ExcuteMapItem{
    const { key, optional } = resolveOptionalKey(rawKey);
    const item = map[rawKey];
    if(typeof item === 'string'){
        return {
            selector: item, 
            attr:"innerText",
            group: groupKeys.includes(key),
            key, rawKey, optional, context
        }
    }else{
        checkMapItem(item);
        return {
            group: groupKeys.includes(key),
            ...item, 
            attr: resolveAttrAlias(item.attr ?? "innerText"),
            key, rawKey, optional, context
        }
    }
}

/**
 * 解析可选 key，写法是以“?”结尾
 */
function resolveOptionalKey(rawKey:string){
    let key = rawKey, optional = false;
    if(rawKey.endsWith("?")){
        optional = true;
        key = rawKey.slice(0, -1);
    }
    return {key, optional};
}

function checkMapItem(mapItem:MapItem):void{
    let {selector, actions} = mapItem;
    if(!selector){
        throw new DomExtractorError("selector 不能为空");
    }
    if(!!actions && !Array.isArray(actions)){
        throw new DomExtractorError("actions 必须是数组");
    }
}

const attrAliasOptions: Record<string, string> = {
    'text': "innerText",
    'html': "innerHTML"
}
function resolveAttrAlias(alias:string):string{
    return attrAliasOptions[alias] || alias;
}