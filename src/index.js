import { Pulse } from "./class/Pulse";
import { PulseCycle } from "./class/PulseCycle";
import { PulseSession } from "./class/PulseSession";
export * from "./errors";

export {
    Pulse,
    PulseSession,
    PulseCycle
}

export const createPulse = (options = {}) => new Pulse(options);


export default createPulse;
