import { blankFn } from "../const";
import { valid, validRange } from "../tools";



/**
 * Configuration object for {@link Pulse}.
 * @typedef {Object} PulseOptions
 * @property {(pulse: import("../Pulse").Pulse, meta: import("./metadata").PulseMeta|number) => (*|Promise<*>)} onPulse **required** – user callback invoked on every pulse.
 * @property {boolean} align **required** – align to wall-clock interval edges when true, run relatively when false.
 * @property {number} interval **required** – period length in ms (10 – 2 147 483 647).
 * @property {number} [offset=0] Timing offset. Range and meaning depend on `align` and `runOnStart`.
 * @property {boolean} [runOnStart=false] Schedule the first pulse immediately on start.
 * @property {number} [maxRuns=0] Maximum number of pulses before automatic stop. `0` means unlimited.
 * @property {() => number} [getNow=() => Date.now()] Custom time source, useful for tests or time travel.
 * @property {boolean} [autoStart=false] If true, the loop starts immediately after construction.
 * @property {boolean} [noMeta=false] If true, callbacks receive the numeric pulse id instead of `PulseMeta`.
 * @property {(pulse: import("../Pulse").Pulse) => void} [onStart=blankFn] Called right before the pulse loop starts.
 * @property {(pulse: import("../Pulse").Pulse) => void} [onStop=blankFn] Called right after the pulse loop stops.
 * @property {Function} [onError=blankFn] Error handler for exceptions or rejected `onPulse` promises.
 * @property {(pulse: import("../Pulse").Pulse, meta: import("./metadata").PulseMeta|number) => (void|Promise<void>)} [afterPulse=blankFn] Callback executed after every pulse.
 */
export const formatOptions = (options) => {
    const o = {};

    o.getNow = valid("function", options.getNow, false, "options.getNow") || (_ => Date.now());

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

    o.maxRuns = validRange(0, Infinity, options.maxRuns, false, "options.maxRuns") ?? 0;

    o.onPulse = valid("function", options.onPulse, true, "options.onPulse");
    o.onStart = valid("function", options.onStart, false, "options.onStart") || blankFn;
    o.onStop = valid("function", options.onStop, false, "options.onStop") || blankFn;
    o.onError = valid("function", options.onError, false, "options.onError") || blankFn;

    o.afterPulse = valid("function", options.afterPulse, false, "options.afterPulse") || blankFn;
    o.autoStart = valid("boolean", options.autoStart, false, "options.autoStart") || false;
    o.noMeta = valid("boolean", options.noMeta, false, "option.noMeta") || false;

    return Object.freeze(o);
}
