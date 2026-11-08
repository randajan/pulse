
import { valid, validateGetNow, validRange } from "./tools";

const blankFn = ()=>{};

export const formatOptions = (options) => {
    const o = {};

    if (options.noMeta != null) { throw new Error("options.noMeta is obsolete"); }
    if (options.maxRuns != null) { throw new Error("options.maxRuns is obsolete"); }
    if (options.afterPulse != null) { throw new Error("options.afterPulse is obsolete"); }

    o.getNow = validateGetNow(options);

    o.align = valid("boolean", options.align, true, "options.align");

    const minInterval = 10;
    const maxInterval = 2_147_483_647;
    o.interval = validRange(minInterval, maxInterval, options.interval, true, "options.interval");

    o.runOnStart = valid("boolean", options.runOnStart, false, "options.runOnStart") || false;

    const offsetMsg = `options.offset (align:${o.align})`;

    if (o.align) {
        o.offset = (validRange(0, o.interval, options.offset, false, offsetMsg) ?? 0);
    } else if (!o.runOnStart) {
        o.offset = (validRange(-o.interval, (maxInterval - o.interval), options.offset, false, offsetMsg) ?? 0);
    } else if (options.offset != null) {
        throw new Error(`${offsetMsg} can't be set if runOnStart:true`);
    } else {
        o.offset = -o.interval;
    }

    o.onPulse = valid("function", options.onPulse, true, "options.onPulse");
    o.onStart = valid("function", options.onStart, false, "options.onStart") || blankFn;
    o.onStop = valid("function", options.onStop, false, "options.onStop") || blankFn;
    o.onError = valid("function", options.onError, false, "options.onError");
    o.autoStart = valid("boolean", options.autoStart, false, "options.autoStart") || false;

    return Object.freeze(o);
}
