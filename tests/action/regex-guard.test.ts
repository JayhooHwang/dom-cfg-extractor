import { describe, it, expect } from 'vitest'
import { RegexGuard } from '../../src/action/regex-guard.ts'
import { expectThrowsCode } from '../helpers/error.ts'

describe("RegexGuard 默认上限 ( default input limit )", ()=>{
    it("默认上限为 8192 ( defaults to 8192 )", ()=>{
        expect(new RegexGuard().inputLimit).toBe(8192);
    })

    it("恰好等于上限时放行 ( accepts input of exactly the limit )", ()=>{
        const guard = new RegexGuard();
        expect(()=>guard.assertSafe('a'.repeat(8192), /a/)).not.toThrow();
    })

    it("超过上限时抛错 ( throws when input exceeds the limit )", ()=>{
        const guard = new RegexGuard();
        expectThrowsCode(()=>guard.assertSafe('a'.repeat(8193), /a/), "REGEXP_INPUT_TOO_LONG");
    })

    it("错误信息包含实际长度与上限 ( error message includes actual length and limit )", ()=>{
        const guard = new RegexGuard({ inputLimit: 10 });
        const error = expectThrowsCode(()=>guard.assertSafe('a'.repeat(11), /a/), "REGEXP_INPUT_TOO_LONG");
        expect(error.message).toContain("11");
        expect(error.message).toContain("10");
    })
})

describe("RegexGuard 自定义上限 ( custom input limit )", ()=>{
    it("按配置的上限生效 ( uses the configured limit )", ()=>{
        const guard = new RegexGuard({ inputLimit: 10 });
        expect(()=>guard.assertSafe('a'.repeat(10), /a/)).not.toThrow();
        expectThrowsCode(()=>guard.assertSafe('a'.repeat(11), /a/), "REGEXP_INPUT_TOO_LONG");
    })

    it("Infinity 表示关闭上限 ( Infinity disables the limit )", ()=>{
        const guard = new RegexGuard({ inputLimit: Infinity });
        expect(()=>guard.assertSafe('a'.repeat(100000), /a/)).not.toThrow();
    })
})

describe("RegexGuard 配置校验 ( options validation )", ()=>{
    it("上限为 0、负数、小数或 NaN 时抛错 ( throws for zero, negative, fractional or NaN limit )", ()=>{
        for(const inputLimit of [0, -1, 1.5, NaN]){
            expectThrowsCode(()=>new RegexGuard({ inputLimit }), "INVALID_REGEX_GUARD_OPTIONS");
        }
    })
})
