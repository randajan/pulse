/** One of the failure categories reported by Pulse. */
export type PulseErrorType = "start" | "stop" | "schedule" | "execute" | "runtime";
export type PulseErrorKind = PulseErrorType | "unknown";
export type PulseWarning = string | Error;

/** Called when Pulse reports an error. Async handlers are not awaited by the scheduler. */
export type PulseErrorHandler = (pulse: Pulse, type: PulseErrorKind, error: unknown) => void | Promise<void>;

/** Scheduler configuration. */
export interface PulseOptions<Result = unknown> {
    /** Callback executed for each cycle; receives the cycle itself, not Pulse or session. */
    onPulse: (cycle: PulseCycle<Result>) => Result | PromiseLike<Result>;
    /** Align executions to clock boundaries. */
    align: boolean;
    /** Interval in milliseconds, from 10 to 2_147_483_647. */
    interval: number;
    /** Time shift. Constraints depend on align and runOnStart. */
    offset?: number;
    /** Schedule the first execution immediately. Default: false. */
    runOnStart?: boolean;
    /** Custom finite, nonnegative clock in milliseconds. Default: Date.now. */
    getNow?: () => number;
    /** Start automatically during construction. Default: false. */
    autoStart?: boolean;
    /** Called before scheduling a newly started session. Can prevent start by throwing. */
    onStart?: (session: PulseSession<Result>) => void;
    /** Called after a session has been stopped, with the stop reason when present. */
    onStop?: (session: PulseSession<Result>, reason?: unknown) => void;
    /** Error notification; does not block further cycles. */
    onError?: PulseErrorHandler;
}

/** Normalized options used internally by PulseSession and PulseCycle. */
interface ResolvedPulseOptions<Result> {
    readonly onPulse: (cycle: PulseCycle<Result>) => Result | PromiseLike<Result>;
    readonly align: boolean;
    readonly interval: number;
    readonly offset: number;
    readonly runOnStart: boolean;
    readonly getNow: () => number;
    readonly autoStart: boolean;
    readonly onStart: (session: PulseSession<Result>) => void;
    readonly onStop: (session: PulseSession<Result>, reason?: unknown) => void;
    readonly onError?: PulseErrorHandler;
}

/** Snapshot returned by Pulse.toJSON(). */
export interface PulseSnapshot<Result = unknown> {
    interval: number;
    offset: number;
    align: boolean;
    state: boolean;
    current: PulseCycle<Result> | null | undefined;
    last: PulseCycle<Result> | undefined;
    countdown: number | undefined;
    potential: number;
    nextAt: number | undefined;
    nextId: number;
}

/** Snapshot returned by PulseSession.toJSON(). */
export interface PulseSessionSnapshot<Result = unknown> extends PulseSnapshot<Result> {}

/** Snapshot returned by PulseCycle.toJSON(). */
export interface PulseCycleSnapshot<Result = unknown> {
    id: number | undefined;
    ok: boolean;
    done: boolean | undefined;
    started: number | undefined;
    ended: number | undefined;
    runtime: number;
    lateBy: number;
    warnings: PulseWarning[];
    result: Result | undefined;
    error: unknown;
}

/** Public API for a periodic scheduler. */
export class Pulse<Result = unknown> {
    constructor(options: PulseOptions<Result>);
    readonly session: PulseSession<Result> | null;
    readonly state: boolean;
    readonly current: PulseCycle<Result> | null | undefined;
    readonly last: PulseCycle<Result> | undefined;
    readonly countdown: number | undefined;
    readonly potential: number;
    readonly nextAt: number | undefined;
    readonly nextId: number;
    readonly interval: number;
    readonly offset: number;
    readonly align: boolean;
    calculatePotential(isInit?: boolean): number;
    start(): boolean;
    stop(reason?: unknown): boolean;
    restart(): boolean;
    toJSON(): PulseSnapshot<Result>;
}

/** One start/stop lifetime, including its timer and cancellation signal. */
export class PulseSession<Result = unknown> {
    constructor(pulse: Pulse<Result>, opt: ResolvedPulseOptions<Result>, consumeNextId: () => number);
    readonly pulse: Pulse<Result>;
    readonly signal: AbortSignal;
    readonly interval: number;
    readonly offset: number;
    readonly align: boolean;
    readonly state: boolean;
    readonly current: PulseCycle<Result> | null;
    readonly last: PulseCycle<Result> | undefined;
    readonly countdown: number | undefined;
    readonly potential: number;
    readonly nextAt: number | undefined;
    readonly nextId: number;
    calculateCountdown(): number | undefined;
    start(): boolean;
    stop(reason?: unknown): boolean;
    toJSON(): PulseSessionSnapshot<Result>;
}

/** One execution and the metadata made available to onPulse. */
export class PulseCycle<Result = unknown> {
    constructor(pulse: Pulse<Result>, session: PulseSession<Result>, opt: ResolvedPulseOptions<Result>);
    readonly pulse: Pulse<Result>;
    readonly session: PulseSession<Result>;
    readonly signal: AbortSignal;
    readonly id: number | undefined;
    readonly ok: boolean;
    readonly done: boolean | undefined;
    readonly started: number | undefined;
    readonly ended: number | undefined;
    readonly runtime: number;
    readonly lateBy: number;
    readonly warnings: PulseWarning[];
    readonly result: Result | undefined;
    readonly error: unknown;
    warn(warning: PulseWarning): number;
    /** Internal execution entry point. */
    _execute(id: number): Promise<boolean>;
    toJSON(): PulseCycleSnapshot<Result>;
}

/** Base for errors produced by Pulse. The original error is available as `cause`. */
export class PulseError extends Error {
    constructor(type: PulseErrorType | (string & {}), name: string, cause?: unknown);
    readonly pulseErrType: string;
    readonly cause: unknown;
}
export class PulseStartError extends PulseError {
    constructor(cause?: unknown);
    readonly pulseErrType: "start";
}
export class PulseStopError extends PulseError {
    constructor(cause?: unknown);
    readonly pulseErrType: "stop";
}
export class PulseScheduleError extends PulseError {
    constructor(cause?: unknown);
    readonly pulseErrType: "schedule";
}
export class PulseExecuteError extends PulseError {
    constructor(cause?: unknown);
    readonly pulseErrType: "execute";
}
export class PulseRuntimeError extends PulseError {
    constructor(cause?: unknown);
    readonly pulseErrType: "runtime";
}

/** Report an error; the promise settles after the handler completes. */
export function handleError(error: unknown, onError?: PulseErrorHandler): Promise<void>;

/** Create a Pulse using the same options as the Pulse constructor. */
export function createPulse<Result = unknown>(options: PulseOptions<Result>): Pulse<Result>;
export default createPulse;
