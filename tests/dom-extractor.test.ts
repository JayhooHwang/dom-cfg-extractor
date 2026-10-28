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

    describe("基本用法", ()=>{
        it("最简应用：直接以 { key: selector } 的最简形式获取数据", async ()=>{
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
        
        it("通过指定 selector，默认获取 innerText 中的数据", async ()=>{
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
        
        it("获取指定 attr 中的数据", async ()=>{
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

        it("通过简写的 attr( text 和 html ) 获取数据", async ()=>{
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
        
        it("href 获取到的是完整的链接", async ()=>{
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

        it("获取数组类型数据", async ()=>{
            const extractor = new DomExtractor({
                "groupKeys": ["majorCourses"]
            });
            const result = await extractor.search(document.body, {
                "name": ".name",
                "majorCourses": ".major-courses .course",
                "electiveCourses": ".elective-courses .course",
                "Interests": ".interests"
            });

            // 只有在 groupKeys 中指定的 key 才返回为数组
            expect(result).toEqual({
                name: "Li Lei",
                majorCourses: ["Data Structures", "Operating Systems", "Computer Networks", "Database Systems" ],
                electiveCourses: "Music Appreciation",  // 未在 groupKeys 中指定，只能获取到第一个匹配的 span.course
                Interests: "Basketball, Reading, Photography, Swimming, Traveling, Playing the Guitar"
            })
        });
    });

    describe("使用可选键 (key?)", ()=>{
        it("对于不确定的键，selector 找不到对应的元素时将报错", async () => {
            const extractor = new DomExtractor();
            const searchMap = {
                "selfIntroduction": "dd.self-introduction"  //对于 Self Introduction 有些学生填写了，而有些学生没有填写
            }

            await expectRejectsCode(extractor.search(document.body, searchMap), "ELEMENT_NOT_FOUND");
        });

        it("通过设置 key? 可避免报错，并且返回空字符串", async () => {
            const extractor = new DomExtractor();
            const searchMap = {
                "selfIntroduction?": "dd.self-introduction"
            }

            expect(await extractor.search(document.body, searchMap)).toEqual({
                "selfIntroduction": ""
            })
        });
        
        it("当指定的 selector 找到对应的元素时， key? 也能获取到值", async () => {
            initPage(hanMeimeiHtml, 'HanMeimei');  // Han Meimei 的页面填写了 Self Introduction

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

    describe("使用 Action 修饰数据", ()=>{
        it("使用内置的 Action 修饰数据 (single action: replace) ", async ()=>{
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

        it("使用内置的 Action 修饰数据 (single action: extract —— 使用正则表达式提取值) ", async ()=>{
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

        it("使用内置的 Action 修饰数据 (group action: split) ", async ()=>{
            const extractor = new DomExtractor({
                groupKeys: ["interests"]
            });
            const result = await extractor.search(document.body ,{
                "name": ".name",
                "interests": {
                    "selector": ".interests",
                    "actions": [{
                        "name": 'split',
                        "params": [", "]    // 注意这里要包含空格，否则得到的数组元素将留有空格 ( 也可以再加一个 trim Action 去空格，见后文 )
                    }]
                },
            })

            expect(result).toEqual({
                name: "Li Lei",
                interests: ["Basketball","Reading","Photography","Swimming","Traveling","Playing the Guitar"]
            })
        });

        it("使用自定义 Action 修饰数据 (single) ", async ()=>{
            // 可注册多个自定义 Action
            const actionRegistry = new ActionRegistry();
            actionRegistry.register('lower-case', (str:string):string=>str.toLowerCase())
            actionRegistry.register('upper-case', (str:string):string=>str.toUpperCase())
            // 将自定义的 ActionRegistry 配置到 DomExtractor
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
                // Single Action 应用于数组时，将对数组的每个元素生效
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

        it("使用自定义 Action 修饰数据 (group) ", async ()=>{
            // 注册一个自定义 Action，用来给数组排序
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
                    "actions": ["sort"] // Group Action 对数组整体生效，不可用于非数组值
                }
            });

            expect(result).toEqual({
                majorCourses: ['Computer Networks', 'Data Structures', 'Database Systems', 'Operating Systems']
            })

        });

        it("多 Action 编排 (single) ", async ()=>{
            const extractor = new DomExtractor();
            const result = await extractor.search(document.body ,{
                "name": ".name",
                "from": {
                    "selector": ".address",
                    // 先用正则表达式提取值，再去除首尾空格
                    "actions": [{ "name": 'extract', "params": [",([^,]*,[^,]*)$"] }, 'trim']
                },
            })

            expect(result).toEqual({
                name: "Li Lei",
                from: "Beijing, China"
            })
        });

        it("多 Action 编排 (group & single 混编) ", async ()=>{
            const extractor = new DomExtractor({
                groupKeys: ["interests"]
            });
            const result = await extractor.search(document.body ,{
                "name": ".name",
                "interests": {
                    "selector": ".interests",
                    // 先拆分数组，再去除各元素的首尾空格
                    "actions": [{ "name": 'split', "params": [","] }, 'trim']
                },
            })

            expect(result).toEqual({
                name: "Li Lei",
                interests: ["Basketball","Reading","Photography","Swimming","Traveling","Playing the Guitar"]
            })
        });

        it("通过 context 向自定义 Action 传值", async()=>{
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

    describe("其它进阶用法", ()=>{
        it("使用特殊 selector 获取不存在于 DOM 文档中的值(使用 'URL' selector)", async ()=>{
            const extractor = new DomExtractor()
            const result = await extractor.search(document.body, {
                "refer": "URL",
            })

            expect(result).toEqual({
                refer: "https://example.com/LiLei",
            })
        });

        it("获取 iframe 中的数据", async ()=>{
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

        it("获取深层 iframe 中的数据", async ()=>{
            // 在一级 iframe 的文档内再嵌套一层 iframe
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
        
        it("模拟 click 并获取数据", async ()=>{
            vi.useFakeTimers();
            enableButton([92, 88, 90, 95], 1000);
            const extractor = new DomExtractor();
            const promiseWithClick = extractor.search(document.body, {
                "scoreOfOperatingSystems": {
                    selector: "#major_course_scores tbody td:nth-child(2)",
                    click: "#btn_load_scores"
                }
            })

            // 点击后轮询查找目标元素，目标元素在 1000ms 后才插入 DOM，留出余量确保能查到
            await vi.advanceTimersByTimeAsync(2000);
            await expect(promiseWithClick).resolves.toEqual({
                scoreOfOperatingSystems: "88"
            });
        });
    });

    describe("search 不应修改传入的搜索配置", ()=>{
        it("省略 params 的 action 不会把 params 写回 searchMap", async ()=>{
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

    describe("错误使用及报错", ()=>{
        describe("非法参数", ()=>{
            it("dom 不是 Document 或 Element 时，报错", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(null as any, { name: ".name" }), "INVALID_DOM");
                await expectRejectsCode(extractor.search("document" as any, { name: ".name" }), "INVALID_DOM");
            });

            it.each([
                ["null", null],
                ["数组", []],
                ["字符串数组", ["name"]],
                ["Date 实例", new Date()],
            ])("map 为 %s 时，报错", async (_label, badMap) => {
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, badMap as any), "INVALID_MAP");
            });

            it("map 传空对象时，返回空对象", async ()=>{
                const extractor = new DomExtractor();

                const result = await extractor.search(document.body, {});

                expect(result).toEqual({});
            });
        });

        describe("selector 相关", ()=>{
            it.each([
                ["selector 为空字符串", { name: { selector: "" } }],
                ["selector 为纯空白", { name: { selector: "   " } }],
                ["缺失 selector", { name: { attr: "innerText" } }],
                ["字符串简写为空", { name: "" }],
            ])("非法 map：%s", async (_label, badMap) => {
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, badMap as any), "SELECTOR_EMPTY");
            });

            it("map.selector 找不到对应元素时，报错", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": ".name",
                    "ghost": ".ghost"
                }), "ELEMENT_NOT_FOUND");
            });

            it("元素存在但 map.attr 属性名取不到值时，报错", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "attr": "data-not-exist" }
                }), "ATTR_READ_FAILED");
            });
            
            it("group 选择器找不到元素时，返回空数组而不是报错", async ()=>{
                const extractor = new DomExtractor({
                    groupKeys: ["ghostCourses"]
                });

                const result = await extractor.search(document.body, {
                    "ghostCourses": ".ghost-course"
                });

                // 与单个 key 缺失即报错不同：group 模式静默返回空数组
                expect(result).toEqual({ ghostCourses: [] });
            });

            it("group 选择器不支持 @ 深层查找，会因非法 selector 报错", async ()=>{
                const extractor = new DomExtractor({
                    groupKeys: ["attendanceRate"]
                });

                // group 走 querySelectorAll，不解析 @ 分隔符，因此整串被当作非法 CSS selector
                const error = await expectRejectsCode(extractor.search(document.body, {
                    "attendanceRate": ".additional-info iframe@dd:nth-of-type(1)"
                }), "UNKNOWN_ERROR");

                expect(error.occur?.key).toBe("attendanceRate");
            });

            it("iframe 跨域无法访问 contentDocument 时，打印警告并按找不到元素报错", async ()=>{
                // happy-dom 不模拟跨域，参照浏览器行为用抛 SecurityError 的 getter 模拟跨域访问被拒
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
                expect(String(warnSpy.mock.calls[0]?.[0])).toContain("跨域限制");
            });
        });

        describe("action 相关", ()=>{
            it("自定义 action 中引用不存在的上下文时，只能拿到 undefined", async ()=>{
                const seen:(string|undefined)[] = [];
                const actionRegistry = new ActionRegistry();
                actionRegistry.register("read-context", function(this:Record<string, string|undefined>, str:string){
                    seen.push(this.cdn);
                    return str;
                });
                // 未通过 context 配置 cdn
                const extractor = new DomExtractor({ actionRegistry });

                const result = await extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": ["read-context"] }
                });

                expect(result).toEqual({ name: "Li Lei" });
                expect(seen).toEqual([undefined]);
            });

            it("map.actions 配置为非数组时，报错", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": "trim" }
                } as any), "INVALID_ACTIONS");
            });

            it("map.actions 使用未注册的 action 名时，报错", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": ["not-registered"] }
                }), "ACTION_NOT_FOUND");
            });

            it("map.action 对象缺少 name 时，报错", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": [{ "params": [] }] }
                } as any), "INVALID_ACTION_NAME");
            });

            it("map.action 的 params 配置为非数组时，报错", async ()=>{
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": [{ "name": "trim", "params": "x" }] }
                } as any), "INVALID_ACTION_PARAMS");
            });

            it("group action 应用到非数组值(未在 groupKeys 中声明)时，报错", async ()=>{
                const extractor = new DomExtractor();  // interests 未声明为 groupKeys，取到的是字符串

                await expectRejectsCode(extractor.search(document.body, {
                    "interests": { "selector": ".interests", "actions": ["split"] }
                }), "ACTION_TYPE_MISMATCH");
            });

            it("map.action 执行过程中自身抛出的异常，被包装为 DomExtractorError 后抛出", async ()=>{
                const actionRegistry = new ActionRegistry();
                actionRegistry.register("boom", (str:string):string=>{
                    throw new Error("自定义 action 执行失败");
                });
                const extractor = new DomExtractor({ actionRegistry });

                const error = await expectRejectsCode(extractor.search(document.body, {
                    "name": { "selector": ".name", "actions": ["boom"] }
                }), "UNKNOWN_ERROR");

                // 原始异常保留在 cause 中
                expect(error.cause).toBeInstanceOf(Error);
                expect((error.cause as Error).message).toBe("自定义 action 执行失败");
            });
        });

        describe("click 相关", ()=>{
            it("map.click 指定的按钮 selector 不存在时，跳过点击，按找不到目标元素报错", async ()=>{
                const warnSpy = vi.spyOn(console, "warn").mockImplementation(()=>{});
                const extractor = new DomExtractor();

                await expectRejectsCode(extractor.search(document.body, {
                    "scoreOfOperatingSystems": {
                        "selector": "#major_course_scores tbody td:nth-child(2)",
                        "click": "#btn_not_exists"
                    }
                }), "ELEMENT_NOT_FOUND");

                // 触发器不存在时直接跳过点击，不打印 Click 警告
                expect(warnSpy).not.toHaveBeenCalled();
            });

            it("map.click 后目标元素一直未出现(轮询超时)时，打印 Click 失败警告并报错", async ()=>{
                vi.useFakeTimers();
                const warnSpy = vi.spyOn(console, "warn").mockImplementation(()=>{});

                const extractor = new DomExtractor();
                const searchPromise = extractor.search(document.body, {
                    "scoreOfOperatingSystems": {
                        "selector": "#major_course_scores tbody td:nth-child(2)",
                        "click": "#btn_load_scores"
                    }
                });

                // 按钮存在但未绑定点击逻辑，目标元素不会出现；等待轮询耗尽 (默认 6 × 500ms)
                const assertion = expectRejectsCode(searchPromise, "ELEMENT_NOT_FOUND");
                await vi.advanceTimersByTimeAsync(4000);

                await assertion;
                expect(String(warnSpy.mock.calls[0]?.[0])).toContain("未出现或查找超时");
            });
        });

        it("多层包装后错误前缀不重复，并携带 occur key 定位配置键", async ()=>{
            const extractor = new DomExtractor();

            const error = await expectRejectsCode(extractor.search(document.body, {
                "name": ".name",
                "ghost": { "selector": ".ghost" }
            }), "ELEMENT_NOT_FOUND");

            expect(error.occur?.key).toBe("ghost");
            // 错误前缀只出现一次，避免层层包装后重复
            expect(error.message.match(/\[DOM_EXTRACTOR_ERR\]/g)).toHaveLength(1);
        });
    });
});