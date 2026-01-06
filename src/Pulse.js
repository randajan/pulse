import { solid, solids, virtuals } from "@randajan/props";
import { blankFn, _pulses } from "./const";
import { valid, validRange } from "./tools";
import { createMetaData } from "./metadata";

/**
 * Periodic scheduler that aligns each callback to exact multiples
 * of the given interval (optionally shifted by `offset`).
 */
export class Pulse {

    /**
     * Create a new Pulse instance.
     * @param {PulseOptions} [options={}]  See {@link PulseOptions}.
     */
    constructor(options = {}) {
        const _p = {
            state: false,
            nextId:0
        }

        const getNow = valid("function", options.getNow, false, "options.getNow") || (_ => Date.now());

        const interval = validRange(10, 2_147_483_647, options.interval, true, "options.interval");
        const offset = (validRange(0, interval, options.offset, false, "options.offset") || 0);

        const onPulse = valid("function", options.onPulse, true, "options.onPulse");
        _p.onStart = valid("function", options.onStart, false, "options.onStart") || blankFn;
        _p.onStop = valid("function", options.onStop, false, "options.onStop") || blankFn;
        
        const onError = valid("function", options.onError, false, "options.onError") || blankFn;
        
        const afterPulse = valid("function", options.afterPulse, false, "options.afterPulse") || blankFn;
        const autoStart = valid("boolean", options.autoStart, false, "options.autoStart") || false;
        const noMeta = valid("boolean", options.noMeta, false, "option.noMeta") || false;

        _p.reset = _=>{
            _p.nextId = 0;
        }

        _p.plan = _ => {
            if (!_p.state || _p.metaData != null) { return; }
            const now = getNow();
            const runIn = (interval - now % interval) + offset;
            _p.timeoutId = setTimeout(_p.run, runIn);
        }

        _p.run = async _ => {
            if (!_p.state || _p.metaData) { return; }

            const id = _p.nextId++;
            const md = _p.metaData = noMeta ? id : createMetaData(id, getNow);
            let errA, errB, result;

            try {
                result = await onPulse(this, md);
                if (!noMeta) { solid(md, "result", result); }
            }
            catch (err) {
                errA = err;
                if (!noMeta) { solid(md, "error", errA); }
            }

            if (!noMeta) { solid(md, "ended", getNow()); }

            if (errA != null) {
                if (noMeta) { onError(this, errA, md); }
                else { onError(this, md); }
            }

            try { await afterPulse(this, md); }
            catch(err) { errB = err; }

            _p.last = noMeta ? result : md;
            delete _p.metaData;

            if (errB != null) {
                _p.state = false;
                throw errB;
            }
            
            _p.plan();
        }

        virtuals(this, {
            state:_=>_p.state,
            last:_=>_p.last
        });

        solids(this, {
            interval,
            offset
        });

        _pulses.set(this, _p);

        if (autoStart) { this.start(); }
    }

    /**
     * Start the pulse loop (no-op if already running).
     * @returns {boolean} `true` if it started now, `false` if it was already running.
     */
    start(reset=false) {
        const { state } = this;
        if (state) { return false; }
        const _p = _pulses.get(this);
        _p.onStart(this);
        if (reset) { _p.reset(); }
        _p.state = true;
        _p.plan();
        return true;
    }

    /**
     * Stop the pulse loop (no-op if already stopped).
     * @returns {boolean} `true` if it stopped now, `false` if it was already stopped.
     */
    stop(reset=false) {
        const { state } = this;
        if (!state) { return false; }
        const _p = _pulses.get(this);
        clearTimeout(_p.timeoutId);
        _p.state = false;
        if (reset) { _p.reset(); }
        _p.onStop(this);
        return true;
    }

    reset() {
        _pulses.get(this).reset();
        return true;
    }

    restart(reset=false) {
        this.stop(reset);
        return this.start(reset);
    }


}