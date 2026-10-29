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
    it("以 group 模式注册 ( is registered in group mode )", ()=>{
        expect(inherentActions.getAction('split').applyFor).toBe('group');
    })

    it("按分隔符拆分第一个元素 ( splits the first element by the separator )", ()=>{
        expect(runGroup('split', ['a,b,c'], ',')).toEqual(['a','b','c']);
    })

    it("数据为空时按原样返回 ( returns data as-is when the array is empty )", ()=>{
        expect(runGroup('split', [], ',')).toEqual([]);
    })

    it("缺少或传入空分隔符时抛错 ( throws when the separator is missing or empty )", ()=>{
        expectThrowsCode(()=>runGroup('split', ['a,b']), "ACTION_PARAMS_REQUIRED");
        expectThrowsCode(()=>runGroup('split', ['a,b'], ''), "ACTION_PARAMS_REQUIRED");
    })
    
    it("传入的数组多于 1 个元素时，报错 ( throws when the array has more than one element )", ()=>{
        expectThrowsCode(()=>runGroup('split', ['a b', 'ignored'], ' '), "ACTION_TYPE_MISMATCH");
    })
})

describe("replace", ()=>{
    it("以 single 模式注册 ( is registered in single mode )", ()=>{
        expect(inherentActions.getAction('replace').applyFor).toBe('single');
    })

    it("替换所有匹配内容 ( replaces all matches )", ()=>{
        expect(run('replace', 'a-b-c', '-', '+')).toBe('a+b+c');
    })

    it("from 按正则表达式解释 ( treats from as a regular expression )", ()=>{
        expect(run('replace', 'a1b2c3', '\\d', '$')).toBe('a$b$c$');
    })

    it("to 为空字符串时删除匹配内容 ( deletes matches when to is an empty string )", ()=>{
        expect(run('replace', 'abc', 'b', '')).toBe('ac');
    })

    it("缺少参数或 from 为空时抛错 ( throws when parameters are missing or from is empty )", ()=>{
        expectThrowsCode(()=>run('replace', 'abc'), "ACTION_PARAMS_REQUIRED");
        expectThrowsCode(()=>run('replace', 'abc', 'a'), "ACTION_PARAMS_REQUIRED");
        expectThrowsCode(()=>run('replace', 'abc', '', 'x'), "ACTION_PARAMS_REQUIRED");
    })
})

describe("extract", ()=>{
    it("以 single 模式注册 ( is registered in single mode )", ()=>{
        expect(inherentActions.getAction('extract').applyFor).toBe('single');
    })

    it("正则没有捕获组时返回匹配的结果 ( returns the match when the pattern has no capture groups )", ()=>{
        expect(run('extract', 'abc', '\\w+')).toBe('abc');
    })

    it("正则存在捕获组时，返回第一个捕获组的内容 ( returns the first capture group when the pattern has capture groups )", ()=>{
        expect(run('extract', 'name: Jay', 'name:\\s*(\\w+)')).toBe('Jay');
        expect(run('extract', 'a1b2', '(\\d)')).toBe('1');
        expect(run('extract', 'a1b2', '\\w(1)\\w(2)')).toBe('1');
    })

    it("没有匹配时返回空字符串 ( returns an empty string when there is no match )", ()=>{
        expect(run('extract', 'abc', '(\\d)')).toBe('');
    })

    it("缺少或传入空 pattern 时抛错 ( throws when the pattern is missing or empty )", ()=>{
        expectThrowsCode(()=>run('extract', 'abc'), "ACTION_PARAMS_REQUIRED");
        expectThrowsCode(()=>run('extract', 'abc', ''), "ACTION_PARAMS_REQUIRED");
    })
})

describe("remove", ()=>{
    it("以 single 模式注册 ( is registered in single mode )", ()=>{
        expect(inherentActions.getAction('remove').applyFor).toBe('single');
    })

    it("删除所有匹配内容 ( removes all matches )", ()=>{
        expect(run('remove', 'a-b-c', '-')).toBe('abc');
    })

    it("可用正则表达式匹配待删除内容 ( supports regular expressions for the content to remove )", ()=>{
        expect(run('remove', 'abc123def', '\\d')).toBe('abcdef');
    })

    it("没有匹配时原样返回 ( returns the input as-is when there is no match )", ()=>{
        expect(run('remove', 'abc', 'x')).toBe('abc');
    })

    it("缺少或传入空 target 时抛错 ( throws when target is missing or empty )", ()=>{
        expectThrowsCode(()=>run('remove', 'abc'), "ACTION_PARAMS_REQUIRED");
        expectThrowsCode(()=>run('remove', 'abc', ''), "ACTION_PARAMS_REQUIRED");
    })
})

describe("trim", ()=>{
    it("以 single 模式注册 ( is registered in single mode )", ()=>{
        expect(inherentActions.getAction('trim').applyFor).toBe('single');
    })

    it("去除首尾空格 ( trims surrounding spaces )", ()=>{
        expect(run('trim', '  abc  ')).toBe('abc');
    })

    it("去除首尾换行和制表符 ( trims surrounding newlines and tabs )", ()=>{
        expect(run('trim', '\n\t abc \t\n')).toBe('abc');
    })

    it("保留中间空白 ( keeps whitespace in the middle )", ()=>{
        expect(run('trim', '  a b c  ')).toBe('a b c');
    })

    it("无空白时原样返回 ( returns the input as-is when there is no whitespace )", ()=>{
        expect(run('trim', 'abc')).toBe('abc');
    })

    it("纯空白字符串返回空字符串 ( returns an empty string for whitespace-only input )", ()=>{
        expect(run('trim', '   ')).toBe('');
        expect(run('trim', '\t\n')).toBe('');
    })
})

describe("正则类 action 的输入长度上限 ( input limit of regex-based actions )", ()=>{
    const long = 'a'.repeat(8193);

    it("replace 输入超长时抛错 ( replace throws when input is too long )", ()=>{
        expectThrowsCode(()=>run('replace', long, 'a', 'b'), "REGEXP_INPUT_TOO_LONG");
    })

    it("extract 输入超长时抛错 ( extract throws when input is too long )", ()=>{
        expectThrowsCode(()=>run('extract', long, 'a'), "REGEXP_INPUT_TOO_LONG");
    })

    it("remove 输入超长时抛错 ( remove throws when input is too long )", ()=>{
        expectThrowsCode(()=>run('remove', long, 'a'), "REGEXP_INPUT_TOO_LONG");
    })

    it("未超过上限时正常处理 ( processes input at the limit normally )", ()=>{
        expect(run('extract', 'a'.repeat(8192), '^(a+)$')).toHaveLength(8192);
    })
})
