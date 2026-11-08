import { formatOptions } from "../options";
import { PulseSession } from "./PulseSession";
import { handleError } from "../errors";

/** Public API for a periodic scheduler. */
export class Pulse {
    #opt;
    #session = null;
    #nextId = 0;
    #last;

    /** @param {PulseOptions} [options={}] */
    constructor(options = {}) {
        this.#opt = formatOptions(options);
        if (this.#opt.autoStart) { this.start(); }
    }

    get session() { return this.#session; }
    get state() { return this.#session?.state ?? false; }
    get current() { return this.#session?.current; }
    get last() { return this.#session?.last ?? this.#last; }
    get countdown() { return this.#session?.countdown; }
    get potential() { return this.countdown ?? this.calculatePotential(); }
    get nextAt() { return this.state ? this.potential + this.#opt.getNow() : undefined; }
    get nextId() { return this.#nextId; }

    get interval() { return this.#opt.interval; }
    get offset() { return this.#opt.offset; }
    get align() { return this.#opt.align; }

    calculatePotential(isInit = true) {
        const { align, runOnStart, interval, offset, getNow } = this.#opt;
        if (isInit && runOnStart) { return 0; }
        if (!align) { return isInit ? interval + offset : interval; }
        const now = getNow() - offset;
        const rest = ((now % interval) + interval) % interval;
        return rest === 0 ? interval : interval - rest;
    }

    #handleError(error) { return handleError(error, this.#opt.onError); }

    #consumeNextId = () => this.#nextId++;

    /** Start a new session. Returns false if already running. */
    start() {
        if (this.state) { return false; }

        // These callbacks keep IDs and the public `last` on Pulse itself.
        const session = new PulseSession(this, this.#opt, this.#consumeNextId);

        // Attach before calling onStart: callbacks can safely stop/restart us.
        this.#session = session;
        try { return session.start(); }
        catch (err) {
            if (this.#session === session) { this.#session = null; }
            this.#handleError(err);
            throw err;
        }
    }

    /** Stop the current session, without cancelling a newer one. */
    stop(reason) {
        const session = this.#session;
        if (!session?.state) { return false; }

        // Detach first so callbacks cannot accidentally affect this session.
        this.#session = null;
        this.#last = session.last ?? this.#last;
        return session.stop(reason);
    }

    restart() {
        this.stop();
        return this.start();
    }

    toJSON() {
        const { interval, offset, align, state, current, last, countdown, potential, nextAt, nextId } = this;
        return { interval, offset, align, state, current, last, countdown, potential, nextAt, nextId };
    }
}
