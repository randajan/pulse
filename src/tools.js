

export const is = (type, any)=>typeof any === type;

export const valid = (type, any, req=false, msg="argument")=>{
    if (any == null) {
        if (!req) { return; }
        throw new Error(`[pulse] ${msg} require typeof '${type}'`);
    }
    if (is(type, any)) { return any; }
    throw new Error(`[pulse] ${msg} is not typeof '${type}'`);
}

export const validRange = (min, max, any, req=false, msg="argument")=>{
    const num = valid("number", any, req, msg);
    if (num == null) { return; }
    if (min != null && num < min) { throw new Error(`[pulse] ${msg} must be >= ${min}`); }
    if (max != null && num > max) { throw new Error(`[pulse] ${msg} must be <= ${max}`); }
    return num;
}

export const validRangeFinite = (min, any, req=false, msg="argument")=>{
    const num = validRange(min, null, any, req, msg);
    if (num == null) { return; }
    if (!Number.isFinite(num)) { throw new Error(`[pulse] ${msg} must be finite`);  }
    return num;
}

export const validateGetNow = (options)=>{
    const custom = valid("function", options.getNow, false, "options.getNow");
    if (!custom) { return _=>Date.now(); }
    const safe = _=>validRangeFinite(0, custom(), true, "options.getNow result");
    safe(); //test
    return safe;
}