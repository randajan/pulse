import { solid, solids, virtual } from "@randajan/props";
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
const createMetaData = _ => {
    const p = {};
    const w = [];
    solid(p, "started", new Date());
    virtual(p, "warnings", _ => [...w]);
    virtual(p, "runtime", _ => Date.now() - p.started.getTime());
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
        }

        const onPulse = valid("function", options.onPulse, true, "options.onPulse");
        const interval = validRange(50, 2_147_483_647, options.interval, true, "options.interval");
        const offset = (validRange(0, interval, options.offset, false, "options.offset") || 0);
        const getNow = valid("function", options.getNow, false, "options.getNow") || (_ => Date.now());
        const onError = valid("function", options.onError, false, "options.onError") || blankFn;
        const autoStart = valid("boolean", options.autoStart, false, "options.autoStart") || false;

        _p.plan = async _ => {
            if (!_p.state || _p.metaData) { return; }
            const now = getNow();
            const runIn = (interval - now % interval) + offset;
            _p.timeoutId = setTimeout(_p.run, runIn);
        }

        _p.run = async _ => {
            if (!_p.state || _p.metaData) { return; }
            _p.metaData = createMetaData();
            try { await onPulse(_p.metaData); }
            catch (err) { onError(err); }
            delete _p.metaData;
            _p.plan();
        }

        virtual(this, "state", _ => _p.state);
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
    start() {
        const { state } = this;
        if (state) { return false; }
        const _p = vault.get(this);
        _p.state = true;
        _p.plan();
        return true;
    }

    /**
     * Stop the pulse loop (no-op if already stopped).
     * @returns {boolean} `true` if it stopped now, `false` if it was already stopped.
     */
    stop() {
        const { state } = this;
        if (!state) { return false; }
        const _p = vault.get(this);
        _p.state = false;
        clearTimeout(_p.timeoutId);
        return true;
    }


}