// @vitest-environment happy-dom
/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DomExtractor } from "../src/dom-extractor.ts";
import { ActionRegistry } from "../src/action/action-registry.ts";
import { expectRejectsCode } from "./helpers/error.ts";
import liLeiHtml from "./fixtures/student-info-lilei.html?raw";
import hanMeimeiHtml from "./fixtures/student-info-hanmeimei.html?raw";

function initPage(html:string=liLeiHtml, title:string="LiLei"):void{
     (window as any).happyDOM.setURL(`https://example.com/${title}`);
    document.head.innerHTML = `<title>${title} - Student Information</title>`
    document.body.innerHTML = html
}

function MajorScores(){
    let _btn: HTMLElement|null = null;
    let _scores: readonly number[], _delay:number;

    function enableButton(scores: readonly number[], delay:number=3000):void{
        _scores = scores;
        _delay = delay;
        _btn = document.getElementById("btn_load_scores");
        disableButton();
        _btn?.addEventListener('click', clickHandle);
    }

    function disableButton():void{
        _btn?.removeEventListener('click', clickHandle);
    }
    
    function clickHandle():void{
        const dvMajorCourses = document.querySelector(".major-courses");
        if(!dvMajorCourses) return;

        const txtLoading = document.createElement('p');
        txtLoading.innerText = "Scores Searching...";
        dvMajorCourses.append(txtLoading);

        setTimeout(()=>{
            const dvScores = getScoresDiv(_scores);
            dvMajorCourses.append(dvScores);
            txtLoading.remove();
        }, _delay);
    }

    function getScoresDiv(scores: readonly number[]):HTMLDivElement{
        const dvScores = document.createElement('div');
        dvScores.innerHTML = `<table id="major_course_scores">
    <thead>
        <tr>
            <th>Data Structures</th>
            <th>Operating Systems</th>
            <th>Computer Networks</th>
            <th>Database Systems</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>${scores[0]}</td>
            <td>${scores[1]}</td>
            <td>${scores[2]}</td>
            <td>${scores[3]}</td>
        </tr>
    </tbody>
</table>`
        return dvScores;
    }

    return {
        enableButton, disableButton
    }
}

