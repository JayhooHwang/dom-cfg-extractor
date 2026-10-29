import { describe, it, expect, beforeEach } from 'vitest'
import { ActionRegistry } from '../../src/action/action-registry.ts'
import { ActionRunner } from '../../src/action/action-runner.ts'
import { expectThrowsCode } from '../helpers/error.ts'

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

    it("没有 action 时原样返回 ( returns data unchanged when there are no actions )", ()=>{
        expect(runner.run('abc', [], {})).toBe('abc');
        expect(runner.run(['a','b'], [], {})).toEqual(['a','b']);
    })

    describe("action 的调用形式 ( action call forms )", ()=>{
        it("无参 action 可以以 action name 形式或对象形式调用 ( an action without params can be called by name or as an object )", ()=>{
            expect(runner.run('abc', ['upper'], {})).toBe('ABC');
            expect(runner.run('abc', [{name: 'upper', params: []}], {})).toBe('ABC');
        })

        it("以对象形式调用时透传 params ( passes params through when called as an object )", ()=>{
            expect(runner.run('abc', [{name:'append', params:['!']}], {})).toBe('abc!');
            expect(runner.run(['a','b'], [{name:'prefixAll', params:['#']}], {})).toEqual(['#a','#b']);
        })

        it("以对象形式调用并省略 params 时按空数组处理 ( treats omitted params as an empty array when called as an object )", ()=>{
            // @ts-expect-error simulate an invalid argument from plain JS
            expect(runner.run('abc', [{name:'upper'}], {})).toBe('ABC');
        })
        
        it("有参 action 以 action name 形式调用，相当于省略 params ( calling an action that takes params by name omits params )", ()=>{
            expect(runner.run('abc', ['upper'], {})).toBe('ABC');
        })
    })

    it("对字符串应用 single action ( applies a single action to a string )", ()=>{
        expect(runner.run('abc', ['upper'], {})).toBe('ABC');
    })

    it("对数组逐个应用 single action，且不修改原数组 ( applies a single action to each array item without mutating the original array )", ()=>{
        const rawData = ['a','b'];
        const result = runner.run(rawData, ['upper'], {});

        expect(result).toEqual(['A','B']);
        expect(rawData).toEqual(['a','b']);
    })

    it("对数组整体应用 group action ( applies a group action to the whole array )", ()=>{
        expect(runner.run(['b','a'], ['sort'], {})).toEqual(['a','b']);
    })

    it("对字符串按配置顺序链式执行多个 action ( runs multiple actions on a string in the configured order )", ()=>{
        expect(runner.run('abc', [{name:'append', params:['x']}, 'upper'], {})).toBe('ABCX');
        expect(runner.run('abc', ['upper', {name:'append', params:['x']}], {})).toBe('ABCx');
    })

    it("对数组按配置顺序链式执行多个 action，混合 group 与 single ( runs multiple actions on an array in the configured order, mixing group and single )", ()=>{
        expect(runner.run(['c','a','b'], ['upper', 'sort', {name:'append', params:['x']}], {})).toEqual(['Ax', 'Bx', 'Cx'])
        expect(runner.run(['c','a','b'], [ {name:'append', params:['x']}, 'sort', 'upper'], {})).toEqual(['AX', 'BX', 'CX'])
    });

    it("以 context 作为 action handle 的 this ( uses context as this inside the action handle )", ()=>{
        const registry = new ActionRegistry();
        registry.register('prefix', function(this:{prefix:string}, str:string){
            return this.prefix + str;
        });
        const contextRunner = new ActionRunner(registry);

        expect(contextRunner.run('x', ['prefix'], {prefix:'pre-'})).toBe('pre-x');
    })

    it("group action 应用于字符串时抛错 ( throws when a group action is applied to a string )", ()=>{
        expectThrowsCode(()=>runner.run('a,b', ['sort'], {}), "ACTION_TYPE_MISMATCH");
    })

    it("action 未注册时抛错 ( throws when the action is not registered )", ()=>{
        expectThrowsCode(()=>runner.run('abc', ['missing'], {}), "ACTION_NOT_FOUND");
    })

    it("action name 为空或空白时抛错 ( throws when the action name is empty or blank )", ()=>{
        expectThrowsCode(()=>runner.run('abc', [''], {}), "INVALID_ACTION_NAME");
        expectThrowsCode(()=>runner.run('abc', ['   '], {}), "INVALID_ACTION_NAME");
    })

    it("action params 不是数组时抛错 ( throws when action params is not an array )", ()=>{
        // @ts-expect-error simulate an invalid argument from plain JS
        expectThrowsCode(()=>runner.run('abc', [{name:'upper', params:'x'}], {}), "INVALID_ACTION_PARAMS");
    })
})
