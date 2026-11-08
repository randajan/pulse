export class PulseError extends Error { 
    constructor(type, name, cause) {
        super(`Pulse ${type} failed`, { cause });
        this.name = name;
        this.pulseErrType = type;
    }
}

export class PulseStartError extends PulseError {
    constructor(cause) {
        super("start", "PulseStartError", cause);
    }
}

export class PulseStopError extends PulseError {
    constructor(cause) {
        super("stop", "PulseStopError", cause);
    }
}

export class PulseScheduleError extends PulseError {
    constructor(cause) {
        super("schedule", "PulseScheduleError", cause);
    }
}

export class PulseExecuteError extends PulseError {
    constructor(cause) {
        super("execute", "PulseExecuteError", cause);
    }
}

export class PulseRuntimeError extends PulseError {
    constructor(cause) {
        super("runtime", "PulseRuntimeError", cause);
    }
}

const getErrType = (err)=>{
    if (err instanceof PulseError) { return err.pulseErrType; }
    return "unknown";
}

export const handleError = async (pulse, error, onError)=>{

    const type = getErrType(error);

    if (!onError) {
        console.error(`[pulse] ${type} error:`, error);
    } else {
        try { await onError(pulse, type, error); }
        catch (e2) { console.error(`[pulse] options.onError('${type}') failed: `, e2); }
    }
}