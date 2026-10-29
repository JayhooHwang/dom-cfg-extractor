import { consoleWarning } from "./error.ts";

/**
 * Check whether the node is a frame element whose content document can be entered
 * Use duck typing instead of instanceof: iframes live in a separate realm, so nested iframe elements are not instances of the current window's HTMLIFrameElement
 */
function isFrameElement(node: Document|Element): node is Element & { contentDocument: Document|null }{
    return 'contentDocument' in node;
}

/**
 * Query deeply inside iframes (use @ as the selector separator, e.g. "#the_iframe@#the_div_in_frame")
 */
export function querySelectorDeep(baseNode: Document|Element, selector:string): Element|null{
    const contentSelectors = selector.split('@');
    const emptyIndex = contentSelectors.findIndex(sel => !sel.trim());
    if(emptyIndex !== -1){
        consoleWarning(`Failed to query "${selector}": selector segment ${emptyIndex + 1} is empty; check that the @ separators are complete`)
        return null;
    }
    try{
        return contentSelectors.reduce<Document|Element|null>((parent, sel)=>{
            if(parent && isFrameElement(parent)){
                return parent.contentDocument?.querySelector(sel) || null;
            }else{
                return parent?.querySelector(sel) || null;
            }
        }, baseNode) as Element;    // Document is only part of the input type; the return value is always an Element
    }catch(ex){
        consoleWarning(`Failed to query "${selector}"; it may be blocked by cross-origin restrictions`, ex)
    }
    return null;
}

/**
 * Poll repeatedly until the target element is found
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
                    rj(`Element lookup timed out (target "${selector}" not found within ${maxTry} × ${interval} ms)`);
                }
            }
        }
        checkElement(0);
    });
}

/**
 * Trigger a click (the click target supports @ deep lookup) and find the element that only appears after the click event (the runtime must support click())
 */
export function clickAndQuery(baseNode:Document|Element, selector:string, 
    clickSelector:string):Promise<Element|null>{
    const clickTrigger = (clickSelector ? querySelectorDeep(baseNode, clickSelector) : null) as HTMLElement | null;
    // Use duck typing instead of instanceof HTMLElement: iframes live in a separate realm, so their elements are not instances of the current window's HTMLElement
    if(clickTrigger && typeof clickTrigger.click === 'function'){
        try {
            clickTrigger.click();
        } catch (error) {
            consoleWarning(`Click failed: cannot call click() on ${clickSelector}`);
            return Promise.resolve(null);
        }
        return retryQuery(baseNode, selector).catch(()=>{
            consoleWarning(`Click failed: related target ${selector} did not appear or the lookup timed out`);
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
export function readPropOrAttrFromElement(el:Element, attr: string):string|undefined{
    const _EL_PROPS = ["innerText", "innerHTML", "href"];   // href must be listed here: getAttribute('href') returns the raw string instead of a fully resolved URL
    const result = _EL_PROPS.includes(attr) ? (el as unknown as Record<string, unknown>)[attr] : el.getAttribute(attr);
    switch(typeof result){
        case 'bigint':
        case 'boolean':
        case 'number': return String(result);
        case 'string': return result;
        default: return undefined;
    }
}