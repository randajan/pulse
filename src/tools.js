

export const is = (type, any)=>typeof any === type;

export const valid = (type, any, req=false, msg="argument")=>{
    if (any == null) {
        if (!req) { return; }
        throw new Error(`${msg} require typeof '${type}'`);
    }
    if (is(type, any)) { return any; }
    throw new Error(`${msg} is not typeof '${type}'`);
}

export const validRange = (min, max, any, req=false, msg="argument")=>{
    const num = valid("number", any, req, msg);
    if (num == null) { return; }
    if (num < min) { throw new Error(`${msg} must be greater than ${min}`); }
    if (num > max) { throw new Error(`${msg} must be less than ${max}`); }
    return num;
}