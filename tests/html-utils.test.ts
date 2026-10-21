// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { querySelectorDeep } from '../src/html-utils.ts'

describe("querySelectorDeep",()=>{
    // iframe 的 about:blank 是异步加载，需等待完成后才能写入内容
    async function frameBody(iframe:HTMLIFrameElement, bodyHTML:string):Promise<Document>{
        await (window as any).happyDOM.waitUntilComplete();
        const doc = iframe.contentDocument!;
        doc.body.innerHTML = bodyHTML;
        return doc;
    }

    beforeEach(()=>{
        document.body.innerHTML = `
            <div id="shallow">浅层内容</div>
            <iframe id="the_iframe"></iframe>
        `;
    });

    afterEach(()=>{
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it("查找位于 iframe 内的深层元素",async ()=>{
        await frameBody(
            document.getElementById('the_iframe') as HTMLIFrameElement,
            '<div id="the_div_in_frame">frame 内容</div>'
        );

        const result = querySelectorDeep(document, '#the_iframe@#the_div_in_frame');
        expect(result?.textContent).toBe('frame 内容');
    });

    it("查找浅层元素",()=>{
        const result = querySelectorDeep(document, '#shallow');
        expect(result?.textContent).toBe('浅层内容');
    });

    it("嵌套 iframe 内的元素也能找到",async ()=>{
        const outerDoc = await frameBody(
            document.getElementById('the_iframe') as HTMLIFrameElement,
            '<iframe id="inner_iframe"></iframe>'
        );
        await frameBody(
            outerDoc.getElementById('inner_iframe') as HTMLIFrameElement,
            '<div id="deep_target">深层内容</div>'
        );

        const result = querySelectorDeep(document, '#the_iframe@#inner_iframe@#deep_target');
        expect(result?.textContent).toBe('深层内容');
    });

    it("找不到元素时，返回 null",async ()=>{
        await (window as any).happyDOM.waitUntilComplete();
        expect(querySelectorDeep(document, '#not_exists')).toBeNull();
        expect(querySelectorDeep(document, '#the_iframe@#not_exists')).toBeNull();
    });

    it("存在异常时，返回 null, 并打印异常",()=>{
        // happy-dom 不模拟跨域，参照浏览器行为用抛 SecurityError 的 getter 模拟跨域访问被拒
        const iframe = document.getElementById('the_iframe') as HTMLIFrameElement;
        Object.defineProperty(iframe, 'contentDocument', {
            get(){
                throw new DOMException('Blocked a frame with origin from accessing a cross-origin frame.', 'SecurityError');
            }
        });
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(()=>{});

        const result = querySelectorDeep(document, '#the_iframe@#the_div_in_frame');

        expect(result).toBeNull();
        expect(warnSpy).toHaveBeenCalledOnce();
        expect(String(warnSpy.mock.calls[0]?.[0])).toContain('跨域限制');
    });
});

describe.todo("retryQuery");

describe.todo("clickAndQuery");

describe.todo("readPropOrAttrFromElement");
