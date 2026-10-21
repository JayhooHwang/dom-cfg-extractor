// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { isSpecialSelector, getSpecialSelectorResult } from '../src/sepcial-selector.ts'

describe("isSpecialSelector", ()=>{
    it("识别 URL 为特殊选择器", ()=>{
        expect(isSpecialSelector("URL")).toBe(true);
    })

    it("小写 url 或其它, 不被认为是特殊选择器", ()=>{
        expect(isSpecialSelector("url")).toBe(false);
        expect(isSpecialSelector("#title")).toBe(false);
    })
})

describe("getSpecialSelectorResult", ()=>{
    it("输入 URL, 获取当前页面地址", ()=>{
        const url = "https://www.jhoo.com/dom-cfg-extractor?id=1";
        (window as any).happyDOM.setURL(url);
        expect(getSpecialSelectorResult("URL")).toBe(url);
    })

    it("输入其它, 返回空字符串", ()=>{
        expect(getSpecialSelectorResult("url")).toBe("");
        expect(getSpecialSelectorResult("#title")).toBe("");
    })
})