import { describe, it, expect } from 'vitest'
import { type ExecuteMapItem, type MapItem, resolveExecuteMapItem } from '../src/search-map-resolver.ts'
import { expectThrowsCode } from './helpers/error.ts';

describe("resolveExecuteMapItem", ()=>{
    function expect_defaultValues(item:ExecuteMapItem){
        expect(item.attr).toBe("innerText");
        expect(item.click).toBe(undefined);
        expect(item.key).toBe("title");
        expect(item.actions).toEqual([]);
        expect(item.group).toBe(false);
        expect(item.context).toEqual({});
        expect(item.optional).toBe(false);
    }

    it("基础应用：输入什么，返回什么 ( basic usage: returns what is configured )", ()=>{
        const input:MapItem = { 
            selector: '.title',
            actions: ["url", {
                "name": "replace",
                params: ["abc"]
            }],
            attr: "href",
            click: ".btn"
        }

        const item = resolveExecuteMapItem('title', input, [], { root: "www.google.com"});
        expect(item.key).toBe("title");
        expect(item.selector).toBe(input.selector);
        expect(item.attr).toBe(input.attr);
        expect(item.click).toBe(input.click);
        expect(item.actions).toEqual(input.actions);
        expect(item.context).toEqual({ root: "www.google.com"});
        expect(item.optional).toBe(false);
        expect(item.group).toBe(false);
    })
    
    it("配置简写为字符串时取默认值 ( applies defaults when the config is a string shorthand )", ()=>{
        const item = resolveExecuteMapItem('title', '.title', [], {});
        expect(item.selector).toBe(".title");
        expect_defaultValues(item);
    })
    
    it("仅配置 selector 时，其它项填充默认值 ( fills other fields with defaults when only selector is configured )", ()=>{
        const item = resolveExecuteMapItem('title', { selector: '.title' }, [], {});
        expect(item.selector).toBe(".title");
        expect_defaultValues(item);
    })

    it('key 以 ? 结尾时标记 optional 并去掉 ? ( marks optional and strips ? when the key ends with ? )', () => {
        const item = resolveExecuteMapItem('desc?', '.desc', [], {})
        expect(item.key).toBe('desc')
        expect(item.optional).toBe(true)
    })

    it('key 命中 groupKeys 时标记 group ( marks group when the key is listed in groupKeys )', () => {
        const item = resolveExecuteMapItem('tags', '.tag', ['tags'], {})
        expect(item.group).toBe(true)
    })

    it('attr 别名 text/html 会展开为真实属性名 ( expands text/html attr aliases to real attribute names )', () => {
        const text = resolveExecuteMapItem('a', { selector: '.a', attr: 'text' }, [], {})
        const html = resolveExecuteMapItem('b', { selector: '.b', attr: 'html' }, [], {})
        expect(text.attr).toBe('innerText')
        expect(html.attr).toBe('innerHTML')
    })

    it('selector 为空时抛出错误 ( throws when selector is empty )', () => {
        expectThrowsCode(() => resolveExecuteMapItem('bad', { selector: '' }, [], {}), "SELECTOR_EMPTY")
    })
})
