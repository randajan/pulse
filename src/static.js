import { _pulses } from "./const";
import { Pulse } from "./Pulse.js";


/**
 * Factory helper – simply calls `new Pulse(options)`.
 * @param {PulseOptions} [options={}]  See {@link PulseOptions}.
 * @returns {Pulse}
 */
export const createPulse = (options = {}) => new Pulse(options);

/**
 * Process exit helper – stops all pending pulses.
 */

export const stopAllPulses = ()=>{
    for (const [pulse, _pulse] of _pulses.entries()) {
        pulse.stop();
    }
}
