import { solid, virtual } from "@randajan/props";


/**
 * Metadata object passed to every pulse callback.
 * @typedef {Object} PulseMeta
 * @property {Date}   started   Timestamp when this pulse began.
 * @property {string[]} warnings  Snapshot of all warnings collected so far.
 * @property {number} runtime   Milliseconds elapsed since `started`.
 * @property {(warning: string|Error) => void} warn  Push a warning into the internal list.
 */
export const createMetaData = (id, getNow) => {
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