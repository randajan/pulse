import { solid, solids, virtuals } from "@randajan/props";
import { _pulses } from "./const";
import { formatOptions } from "./static/options";
import { PulsePrivate } from "./static/PulsePrivate";

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
        const _p = new PulsePrivate(this, options);

        const { getNow, align, interval, offset, autoStart } = _p.opt;

        virtuals(this, {
            state:_=>_p.state,
            last:_=>_p.last,
            countdown:_=>_p.getCountdown(),
            potential:_=>_p.getCountdown() ?? _p.getPotential(),
            nextAt:_=>_p.state ? this.potential + getNow() : undefined
        });

        solids(this, {
            interval,
            offset,
            align
        });

        _pulses.set(this, _p);

        if (autoStart) { this.start(); }
    }

    /**
     * Start the pulse loop (no-op if already running).
     * @returns {boolean} `true` if it started now, `false` if it was already running.
     */
    start(reset=false) {
        return _pulses.get(this).start(reset);
    }

    /**
     * Stop the pulse loop (no-op if already stopped).
     * @returns {boolean} `true` if it stopped now, `false` if it was already stopped.
     */
    stop(reset=false) {
        return _pulses.get(this).stop(reset);
    }

    restart(reset=false) {
        return _pulses.get(this).restart(reset);
    }

    reset() {
        return _pulses.get(this).reset();
    }

}
