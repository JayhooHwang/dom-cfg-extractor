const specialSelectors:Record<string, Function> = {
    "URL": ()=> window.location.href
}

export function isSpecialSelector(selector:string): boolean{
    return selector in specialSelectors
}

export function getSpecialSelectorResult(selector:string): string{
    const handle = specialSelectors[selector]
    if(typeof handle === 'function'){
        return handle.call(null)
    }else{
        return ""
    }
}