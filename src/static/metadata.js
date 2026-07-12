import { solid, virtual } from "@randajan/props";


/**
 * Metadata object passed to every pulse callback.
 * @typedef {Object} PulseMeta
 * @property {number} id Sequential pulse id.
 * @property {number} started Timestamp when this pulse began.
 * @property {number} [ended] Timestamp when this pulse finished.
 * @property {number} runtime Milliseconds elapsed since `started`.
 * @property {number} lateBy Milliseconds over the configured interval.
 * @property {string[]|Error[]} warnings Snapshot of all warnings collected so far.
 * @property {*} [result] Value returned by `onPulse`.
 * @property {*} [error] Error thrown or rejected by `onPulse`.
 * @property {(warning: string|Error) => void} warn Push a warning into the internal list.
 */
export const createMetaData = (_p, id) => {
    const md = {};
    const w = [];
    solid(md, "id", id);
    solid(md, "started", _p.opt.getNow());
    virtual(md, "warnings", _ => [...w]);
    virtual(md, "runtime", _ => (md.ended ? md.ended : _p.opt.getNow()) - md.started);
    virtual(md, "lateBy", _=>Math.max(0, md.runtime-_p.opt.interval));
    solid(md, "warn", warning => w.push(warning), false);
    return md;
}

