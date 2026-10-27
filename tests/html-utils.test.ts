// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { querySelectorDeep, retryQuery, clickAndQuery, readPropOrAttrFromElement } from '../src/html-utils.ts'

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

    it("未拼完的深层查找器包含空片段时，返回 null 并给出准确警告", ()=>{
        const cases:[selector:string, emptyIndex:number][] = [
            ['#the_iframe@', 2],   // 末尾多写了 @
            ['@#the_iframe', 1]    // 开头多写了 @
        ];
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(()=>{});

        for(const [selector] of cases){
            expect(querySelectorDeep(document, selector)).toBeNull();
        }

        expect(warnSpy).toHaveBeenCalledTimes(cases.length);
        cases.forEach(([selector, emptyIndex], i)=>{
            const message = String(warnSpy.mock.calls[i]?.[0]);
            expect(message).toContain(`无法获取 ${selector} 内容`);
            expect(message).toContain(`第 ${emptyIndex} 段 selector 为空`);
            // 空片段属于配置拼接错误，不应再提示跨域
            expect(message).not.toContain("跨域");
        });
    });
});

describe("retryQuery", ()=>{
    afterEach(()=>{
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it("元素已存在时，立即返回", async ()=>{
        document.body.innerHTML = '<div id="exists">已存在</div>';
        const result = await retryQuery(document, '#exists', { interval: 10 });
        expect(result.textContent).toBe('已存在');
    });

    it("元素延迟出现时，轮询直到找到", async ()=>{
        vi.useFakeTimers();
        setTimeout(()=>{
            document.body.insertAdjacentHTML('beforeend', '<div id="delay">延迟出现</div>');
        }, 250);

        const promise = retryQuery(document, '#delay', { interval: 100, maxTry: 5 });
        await vi.advanceTimersByTimeAsync(1000);

        expect((await promise).textContent).toBe('延迟出现');
    });

    it("超过最大次数仍找不到时，reject 并提示超时", async ()=>{
        vi.useFakeTimers();
        const promise = retryQuery(document, '#never', { interval: 100, maxTry: 3 });
        const assertion = expect(promise).rejects.toContain('元素查找超时');
        await vi.advanceTimersByTimeAsync(1000);
        await assertion;
    });
});

describe("clickAndQuery", ()=>{
    afterEach(()=>{
        vi.useRealTimers();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it("点击后目标元素出现，返回该元素", async ()=>{
        vi.useFakeTimers();
        document.body.innerHTML = '<button id="btn">点我</button>';
        document.getElementById('btn')!.addEventListener('click', ()=>{
            document.body.insertAdjacentHTML('beforeend', '<div id="target">点击后出现</div>');
        });

        const result = await clickAndQuery(document, '#target', '#btn');

        await vi.advanceTimersByTimeAsync(1000);
        expect(result?.textContent).toBe('点击后出现');
    });

    it("点击触发器不存在时，返回 null", async ()=>{
        document.body.innerHTML = '<div id="target"></div>';
        expect(await clickAndQuery(document, '#target', '#not_exists')).toBeNull();
    });

    it("click() 抛异常时，返回 null 并警告", async ()=>{
        document.body.innerHTML = '<button id="btn">点我</button>';
        const btn = document.getElementById('btn') as HTMLElement;
        btn.click = ()=>{ throw new Error('cannot click'); };
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(()=>{});

        expect(await clickAndQuery(document, '#target', '#btn')).toBeNull();
        expect(String(warnSpy.mock.calls[0]?.[0])).toContain('不支持直接执行 click()');
    });

    it("点击后目标未出现，超时后返回 null 并警告", async ()=>{
        vi.useFakeTimers();
        document.body.innerHTML = '<button id="btn">点我</button>';
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(()=>{});

        const promise = clickAndQuery(document, '#target', '#btn');
        await vi.advanceTimersByTimeAsync(4000);

        expect(await promise).toBeNull();
        expect(String(warnSpy.mock.calls[0]?.[0])).toContain('未出现或查找超时');
    });
});

describe("readPropOrAttrFromElement", ()=>{
    it("读取 property（innerText）", ()=>{
        const el = document.createElement('div');
        el.innerHTML = '<p>文本内容</p>';
        expect(readPropOrAttrFromElement(el, 'innerText')).toBe('文本内容');
    });

    it("读取 href property 时返回拼接后的完整 URL", ()=>{
        const root = "https://www.jhoo.com";
        (window as any).happyDOM.setURL(root);
        const a = document.createElement('a');
        a.setAttribute('href', '/some/path');

        const result = readPropOrAttrFromElement(a, 'href');
        expect(result).toBe(`${root}/some/path`)
    });

    it("读取普通 attribute", ()=>{
        const el = document.createElement('div');
        el.innerHTML = `<div id="inner_div"></div>`
        expect(readPropOrAttrFromElement(el.firstElementChild as Element, 'id')).toBe('inner_div');
    });

    it("attribute 不存在时，返回 undefined", ()=>{
        const el = document.createElement('div');
        expect(readPropOrAttrFromElement(el, 'id')).toBeUndefined();
    });
});
