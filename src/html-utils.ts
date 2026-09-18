import { consoleWarning } from "./error";

/**
 * 深入查找 iframe ( 使用 @ 作为选择器分隔符, 例如："#the_iframe@#the_div_in_frame" )
 */
export function querySelectorDeep(baseNode: Document|Element, selector:string): Element|null{
    try{
        const contentSelectors = selector.split('@');
        return contentSelectors.reduce<Document|Element|null>((parent, sel)=>{
            if(parent instanceof HTMLIFrameElement){
                return parent.contentDocument?.querySelector(sel) || null;
            }else{
                return parent?.querySelector(sel) || null;
            }
        }, baseNode) as Element;    //as: Document 类型只用于兼顾输入，这里的返回能肯定是 Element
    }catch(ex){
        consoleWarning(`无法获取 ${selector} 内容，可能存在跨域限制`, ex)
    }
    return null;
}

/**
 * 多次轮询查找，直到找到目标元素
 */
export function retryQuery(baseNode:Document|Element, selector:string, 
    options:{maxTry?:number, interval?:number}={}):Promise<Element>{
    const { maxTry=6, interval=500 } = options;
    return new Promise<Element>((rs, rj)=>{
        function checkElement(triedCount:number){
            const target = querySelectorDeep(baseNode, selector);
            if(target){
                rs(target);
            }else{
                if(triedCount < maxTry){
                    setTimeout(()=>{
                        checkElement(++triedCount);
                    }, interval);
                }else{
                    rj(`元素查找超时(在 ${maxTry} × ${interval} 毫秒内未找到目标 ${selector})`);
                }
            }
        }
        checkElement(0);
    });
}

/**
 * 执行 click，并查找点击事件触发后才会出现的元素（运行环境必须支持 click() 的执行）
 */
export function clickAndQuery(baseNode:Document|Element, selector:string, 
    clickSelector:string):Promise<Element|null>{
    const clickTrigger = clickSelector && baseNode.querySelector(clickSelector);
    if(clickTrigger && clickTrigger instanceof HTMLElement){
        try {
            clickTrigger.click();
        } catch (error) {
            consoleWarning(`Click 失败: ${clickSelector} 不支持直接执行 click()`);
            return Promise.resolve(null);
        }
        return retryQuery(baseNode, selector).catch(()=>{
            consoleWarning(`Click 失败: 关联目标 ${selector} 未出现或查找超时`);
            return null;
        });
    }else{
        return Promise.resolve(null);
    }
}

/**
 * @param {Element} el 
 * @param {string} attr Name Of Attribute(eg: href) or Property(eg: innerText)
 * @returns {string}
 */
export function readPropOrAttrFromElement(el:Element, attr: keyof Element):string|undefined{
    const _EL_PROPS = ["innerText", "innerHTML", "href"];   //为什么需要列入 href：如果通过 getAttribute 获取 href，则只获取原始字符串，而不会自动拼接为一个完整的 url
    const result = _EL_PROPS.includes(attr) ? el[attr] : el.getAttribute(attr);
    switch(typeof result){
        case 'bigint':
        case 'boolean':
        case 'number': return String(result);
        case 'string': return result;
        default: return undefined;
    }
}