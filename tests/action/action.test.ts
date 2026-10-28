import { describe, it, expect } from 'vitest'
import { Action } from '../../src/action/action.ts'
import { expectThrowsCode } from '../helpers/error.ts'

describe("Action 构造函数", ()=>{

    it("name 不是字符串时抛错", ()=>{
        // @ts-expect-error 模拟纯 JS 下错误传参
        expectThrowsCode(()=>new Action(123, 'single', (str:string)=>str), "INVALID_ACTION_NAME");
    })

    it("applyFor 不是 single/group 时抛错", ()=>{
        // @ts-expect-error 模拟纯 JS 下错误传参
        expectThrowsCode(()=>new Action('bad', 'both', (str:string)=>str), "INVALID_APPLY_FOR");
    })

    it("handle 不是函数时抛错", ()=>{
        // @ts-expect-error 模拟纯 JS 下错误传参
        expectThrowsCode(()=>new Action('bad', 'single', 'not a function'), "INVALID_ACTION_HANDLE");
    })

    it("handle 没有参数时抛错", ()=>{
        expectThrowsCode(()=>new Action('bad', 'single', ()=>''), "INVALID_ACTION_HANDLE");
    })
})

describe("Action.run", ()=>{
    it("single 处理字符串", ()=>{
        const action = new Action('upper', 'single', (str:string)=>str.toUpperCase());
        expect(action.run('abc', {})).toBe('ABC');
    })

    it("group 处理数组", ()=>{
        const action = new Action('reverse', 'group', (arr:string[])=>[...arr].reverse());
        expect(action.run(['a','b','c'], {})).toEqual(['c','b','a']);
    })

    it("把额外参数透传给 handle", ()=>{
        const single = new Action('replace', 'single', (str:string, from:string, to:string)=>str.replaceAll(from, to));
        const group = new Action('suffixAll', 'group', (arr:string[], suffix:string)=>arr.map(item=>item+suffix));
        expect(single.run('a-b-c', {}, '-', '+')).toBe('a+b+c');
        expect(group.run(['a','b'], {}, '!')).toEqual(['a!','b!']);
    })

    it("以 context 作为 handle 的 this", ()=>{
        const action = new Action('withContext', 'single', function(this:{prefix:string}, str:string){
            return this.prefix + str;
        });
        expect(action.run('x', {prefix:'pre-'})).toBe('pre-x');
    })

    it("single 处理数组时抛错", ()=>{
        const action = new Action('upper', 'single', (str:string)=>str.toUpperCase());
        expectThrowsCode(()=>action.run(['a','b'], {}), "ACTION_TYPE_MISMATCH");
    })

    it("group 处理字符串时抛错", ()=>{
        const action = new Action('identity', 'group', (arr:string[])=>arr);
        expectThrowsCode(()=>action.run('a,b', {}), "ACTION_TYPE_MISMATCH");
    })

    it("rawData 既不是字符串也不是数组时抛错", ()=>{
        const action = new Action('upper', 'single', (str:string)=>str.toUpperCase());
        // @ts-expect-error 模拟纯 JS 下错误传参
        expectThrowsCode(()=>action.run(123, {}), "INVALID_ACTION_DATA");
    })
    
    it("不传参时抛错", ()=>{
        const action = new Action('upper', 'single', (str:string)=>str.toUpperCase());
        // @ts-expect-error 模拟纯 JS 下不传参调用
        expectThrowsCode(()=>action.run(), "INVALID_ACTION_DATA");
    })

    it("action 使用了不存在的上下文", ()=>{
        let seen: unknown = "未读取上下文";
        const action = new Action('withContext', 'single', function(this:Record<string, unknown>, str:string){
            seen = this.prefix;
            return str;
        });

        // Action 层不校验 context，缺失的键以 undefined 传入，由 handle 自行兜底
        expect(action.run('x', {})).toBe('x');
        expect(seen).toBeUndefined();
    })
    
})
