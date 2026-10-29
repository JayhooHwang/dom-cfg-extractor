// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { querySelectorDeep, retryQuery, clickAndQuery, readPropOrAttrFromElement } from '../src/html-utils.ts'

// about:blank iframes load asynchronously; wait until complete before writing content
async function frameBody(iframe:HTMLIFrameElement, bodyHTML:string):Promise<Document>{
    await (window as any).happyDOM.waitUntilComplete();
    const doc = iframe.contentDocument!;
    doc.body.innerHTML = bodyHTML;
    return doc;
}

describe("querySelectorDeep",()=>{
    beforeEach(()=>{
        document.body.innerHTML = `
            <div id="shallow">Shallow content</div>
            <iframe id="the_iframe"></iframe>
        `;
    });

    afterEach(()=>{
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it("查找位于 iframe 内的深层元素 ( finds a deep element inside an iframe )",async ()=>{
        await frameBody(
            document.getElementById('the_iframe') as HTMLIFrameElement,
            '<div id="the_div_in_frame">Frame content</div>'
        );

        const result = querySelectorDeep(document, '#the_iframe@#the_div_in_frame');
        expect(result?.textContent).toBe('Frame content');
    });

    it("查找浅层元素 ( finds a shallow element )",()=>{
        const result = querySelectorDeep(document, '#shallow');
        expect(result?.textContent).toBe('Shallow content');
    });

    it("嵌套 iframe 内的元素也能找到 ( finds elements inside nested iframes )",async ()=>{
        const outerDoc = await frameBody(
            document.getElementById('the_iframe') as HTMLIFrameElement,
            '<iframe id="inner_iframe"></iframe>'
        );
        await frameBody(
            outerDoc.getElementById('inner_iframe') as HTMLIFrameElement,
            '<div id="deep_target">Deep content</div>'
        );

        const result = querySelectorDeep(document, '#the_iframe@#inner_iframe@#deep_target');
        expect(result?.textContent).toBe('Deep content');
    });

    it("找不到元素时，返回 null ( returns null when the element is not found )",async ()=>{
        await (window as any).happyDOM.waitUntilComplete();
        expect(querySelectorDeep(document, '#not_exists')).toBeNull();
        expect(querySelectorDeep(document, '#the_iframe@#not_exists')).toBeNull();
    });

    it("存在异常时，返回 null 并打印异常 ( returns null and logs the exception when access throws )",()=>{
        // happy-dom does not simulate cross-origin access; mimic the browser with a getter that throws SecurityError
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
        expect(String(warnSpy.mock.calls[0]?.[0])).toContain('cross-origin restrictions');
    });

    it("未拼完的深层查找器包含空片段时，返回 null 并给出准确警告 ( returns null with a precise warning when the deep selector contains an empty segment )", ()=>{
        const cases:[selector:string, emptyIndex:number][] = [
            ['#the_iframe@', 2],   // extra @ at the end
            ['@#the_iframe', 1]    // extra @ at the start
        ];
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(()=>{});

        for(const [selector] of cases){
            expect(querySelectorDeep(document, selector)).toBeNull();
        }

        expect(warnSpy).toHaveBeenCalledTimes(cases.length);
        cases.forEach(([selector, emptyIndex], i)=>{
            const message = String(warnSpy.mock.calls[i]?.[0]);
            expect(message).toContain(`Failed to query "${selector}"`);
            expect(message).toContain(`selector segment ${emptyIndex} is empty`);
            // An empty segment is a config error, so it should not also mention cross-origin
            expect(message).not.toContain("cross-origin");
        });
    });
});

describe("retryQuery", ()=>{
    afterEach(()=>{
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it("元素已存在时，立即返回 ( returns immediately when the element already exists )", async ()=>{
        document.body.innerHTML = '<div id="exists">Already exists</div>';
        const result = await retryQuery(document, '#exists', { interval: 10 });
        expect(result.textContent).toBe('Already exists');
    });

    it("元素延迟出现时，轮询直到找到 ( polls until the element appears )", async ()=>{
        vi.useFakeTimers();
        setTimeout(()=>{
            document.body.insertAdjacentHTML('beforeend', '<div id="delay">Appears later</div>');
        }, 250);

        const promise = retryQuery(document, '#delay', { interval: 100, maxTry: 5 });
        await vi.advanceTimersByTimeAsync(1000);

        expect((await promise).textContent).toBe('Appears later');
    });

    it("超过最大次数仍找不到时，reject 并提示超时 ( rejects with a timeout message after the maximum number of attempts )", async ()=>{
        vi.useFakeTimers();
        const promise = retryQuery(document, '#never', { interval: 100, maxTry: 3 });
        const assertion = expect(promise).rejects.toContain('Element lookup timed out');
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

    it("点击后目标元素出现，返回该元素 ( returns the target element when it appears after the click )", async ()=>{
        vi.useFakeTimers();
        document.body.innerHTML = '<button id="btn">Click me</button>';
        document.getElementById('btn')!.addEventListener('click', ()=>{
            document.body.insertAdjacentHTML('beforeend', '<div id="target">Appears after click</div>');
        });

        const result = await clickAndQuery(document, '#target', '#btn');

        await vi.advanceTimersByTimeAsync(1000);
        expect(result?.textContent).toBe('Appears after click');
    });

    it("点击触发器不存在时，返回 null ( returns null when the click trigger does not exist )", async ()=>{
        document.body.innerHTML = '<div id="target"></div>';
        expect(await clickAndQuery(document, '#target', '#not_exists')).toBeNull();
    });

    it("click() 抛异常时，返回 null 并警告 ( returns null and warns when click throws )", async ()=>{
        document.body.innerHTML = '<button id="btn">Click me</button>';
        const btn = document.getElementById('btn') as HTMLElement;
        btn.click = ()=>{ throw new Error('cannot click'); };
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(()=>{});

        expect(await clickAndQuery(document, '#target', '#btn')).toBeNull();
        expect(String(warnSpy.mock.calls[0]?.[0])).toContain('cannot call click()');
    });

    it("点击后目标未出现，超时后返回 null 并警告 ( returns null and warns after a timeout when the target never appears )", async ()=>{
        vi.useFakeTimers();
        document.body.innerHTML = '<button id="btn">Click me</button>';
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(()=>{});

        const promise = clickAndQuery(document, '#target', '#btn');
        await vi.advanceTimersByTimeAsync(4000);

        expect(await promise).toBeNull();
        expect(String(warnSpy.mock.calls[0]?.[0])).toContain('did not appear or the lookup timed out');
    });

    it("点击触发器和目标元素都可以位于 iframe 内（@ 深层查找） ( supports both trigger and target inside an iframe via @ deep lookup )", async ()=>{
        const iframe = document.createElement('iframe');
        iframe.id = 'the_iframe';
        document.body.append(iframe);
        const frameDoc = await frameBody(iframe, '<button id="btn">Click me</button>');
        frameDoc.getElementById('btn')!.addEventListener('click', ()=>{
            frameDoc.body.insertAdjacentHTML('beforeend', '<div id="target">Appears after click</div>');
        });

        const result = await clickAndQuery(document, '#the_iframe@#target', '#the_iframe@#btn');

        expect(result?.textContent).toBe('Appears after click');
    });

    it("点击触发器位于 iframe 内、目标元素位于 iframe 外时，也能查到目标 ( finds the target when the trigger is inside an iframe and the target is outside )", async ()=>{
        const iframe = document.createElement('iframe');
        iframe.id = 'the_iframe';
        document.body.append(iframe);
        const frameDoc = await frameBody(iframe, '<button id="btn">Click me</button>');
        frameDoc.getElementById('btn')!.addEventListener('click', ()=>{
            document.body.insertAdjacentHTML('beforeend', '<div id="target">Appears after click</div>');
        });

        const result = await clickAndQuery(document, '#target', '#the_iframe@#btn');

        expect(result?.textContent).toBe('Appears after click');
    });

    it("iframe 内的点击触发器不存在时，返回 null ( returns null when the click trigger inside an iframe does not exist )", async ()=>{
        const iframe = document.createElement('iframe');
        iframe.id = 'the_iframe';
        document.body.append(iframe);
        await frameBody(iframe, '<div id="target">Already exists</div>');

        expect(await clickAndQuery(document, '#the_iframe@#target', '#the_iframe@#not_exists')).toBeNull();
    });
});

describe("readPropOrAttrFromElement", ()=>{
    it("读取 property（innerText） ( reads an innerText property )", ()=>{
        const el = document.createElement('div');
        el.innerHTML = '<p>Text content</p>';
        expect(readPropOrAttrFromElement(el, 'innerText')).toBe('Text content');
    });

    it("读取 href property 时返回拼接后的完整 URL ( returns the resolved full URL when reading the href property )", ()=>{
        const root = "https://www.jhoo.com";
        (window as any).happyDOM.setURL(root);
        const a = document.createElement('a');
        a.setAttribute('href', '/some/path');

        const result = readPropOrAttrFromElement(a, 'href');
        expect(result).toBe(`${root}/some/path`)
    });

    it("读取普通 attribute ( reads a regular attribute )", ()=>{
        const el = document.createElement('div');
        el.innerHTML = `<div id="inner_div"></div>`
        expect(readPropOrAttrFromElement(el.firstElementChild as Element, 'id')).toBe('inner_div');
    });

    it("attribute 不存在时，返回 undefined ( returns undefined when the attribute does not exist )", ()=>{
        const el = document.createElement('div');
        expect(readPropOrAttrFromElement(el, 'id')).toBeUndefined();
    });
});
