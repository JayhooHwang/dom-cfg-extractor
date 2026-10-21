import { describe, it, expect, beforeEach } from 'vitest'
import { ActionRegistry } from '../../src/action/action-registry.ts'
import { ActionRunner } from '../../src/action/action-runner.ts'
import { DomExtractorError } from '../../src/error.ts'

function createRegistry(){
    const registry = new ActionRegistry();
    registry.register('upper', (str:string)=>str.toUpperCase());
    registry.register('append', (str:string, suffix:string)=>str + suffix);
    registry.register('prefixAll', (arr:string[], prefix:string)=>arr.map(item=>prefix+item), 'group');
    registry.register('sort', (arr:string[])=>[...arr].sort(), 'group');
    return registry;
}

describe("ActionRunner.run", ()=>{
    let runner: ActionRunner;

    beforeEach(()=>{
        runner = new ActionRunner(createRegistry());
    })

    it("没有 action 时原样返回", ()=>{
        expect(runner.run('abc', [], {})).toBe('abc');
        expect(runner.run(['a','b'], [], {})).toEqual(['a','b']);
    })

    describe("action 的调用形式", ()=>{
        it("无参 action 可以以 action name 形式或对象形式调用", ()=>{
            expect(runner.run('abc', ['upper'], {})).toBe('ABC');
            expect(runner.run('abc', [{name: 'upper', params: []}], {})).toBe('ABC');
        })

        it("以对象形式调用时透传 params", ()=>{
            expect(runner.run('abc', [{name:'append', params:['!']}], {})).toBe('abc!');
            expect(runner.run(['a','b'], [{name:'prefixAll', params:['#']}], {})).toEqual(['#a','#b']);
        })

        it("以对象形式调用并省略 params 时按空数组处理", ()=>{
            // @ts-expect-error 模拟纯 JS 下传参
            expect(runner.run('abc', [{name:'upper'}], {})).toBe('ABC');
        })
        
        it("有参 action 以 action name 形式调用，相当于省略 params", ()=>{
            expect(runner.run('abc', ['upper'], {})).toBe('ABC');
        })
    })

    it("对字符串应用 single action", ()=>{
        expect(runner.run('abc', ['upper'], {})).toBe('ABC');
    })

    it("对数组逐个应用 single action，且不修改原数组", ()=>{
        const rawData = ['a','b'];
        const result = runner.run(rawData, ['upper'], {});

        expect(result).toEqual(['A','B']);
        expect(rawData).toEqual(['a','b']);
    })

    it("对数组整体应用 group action", ()=>{
        expect(runner.run(['b','a'], ['sort'], {})).toEqual(['a','b']);
    })

    it("对字符串按配置顺序链式执行多个 action", ()=>{
        expect(runner.run('abc', [{name:'append', params:['x']}, 'upper'], {})).toBe('ABCX');
        expect(runner.run('abc', ['upper', {name:'append', params:['x']}], {})).toBe('ABCx');
    })

    it("对数组按配置顺序链式执行多个 action，混合 group 与 single", ()=>{
        expect(runner.run(['c','a','b'], ['upper', 'sort', {name:'append', params:['x']}], {})).toEqual(['Ax', 'Bx', 'Cx'])
        expect(runner.run(['c','a','b'], [ {name:'append', params:['x']}, 'sort', 'upper'], {})).toEqual(['AX', 'BX', 'CX'])
    });

    it("以 context 作为 action handle 的 this", ()=>{
        const registry = new ActionRegistry();
        registry.register('prefix', function(this:{prefix:string}, str:string){
            return this.prefix + str;
        });
        const contextRunner = new ActionRunner(registry);

        expect(contextRunner.run('x', ['prefix'], {prefix:'pre-'})).toBe('pre-x');
    })

    it("group action 应用于字符串时抛错", ()=>{
        expect(()=>runner.run('a,b', ['sort'], {})).toThrow(DomExtractorError);
    })

    it("action 未注册时抛错", ()=>{
        expect(()=>runner.run('abc', ['missing'], {})).toThrow(DomExtractorError);
    })

    it("action name 为空或空白时抛错", ()=>{
        expect(()=>runner.run('abc', [''], {})).toThrow(DomExtractorError);
        expect(()=>runner.run('abc', ['   '], {})).toThrow(DomExtractorError);
    })

    it("action params 不是数组时抛错", ()=>{
        // @ts-expect-error 模拟纯 JS 下错误传参
        expect(()=>runner.run('abc', [{name:'upper', params:'x'}], {})).toThrow(DomExtractorError);
    })
})
