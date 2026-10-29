// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { isSpecialSelector, getSpecialSelectorResult } from '../src/special-selector.ts'

describe("isSpecialSelector", ()=>{
    it("识别 URL 为特殊选择器 ( recognizes URL as a special selector )", ()=>{
        expect(isSpecialSelector("URL")).toBe(true);
    })

    it("小写 url 或其它，不被认为是特殊选择器 ( lowercase url and other values are not treated as special selectors )", ()=>{
        expect(isSpecialSelector("url")).toBe(false);
        expect(isSpecialSelector("#title")).toBe(false);
    })
})

describe("getSpecialSelectorResult", ()=>{
    it("输入 URL，获取当前页面地址 ( returns the current page URL for URL )", ()=>{
        const url = "https://www.jhoo.com/dom-cfg-extractor?id=1";
        (window as any).happyDOM.setURL(url);
        expect(getSpecialSelectorResult("URL")).toBe(url);
    })

    it("输入其它，返回空字符串 ( returns an empty string for other values )", ()=>{
        expect(getSpecialSelectorResult("url")).toBe("");
        expect(getSpecialSelectorResult("#title")).toBe("");
    })
})
