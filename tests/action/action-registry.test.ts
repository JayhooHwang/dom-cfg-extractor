import { describe, it, expect } from 'vitest'
import { ActionRegistry } from '../../src/action/action-registry.ts'
import { Action } from '../../src/action/action.ts'
import { expectThrowsCode } from '../helpers/error.ts'

describe("ActionRegistry.register/includes", ()=>{
    it("注册后 includes 返回 true，未注册返回 false ( includes returns true after registration and false otherwise )", ()=>{
        const registry = new ActionRegistry();
        registry.register('upper', (str:string)=>str.toUpperCase());
        expect(registry.includes('upper')).toBe(true);
        expect(registry.includes('lower')).toBe(false);
    })

    it("applyFor 默认为 single ( applyFor defaults to single )", ()=>{
        const registry = new ActionRegistry();
        registry.register('upper', (str:string)=>str.toUpperCase());
        expect(registry.getAction('upper').applyFor).toBe('single');
    })

    it("可显式注册 group action ( can explicitly register a group action )", ()=>{
        const registry = new ActionRegistry();
        registry.register('sort', (arr:string[])=>[...arr].sort(), 'group');
        expect(registry.getAction('sort').applyFor).toBe('group');
    })

    it("同名 action 重复注册时抛错 ( throws when registering a duplicate action name )", ()=>{
        const registry = new ActionRegistry();
        registry.register('upper', (str:string)=>str.toUpperCase());
        expectThrowsCode(()=>registry.register('upper', (str:string)=>str.toLowerCase()), "ACTION_DUPLICATE");
    })
})

describe("ActionRegistry.getAction", ()=>{
    it("返回注册的 Action 实例 ( returns the registered Action instance )", ()=>{
        const registry = new ActionRegistry();
        registry.register('upper', (str:string)=>str.toUpperCase());
        const action = registry.getAction('upper');
        expect(action).toBeInstanceOf(Action);
        expect(action.name).toBe('upper');
        expect(action.run('abc', {})).toBe('ABC');
    })

    it("获取不存在的 action 时抛错 ( throws when getting an action that does not exist )", ()=>{
        const registry = new ActionRegistry();
        expectThrowsCode(()=>registry.getAction('missing'), "ACTION_NOT_FOUND");
    })
})

describe("ActionRegistry[Symbol.iterator]", ()=>{
    it("按注册顺序迭代所有 Action ( iterates over all Actions in registration order )", ()=>{
        const registry = new ActionRegistry();
        registry.register('first', (str:string)=>str);
        registry.register('second', (str:string)=>str);
        expect([...registry].map(action=>action.name)).toEqual(['first','second']);
    })

    it("空注册表迭代结果为空 ( iterating an empty registry yields nothing )", ()=>{
        expect([...new ActionRegistry()]).toEqual([]);
    })
})

describe("ActionRegistry.merge", ()=>{
    it("合并多个注册表 ( merges multiple registries )", ()=>{
        const first = new ActionRegistry();
        first.register('a', (str:string)=>str);
        const second = new ActionRegistry();
        second.register('b', (str:string)=>str);

        const merged = ActionRegistry.getMerged(first, second);
        expect([...merged].map(action=>action.name)).toEqual(['a','b']);
        expect(merged.getAction('b').run('x', {})).toBe('x');
    })

    it("忽略 undefined 注册表 ( ignores undefined registries )", ()=>{
        const registry = new ActionRegistry();
        registry.register('a', (str:string)=>str);

        const merged = ActionRegistry.getMerged(undefined, registry, undefined);
        expect([...merged]).toHaveLength(1);
        expect(merged.includes('a')).toBe(true);
    })

    it("不传参数时返回空注册表 ( returns an empty registry when called without arguments )", ()=>{
        expect([...ActionRegistry.getMerged()]).toEqual([]);
    })

    it("存在同名 action 时抛错 ( throws when merged registries contain duplicate action names )", ()=>{
        const first = new ActionRegistry();
        first.register('dup', (str:string)=>str);
        const second = new ActionRegistry();
        second.register('dup', (str:string)=>str);

        expectThrowsCode(()=>ActionRegistry.getMerged(first, second), "ACTION_DUPLICATE");
    })

    it("合并结果与原注册表相互独立 ( the merged registry is independent of the original registries )", ()=>{
        const first = new ActionRegistry();
        first.register('a', (str:string)=>str);

        const merged = ActionRegistry.getMerged(first);
        merged.register('b', (str:string)=>str);
        expect(first.includes('b')).toBe(false);
    })
})
