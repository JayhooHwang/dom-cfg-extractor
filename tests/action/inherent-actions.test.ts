import { describe, it, expect } from 'vitest'
import { inherentActions } from '../../src/action/inherent-actions.ts'
import { expectThrowsCode } from '../helpers/error.ts';

function run(name:string, data:string, ...params:string[]){
    return inherentActions.getAction(name).run(data, {}, ...params);
}

function runGroup(name:string, data:string[], ...params:string[]){
    return inherentActions.getAction(name).run(data, {}, ...params);
}

describe("split", ()=>{
    it("以 group 模式注册", ()=>{
        expect(inherentActions.getAction('split').applyFor).toBe('group');
    })

    it("按分隔符拆分第一个元素", ()=>{
        expect(runGroup('split', ['a,b,c'], ',')).toEqual(['a','b','c']);
    })

    it("数据为空时按原样返回", ()=>{
        expect(runGroup('split', [], ',')).toEqual([]);
    })

    it("缺少或传入空分隔符时抛错", ()=>{
        expectThrowsCode(()=>runGroup('split', ['a,b']), "ACTION_PARAMS_REQUIRED");
        expectThrowsCode(()=>runGroup('split', ['a,b'], ''), "ACTION_PARAMS_REQUIRED");
    })
    
    it("传入的数组多于 1 个元素时，报错", ()=>{
        expectThrowsCode(()=>runGroup('split', ['a b', 'ignored'], ' '), "ACTION_TYPE_MISMATCH");
    })
})

describe("replace", ()=>{
    it("以 single 模式注册", ()=>{
        expect(inherentActions.getAction('replace').applyFor).toBe('single');
    })

    it("替换所有匹配内容", ()=>{
        expect(run('replace', 'a-b-c', '-', '+')).toBe('a+b+c');
    })

    it("from 按正则表达式解释", ()=>{
        expect(run('replace', 'a1b2c3', '\\d', '$')).toBe('a$b$c$');
    })

    it("to 为空字符串时删除匹配内容", ()=>{
        expect(run('replace', 'abc', 'b', '')).toBe('ac');
    })

    it("缺少参数或 from 为空时抛错", ()=>{
        expectThrowsCode(()=>run('replace', 'abc'), "ACTION_PARAMS_REQUIRED");
        expectThrowsCode(()=>run('replace', 'abc', 'a'), "ACTION_PARAMS_REQUIRED");
        expectThrowsCode(()=>run('replace', 'abc', '', 'x'), "ACTION_PARAMS_REQUIRED");
    })
})

describe("extract", ()=>{
    it("以 single 模式注册", ()=>{
        expect(inherentActions.getAction('extract').applyFor).toBe('single');
    })

    it("正则没有捕获组时返回匹配的结果", ()=>{
        expect(run('extract', 'abc', '\\w+')).toBe('abc');
    })

    it("正则存在捕获组时，返回第一个捕获组的内容", ()=>{
        expect(run('extract', 'name: Jay', 'name:\\s*(\\w+)')).toBe('Jay');
        expect(run('extract', 'a1b2', '(\\d)')).toBe('1');
        expect(run('extract', 'a1b2', '\\w(1)\\w(2)')).toBe('1');
    })

    it("没有匹配时返回空字符串", ()=>{
        expect(run('extract', 'abc', '(\\d)')).toBe('');
    })

    it("缺少或传入空 pattern 时抛错", ()=>{
        expectThrowsCode(()=>run('extract', 'abc'), "ACTION_PARAMS_REQUIRED");
        expectThrowsCode(()=>run('extract', 'abc', ''), "ACTION_PARAMS_REQUIRED");
    })
})

describe("remove", ()=>{
    it("以 single 模式注册", ()=>{
        expect(inherentActions.getAction('remove').applyFor).toBe('single');
    })

    it("删除所有匹配内容", ()=>{
        expect(run('remove', 'a-b-c', '-')).toBe('abc');
    })

    it("可用正则表达式匹配待删除内容", ()=>{
        expect(run('remove', 'abc123def', '\\d')).toBe('abcdef');
    })

    it("没有匹配时原样返回", ()=>{
        expect(run('remove', 'abc', 'x')).toBe('abc');
    })

    it("缺少或传入空 target 时抛错", ()=>{
        expectThrowsCode(()=>run('remove', 'abc'), "ACTION_PARAMS_REQUIRED");
        expectThrowsCode(()=>run('remove', 'abc', ''), "ACTION_PARAMS_REQUIRED");
    })
})

describe("trim", ()=>{
    it("以 single 模式注册", ()=>{
        expect(inherentActions.getAction('trim').applyFor).toBe('single');
    })

    it("去除首尾空格", ()=>{
        expect(run('trim', '  abc  ')).toBe('abc');
    })

    it("去除首尾换行和制表符", ()=>{
        expect(run('trim', '\n\t abc \t\n')).toBe('abc');
    })

    it("保留中间空白", ()=>{
        expect(run('trim', '  a b c  ')).toBe('a b c');
    })

    it("无空白时原样返回", ()=>{
        expect(run('trim', 'abc')).toBe('abc');
    })

    it("纯空白字符串返回空字符串", ()=>{
        expect(run('trim', '   ')).toBe('');
        expect(run('trim', '\t\n')).toBe('');
    })
})
