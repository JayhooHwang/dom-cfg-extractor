import { describe, it, expect } from 'vitest'
import { type ExcuteMapItem, type MapItem, resolveExcuteMapItem } from '../src/search-map-resolver.ts'
import { DomExtractorError } from '../src/error.ts';

describe("resolveExcuteMapItem", ()=>{
    function expect_defaultValues(item:ExcuteMapItem){
        expect(item.attr).toBe("innerText");
        expect(item.click).toBe(undefined);
        expect(item.key).toBe("title");
        expect(item.actions).toEqual([]);
        expect(item.group).toBe(false);
        expect(item.context).toEqual({});
        expect(item.optional).toBe(false);
    }

    it("基础应用：输入什么，返回什么", ()=>{
        const input:MapItem = { 
            selector: '.title',
            actions: ["url", {
                "name": "replace",
                params: ["abc"]
            }],
            attr: "href",
            click: ".btn"
        }

        const item = resolveExcuteMapItem('title', input, [], { root: "www.google.com"});
        expect(item.key).toBe("title");
        expect(item.selector).toBe(input.selector);
        expect(item.attr).toBe(input.attr);
        expect(item.click).toBe(input.click);
        expect(item.actions).toEqual(input.actions);
        expect(item.context).toEqual({ root: "www.google.com"});
        expect(item.optional).toBe(false);
        expect(item.group).toBe(false);
    })
    
    it("配置简写为字符串时取默认值", ()=>{
        const item = resolveExcuteMapItem('title', '.title', [], {});
        expect(item.selector).toBe(".title");
        expect_defaultValues(item);
    })
    
    it("仅配置 selector 时，其它项填充默认值", ()=>{
        const item = resolveExcuteMapItem('title', { selector: '.title' }, [], {});
        expect(item.selector).toBe(".title");
        expect_defaultValues(item);
    })

    it('key 以 ? 结尾时标记 optional 并去掉 ?', () => {
        const item = resolveExcuteMapItem('desc?', '.desc', [], {})
        expect(item.key).toBe('desc')
        expect(item.optional).toBe(true)
    })

    it('key 命中 groupKeys 时标记 group', () => {
        const item = resolveExcuteMapItem('tags', '.tag', ['tags'], {})
        expect(item.group).toBe(true)
    })

    it('attr 别名 text/html 会展开为真实属性名', () => {
        const text = resolveExcuteMapItem('a', { selector: '.a', attr: 'text' }, [], {})
        const html = resolveExcuteMapItem('b', { selector: '.b', attr: 'html' }, [], {})
        expect(text.attr).toBe('innerText')
        expect(html.attr).toBe('innerHTML')
    })

    it('selector 为空时抛出错误', () => {
        expect(() => resolveExcuteMapItem('bad', { selector: '' }, [], {})).toThrow(DomExtractorError)
    })
})