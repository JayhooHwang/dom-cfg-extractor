const specialSelectors:Record<string, Function> = {
    "URL": ()=> window.location.href
}

export function isSpecialSelector(selector:string): boolean{
    return selector in specialSelectors
}

export function getSpecialSelectorResult(selector:string): string{
    return specialSelectors[selector].call(null)
}