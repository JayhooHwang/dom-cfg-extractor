import { expect } from "vitest";
import { DomExtractorError, type ErrorCode } from "../../src/error.ts";

function assertErrorCode(error:unknown, code:ErrorCode):DomExtractorError{
    expect(error).toBeInstanceOf(DomExtractorError);
    const domError = error as DomExtractorError;
    expect(domError.code).toBe(code);
    return domError;
}

export function expectThrowsCode(fn:()=>unknown, code:ErrorCode):DomExtractorError{
    let error:unknown;
    try{
        fn();
    }catch(ex){
        error = ex;
    }
    return assertErrorCode(error, code);
}

export async function expectRejectsCode(promise:Promise<unknown>, code:ErrorCode):Promise<DomExtractorError>{
    let error:unknown;
    try{
        await promise;
    }catch(ex){
        error = ex;
    }
    return assertErrorCode(error, code);
}