describe("DomExtractor.search", ()=>{
    const { enableButton, disableButton } = MajorScores()
    beforeEach(()=>{
       initPage();
    });
    afterEach(()=>{
        disableButton();
        vi.useRealTimers();
        vi.restoreAllMocks();
    })

    describe("基本用法 ( Basic usage )", ()=>{
        it("最简应用：直接以 { key: selector } 的最简形式获取数据 ( simplest usage with the { key: selector } shorthand )", async ()=>{
            const extractor = new DomExtractor();
            const result = await extractor.search(document, {
                "pageTitle": "title",
                "name": ".name",
                "gender": ".gender",
                "dateOfBirth": ".student-info dd:nth-of-type(3)"
            })

            expect(result).toEqual({
                pageTitle: "LiLei - Student Information",
                name: "Li Lei",
                gender: "Man",
                dateOfBirth: "March 15, 2008"
            })
        });
        
        it("通过指定 selector，默认获取 innerText 中的数据 ( fetches innerText by default when selector is specified )", async ()=>{
            const extractor = new DomExtractor();
            const result = await extractor.search(document.body, {
                "name": { "selector": ".name"},
                "gender": { "selector": ".gender"},
                "dateOfBirth": { "selector": ".student-info dd:nth-of-type(3)" }
            })

            expect(result).toEqual({
                name: "Li Lei",
                gender: "Man",
                dateOfBirth: "March 15, 2008"
            })
        });
        
        it("获取指定 attr 中的数据 ( fetches data from the specified attr )", async ()=>{
            const extractor = new DomExtractor();
            const result = await extractor.search(document.body, {
                "name": { "selector": ".name", "attr": "innerText"},
                "photo": { "selector": ".photo img", "attr": "src" }
            })

            expect(result).toEqual({
                name: "Li Lei",
                photo: "https://example.com/photos/li-lei.jpg",
            })
        });

        it("通过简写的 attr( text 和 html ) 获取数据 ( fetches data with the text and html attr aliases )", async ()=>{
            const extractor = new DomExtractor();
            const result = await extractor.search(document.body, {
                "name": { "selector": ".name", "attr": "text"},
                "photo": { "selector": ".photo", "attr": "html" }
            })

            expect(result).toEqual({
                name: "Li Lei",
                photo: `<img src="https://example.com/photos/li-lei.jpg" alt="Photo of Li Lei" width="120">`,
            })
        });
        
        it("href 获取到的是完整的链接 ( href returns the full resolved URL )", async ()=>{
            const extractor = new DomExtractor();
            const result = await extractor.search(document.body, {
                "counselor": ".counselor",
                "counselorPage": { "selector": ".counselor a", "attr": "href" }
            })

            expect(result).toEqual({
                counselor: "Li Si",
                counselorPage: "https://example.com/counselor/li-si",
            })
        });

        it("获取数组类型数据 ( fetches array data )", async ()=>{
            const extractor = new DomExtractor({
                "groupKeys": ["majorCourses"]
            });
            const result = await extractor.search(document.body, {
                "name": ".name",
                "majorCourses": ".major-courses .course",
                "electiveCourses": ".elective-courses .course",
                "Interests": ".interests"
            });

            // Only keys listed in groupKeys are returned as arrays
            expect(result).toEqual({
                name: "Li Lei",
                majorCourses: ["Data Structures", "Operating Systems", "Computer Networks", "Database Systems" ],
                electiveCourses: "Music Appreciation",  // Not listed in groupKeys, so only the first matching span.course is returned
                Interests: "Basketball, Reading, Photography, Swimming, Traveling, Playing the Guitar"
            })
        });
    });

    describe("使用可选键 (key?) ( Optional keys )", ()=>{
        it("对于不确定的键，selector 找不到对应的元素时将报错 ( throws when a non-optional key's selector finds no element )", async () => {
            const extractor = new DomExtractor();
            const searchMap = {
                "selfIntroduction": "dd.self-introduction"  // Some students filled in Self Introduction while others did not
            }

            await expectRejectsCode(extractor.search(document.body, searchMap), "ELEMENT_NOT_FOUND");
        });

        it("通过设置 key? 可避免报错，并且返回空字符串 ( marks the key optional with ? to avoid the error and return an empty string )", async () => {
            const extractor = new DomExtractor();
            const searchMap = {
                "selfIntroduction?": "dd.self-introduction"
            }

            expect(await extractor.search(document.body, searchMap)).toEqual({
                "selfIntroduction": ""
            })
        });
        
        it("当指定的 selector 找到对应的元素时，key? 也能获取到值 ( an optional key still returns a value when its selector matches )", async () => {
            initPage(hanMeimeiHtml, 'HanMeimei');  // Han Meimei's page includes Self Introduction

            const extractor = new DomExtractor();
            const searchMap = {
                "name": ".name",
                "selfIntroduction?": "dd.self-introduction"
            }

            expect(await extractor.search(document.body, searchMap)).toEqual({
                "name": "Han Meimei",
                "selfIntroduction": "I am a Grade 11 student who loves literature and art. Reading novels and playing the piano are my favorite pastimes, and I hope to become a writer someday."
            })
        });
    });

    describe("使用 Action 修饰数据 ( Transforming data with Actions )", ()=>{
        it("使用内置的 Action 修饰数据 (single action: replace) ( built-in single action: replace )", async ()=>{
            const extractor = new DomExtractor();
            const result = await extractor.search(document.body ,{
                "name": ".name",
                "phoneNumber": {
                    "selector": ".phone-number",
                    "actions": [{
                        "name": 'replace',
                        "params": [" ",""]
                    }]
                },
            })

            expect(result).toEqual({
                name: "Li Lei",
                phoneNumber: "+8613800138000"
            })
        });

        it("使用内置的 Action 修饰数据 (single action: extract —— 使用正则表达式提取值) ( built-in single action: extract with a regex )", async ()=>{
            const extractor = new DomExtractor();
            const result = await extractor.search(document.body ,{
                "name": ".name",
                "from": {
                    "selector": ".address",
                    "actions": [{
                        "name": 'extract',
                        "params": [",([^,]*,[^,]*)$"]
                    }]
                },
            })

            expect(result).toEqual({
                name: "Li Lei",
                from: " Beijing, China"
            })
        });

        it("使用内置的 Action 修饰数据 (group action: split) ( built-in group action: split )", async ()=>{
            const extractor = new DomExtractor({
                groupKeys: ["interests"]
            });
            const result = await extractor.search(document.body ,{
                "name": ".name",
                "interests": {
                    "selector": ".interests",
                    "actions": [{
                        "name": 'split',
                        "params": [", "]    // Include the space here, otherwise the array items will keep leading spaces (or add a trim action, see below)
                    }]
                },
            })

            expect(result).toEqual({
                name: "Li Lei",
                interests: ["Basketball","Reading","Photography","Swimming","Traveling","Playing the Guitar"]
            })
        });

        it("使用自定义 Action 修饰数据 (single) ( custom single action )", async ()=>{
            // Multiple custom actions can be registered
            const actionRegistry = new ActionRegistry();
            actionRegistry.register('lower-case', (str:string):string=>str.toLowerCase())
            actionRegistry.register('upper-case', (str:string):string=>str.toUpperCase())
            // Pass the custom ActionRegistry to DomExtractor
            const extractor = new DomExtractor({
                groupKeys: ["majorCourses"],
                actionRegistry
            })
            const result = await extractor.search(document.body, {
                "NAME": { 
                    "selector": ".name",
                    "actions": ['upper-case']
                },
                "name": { 
                    "selector": ".name",
                    "actions": ['lower-case']
                },
                // A single action applied to an array affects each item
                "majorCourses": {
                    "selector": ".major-courses .course",
                    "actions": ["lower-case"]
                }
            });

            expect(result).toEqual({
                NAME: "LI LEI",
                name: "li lei",
                majorCourses: ["data structures", "operating systems", "computer networks", "database systems" ]
            })
        });

        it("使用自定义 Action 修饰数据 (group) ( custom group action )", async ()=>{
            // Register a custom action that sorts the array
            const actionRegistry = new ActionRegistry();
            actionRegistry.register("sort", (arr:string[])=>{
                const copy = [...arr]
                return copy.sort();
            }, 'group')
            const extractor = new DomExtractor({
                groupKeys: ["majorCourses"],
                actionRegistry
            });
            const result = await extractor.search(document.body, {
                "majorCourses": {
                    "selector": ".major-courses .course",
                    "actions": ["sort"] // A group action applies to the whole array and cannot be used on a non-array value
                }
            });

            expect(result).toEqual({
                majorCourses: ['Computer Networks', 'Data Structures', 'Database Systems', 'Operating Systems']
            })

        });

        it("多 Action 编排 (single) ( chaining single actions )", async ()=>{
            const extractor = new DomExtractor();
            const result = await extractor.search(document.body ,{
                "name": ".name",
                "from": {
                    "selector": ".address",
                    // First extract with a regex, then trim surrounding whitespace
                    "actions": [{ "name": 'extract', "params": [",([^,]*,[^,]*)$"] }, 'trim']
                },
            })

            expect(result).toEqual({
                name: "Li Lei",
                from: "Beijing, China"
            })
        });

        it("多 Action 编排 (group & single 混编) ( chaining mixed group and single actions )", async ()=>{
            const extractor = new DomExtractor({
                groupKeys: ["interests"]
            });
            const result = await extractor.search(document.body ,{
                "name": ".name",
                "interests": {
                    "selector": ".interests",
                    // First split the array, then trim each item
                    "actions": [{ "name": 'split', "params": [","] }, 'trim']
                },
            })

            expect(result).toEqual({
                name: "Li Lei",
                interests: ["Basketball","Reading","Photography","Swimming","Traveling","Playing the Guitar"]
            })
        });

        it("通过 context 向自定义 Action 传值 ( passes values to a custom action via context )", async()=>{
            const actionRegistry = new ActionRegistry();
            type SearchingContext = { cdn?: string }
            actionRegistry.register('cdn', function(this:SearchingContext, src:string){
                const cdn = this.cdn;
                if(!cdn) return "";
                const srcURL = new URL(src), cdnURL = new URL(cdn);
                srcURL.protocol = cdnURL.protocol;
                srcURL.host = cdnURL.host;
                srcURL.port = cdnURL.port;
                return srcURL.toString();
            })
            const extractor = new DomExtractor({
                context: {
                    cdn: "http://cdn.example.com:8080"
                },
                actionRegistry
            })
            const result = await extractor.search(document.body, {
                "photo": { "selector": ".photo img", "attr": "src" },
                "photoCDN": { "selector": ".photo img", "attr": "src", "actions": ["cdn"] }
            })

            expect(result).toEqual({
                photo: "https://example.com/photos/li-lei.jpg",
                photoCDN: "http://cdn.example.com:8080/photos/li-lei.jpg",
            })
        })
    });

    describe("其它进阶用法 ( Other advanced usage )", ()=>{
        it("使用特殊 selector 获取不存在于 DOM 文档中的值 (使用 'URL' selector) ( fetches a value outside the DOM via the 'URL' special selector )", async ()=>{
            const extractor = new DomExtractor()
            const result = await extractor.search(document.body, {
                "refer": "URL",
            })

            expect(result).toEqual({
                refer: "https://example.com/LiLei",
            })
        });

        it("获取 iframe 中的数据 ( fetches data from iframes )", async ()=>{
            const extractor = new DomExtractor();
            const result = await extractor.search(document.body, {
                "attendanceRate": ".additional-info iframe@dd:nth-of-type(1)",
                "volunteerHours": ".additional-info iframe@dd:nth-of-type(2)",
                "awards": ".additional-info iframe@dd:nth-of-type(3)",
                "clubs": ".additional-info iframe@dd:nth-of-type(4)"
            })

            expect(result).toEqual({
                attendanceRate: "98%", 
                volunteerHours: "42 hours", 
                awards: "Second Prize, National High School Programming Contest 2025", 
                clubs: "Computer Club, Photography Society"
            })
        });

        it("获取深层 iframe 中的数据 ( fetches data from a nested iframe )", async ()=>{
            // Nest another iframe inside the first-level iframe document
            const outerFrame = document.querySelector(".additional-info iframe") as HTMLIFrameElement;
            await (window as any).happyDOM.waitUntilComplete();
            const outerDoc = outerFrame.contentDocument!;
            outerDoc.body.insertAdjacentHTML('beforeend', '<iframe class="inner-frame"></iframe>');
            await (window as any).happyDOM.waitUntilComplete();
            const innerDoc = (outerDoc.querySelector(".inner-frame") as HTMLIFrameElement).contentDocument!;
            innerDoc.body.innerHTML = '<p class="activity-remark">Reviewed by the school magazine</p>';

            const extractor = new DomExtractor();
            const result = await extractor.search(document.body, {
                "activityRemark": ".additional-info iframe@.inner-frame@.activity-remark"
            })

            expect(result).toEqual({
                activityRemark: "Reviewed by the school magazine"
            })
        });
        
        it("模拟 click 并获取数据 ( clicks and then fetches data )", async ()=>{
            vi.useFakeTimers();
            enableButton([92, 88, 90, 95], 1000);
            const extractor = new DomExtractor();
            const promiseWithClick = extractor.search(document.body, {
                "scoreOfOperatingSystems": {
                    selector: "#major_course_scores tbody td:nth-child(2)",
                    click: "#btn_load_scores"
                }
            })

            // Poll for the target after clicking; it is inserted after 1000ms, so allow extra time
            await vi.advanceTimersByTimeAsync(2000);
            await expect(promiseWithClick).resolves.toEqual({
                scoreOfOperatingSystems: "88"
            });
        });
    });

    describe("错误使用及报错 ( Misuse and errors )", ()=>{
        describe("非法参数 ( Invalid arguments )", ()=>{
            it("dom 不是 Document 或 Element 时，报错 ( throws when dom is not a Document or Element )", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(null as any, { name: ".name" }), "INVALID_DOM");
                await expectRejectsCode(extractor.search("document" as any, { name: ".name" }), "INVALID_DOM");
            });

            it.each([
                { zh: "map 为 null 时，报错", en: "throws when map is null", map: null },
                { zh: "map 为数组时，报错", en: "throws when map is an array", map: [] },
                { zh: "map 为字符串数组时，报错", en: "throws when map is a string array", map: ["name"] },
                { zh: "map 为 Date 实例时，报错", en: "throws when map is a Date instance", map: new Date() },
            ])("$zh ( $en )", async ({ map: badMap }) => {
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, badMap as any), "INVALID_MAP");
            });

            it("map 传空对象时，返回空对象 ( returns an empty object when map is empty )", async ()=>{
                const extractor = new DomExtractor();

                const result = await extractor.search(document.body, {});

                expect(result).toEqual({});
            });

            it("search 不应修改传入的搜索配置 ( search does not mutate the provided search config )", async ()=>{
                const extractor = new DomExtractor();
                const searchMap = {
                    "name": {
                        "selector": ".name",
                        "actions": [{ "name": "trim" }]
                    }
                };

                await extractor.search(document.body, searchMap as any);

                expect(searchMap).toEqual({
                    name: {
                        selector: ".name",
                        actions: [{ name: "trim" }]
                    }
                });
            });
        });

        describe("selector 相关 ( selector-related errors )", ()=>{
            it.each([
                { zh: "非法 map：selector 为空字符串", en: "invalid map: empty selector string", map: { name: { selector: "" } } },
                { zh: "非法 map：selector 为纯空白", en: "invalid map: whitespace-only selector", map: { name: { selector: "   " } } },
                { zh: "非法 map：缺失 selector", en: "invalid map: missing selector", map: { name: { attr: "innerText" } } },
                { zh: "非法 map：字符串简写为空", en: "invalid map: empty string shorthand", map: { name: "" } },
            ])("$zh ( $en )", async ({ map: badMap }) => {
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, badMap as any), "SELECTOR_EMPTY");
            });

            it("map.selector 找不到对应元素时，报错 ( throws when map.selector finds no element )", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": ".name",
                    "ghost": ".ghost"
                }), "ELEMENT_NOT_FOUND");
            });

            it("元素存在但 map.attr 属性名取不到值时，报错 ( throws when the element exists but map.attr cannot be read )", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "attr": "data-not-exist" }
                }), "ATTR_READ_FAILED");
            });
            
            it("group 选择器找不到元素时，返回空数组而不是报错 ( returns an empty array instead of throwing when a group selector finds no elements )", async ()=>{
                const extractor = new DomExtractor({
                    groupKeys: ["ghostCourses"]
                });

                const result = await extractor.search(document.body, {
                    "ghostCourses": ".ghost-course"
                });

                // Unlike a missing single key, group mode silently returns an empty array
                expect(result).toEqual({ ghostCourses: [] });
            });

            it("group 选择器不支持 @ 深层查找，会因非法 selector 报错 ( group selectors do not support @ deep lookup and throw on an invalid selector )", async ()=>{
                const extractor = new DomExtractor({
                    groupKeys: ["attendanceRate"]
                });

                // group uses querySelectorAll and does not parse @, so the whole string is treated as an invalid CSS selector
                const error = await expectRejectsCode(extractor.search(document.body, {
                    "attendanceRate": ".additional-info iframe@dd:nth-of-type(1)"
                }), "UNKNOWN_ERROR");

                expect(error.occur?.key).toBe("attendanceRate");
            });

            it("iframe 跨域无法访问 contentDocument 时，打印警告并按找不到元素报错 ( logs a warning and reports element-not-found when contentDocument is blocked by cross-origin access )", async ()=>{
                // happy-dom does not simulate cross-origin access; mimic the browser with a getter that throws SecurityError
                const iframe = document.querySelector(".additional-info iframe") as HTMLIFrameElement;
                Object.defineProperty(iframe, "contentDocument", {
                    get(){
                        throw new DOMException("Blocked a frame with origin from accessing a cross-origin frame.", "SecurityError");
                    }
                });
                const warnSpy = vi.spyOn(console, "warn").mockImplementation(()=>{});

                const extractor = new DomExtractor();
                await expectRejectsCode(extractor.search(document.body, {
                    "attendanceRate": ".additional-info iframe@dd:nth-of-type(1)"
                }), "ELEMENT_NOT_FOUND");

                expect(warnSpy).toHaveBeenCalledOnce();
                expect(String(warnSpy.mock.calls[0]?.[0])).toContain("cross-origin restrictions");
            });
        });

        describe("action 相关 ( action-related errors )", ()=>{
            it("自定义 action 中引用不存在的上下文时，只能拿到 undefined ( a custom action sees undefined for context keys that do not exist )", async ()=>{
                const seen:(string|undefined)[] = [];
                const actionRegistry = new ActionRegistry();
                actionRegistry.register("read-context", function(this:Record<string, string|undefined>, str:string){
                    seen.push(this.cdn);
                    return str;
                });
                // cdn is not configured via context
                const extractor = new DomExtractor({ actionRegistry });

                const result = await extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": ["read-context"] }
                });

                expect(result).toEqual({ name: "Li Lei" });
                expect(seen).toEqual([undefined]);
            });

            it("map.actions 配置为非数组时，报错 ( throws when map.actions is not an array )", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": "trim" }
                } as any), "INVALID_ACTIONS");
            });

            it("map.actions 使用未注册的 action 名时，报错 ( throws when map.actions uses an unregistered action name )", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": ["not-registered"] }
                }), "ACTION_NOT_FOUND");
            });

            it("map.action 对象缺少 name 时，报错 ( throws when a map.action object is missing name )", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": [{ "params": [] }] }
                } as any), "INVALID_ACTION_NAME");
            });

            it("map.action 的 params 配置为非数组时，报错 ( throws when map.action params is not an array )", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": [{ "name": "trim", "params": "x" }] }
                } as any), "INVALID_ACTION_PARAMS");
            });

            it("group action 应用到非数组值 (未在 groupKeys 中声明) 时，报错 ( throws when a group action is applied to a value not listed in groupKeys )", async ()=>{
                const extractor = new DomExtractor();  // interests is not listed in groupKeys, so it is fetched as a string

                await expectRejectsCode(extractor.search(document.body, {
                    "interests": { "selector": ".interests", "actions": ["split"] }
                }), "ACTION_TYPE_MISMATCH");
            });

            it("map.action 执行过程中自身抛出的异常，被包装为 DomExtractorError 后抛出 ( wraps an exception thrown by a map.action execution in a DomExtractorError )", async ()=>{
                const actionRegistry = new ActionRegistry();
                actionRegistry.register("boom", (str:string):string=>{
                    throw new Error("Custom action failed");
                });
                const extractor = new DomExtractor({ actionRegistry });

                const error = await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": ["boom"] }
                }), "UNKNOWN_ERROR");

                // The original exception is kept in cause
                expect(error.cause).toBeInstanceOf(Error);
                expect((error.cause as Error).message).toBe("Custom action failed");
            });
        });

        describe("click 相关 ( click-related errors )", ()=>{
            it("map.click 指定的按钮 selector 不存在时，跳过点击，按找不到目标元素报错 ( skips the click and reports element-not-found when the map.click selector does not exist )", async ()=>{
                const warnSpy = vi.spyOn(console, "warn").mockImplementation(()=>{});
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "scoreOfOperatingSystems": {
                        "selector": "#major_course_scores tbody td:nth-child(2)",
                        "click": "#btn_not_exists"
                    }
                }), "ELEMENT_NOT_FOUND");

                // When the trigger does not exist, skip the click without logging a Click warning
                expect(warnSpy).not.toHaveBeenCalled();
            });

            it("map.click 后目标元素一直未出现 (轮询超时) 时，打印 Click 失败警告并报错 ( logs a Click failure warning and throws on polling timeout )", async ()=>{
                vi.useFakeTimers();
                const warnSpy = vi.spyOn(console, "warn").mockImplementation(()=>{});

                const extractor = new DomExtractor();
                const searchPromise = extractor.search(document.body, {
                    "scoreOfOperatingSystems": {
                        "selector": "#major_course_scores tbody td:nth-child(2)",
                        "click": "#btn_load_scores"
                    }
                });

                // The button exists but has no click handler, so the target never appears; wait for polling to exhaust (default 6 × 500ms)
                const assertion = expectRejectsCode(searchPromise, "ELEMENT_NOT_FOUND");
                await vi.advanceTimersByTimeAsync(4000);

                await assertion;
                expect(String(warnSpy.mock.calls[0]?.[0])).toContain("did not appear or the lookup timed out");
            });
        });

        it("多层包装后错误前缀不重复，并携带 occur key 定位配置键 ( does not duplicate the error prefix after wrapping and carries the occur key )", async ()=>{
            const extractor = new DomExtractor();

            const error = await expectRejectsCode(extractor.search(document.body, {
                "name": ".name",
                "ghost": { "selector": ".ghost" }
            }), "ELEMENT_NOT_FOUND");

            expect(error.occur?.key).toBe("ghost");
            // The error prefix appears only once even after repeated wrapping
            expect(error.message.match(/\[DOM_EXTRACTOR_ERR\]/g)).toHaveLength(1);
        });
    });
});
