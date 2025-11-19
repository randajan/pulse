import { solid, solids, virtual, virtuals } from "@randajan/props";
import { blankFn, vault } from "./const";
import { valid, validRange } from "./tools";

/**
 * Metadata object passed to every pulse callback.
 * @typedef {Object} PulseMeta
 * @property {Date}   started   Timestamp when this pulse began.
 * @property {string[]} warnings  Snapshot of all warnings collected so far.
 * @property {number} runtime   Milliseconds elapsed since `started`.
 * @property {(warning: string|Error) => void} warn  Push a warning into the internal list.
 */
const createMetaData = (id, getNow) => {
    const p = {};
    const w = [];
    solid(p, "id", id);
    solid(p, "started", getNow());
    virtual(p, "warnings", _ => [...w]);
    virtual(p, "runtime", _ => (p.ended ? p.ended : getNow()) - p.started);
    solid(p, "warn", warning => w.push(warning), false);
    return p;
}

/**
 * Configuration object for {@link Pulse}.
 * @typedef {Object} PulseOptions
 * @property {(meta: PulseMeta) => (void|Promise<void>)} onPulse   **required** – user callback invoked on every pulse.
 * @property {number}  interval  **required** – period length in ms (50 – 2 147 483 647).
 * @property {number} [offset=0]   Shift in ms applied to the start of each interval (0 ≤ offset < interval).
 * @property {() => number} [getNow=() => Date.now()]  Custom time source, useful for tests or time travel.
 * @property {(err: unknown) => void} [onError=blankFn]  Error handler for exceptions or rejected `onPulse` promises.
 * @property {boolean} [autoStart=false]  If true, the loop starts immediately after construction.
 */

/**
 * Factory helper – simply calls `new Pulse(options)`.
 * @param {PulseOptions} [options={}]  See {@link PulseOptions}.
 * @returns {Pulse}
 */
export const createPulse = (options = {}) => new Pulse(options);

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
            let errA, errB;

            try {
                const result = await onPulse(this, md);
                if (!noMeta) { solid(md, "result", result); }
            }
            catch (err) {
                errA = err;
                if (!noMeta) { solid(md, "error", errA); }
            }

            if (noMeta) {
                onError(this, errA, md);
            } else {
                solid(md, "ended", getNow());
                onError(this, md);
            }

            try { await afterPulse(this, md); }
            catch(err) { errB = err; }

            _p.last = md;
            delete _p.metaData;

            if (errB) {
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

        vault.set(this, _p);

        process.on("exit", _ => this.stop());
        if (autoStart) { this.start(); }
    }

    /**
     * Start the pulse loop (no-op if already running).
     * @returns {boolean} `true` if it started now, `false` if it was already running.
     */
    start(reset=false) {
        const { state } = this;
        if (state) { return false; }
        const _p = vault.get(this);
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
        const _p = vault.get(this);
        clearTimeout(_p.timeoutId);
        _p.state = false;
        if (reset) { _p.reset(); }
        _p.onStop(this);
        return true;
    }

    reset() {
        vault.get(this).reset();
        return true;
    }

    restart(reset=false) {
        this.stop(reset);
        return this.start(reset);
    }


}