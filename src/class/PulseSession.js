import { handleError, PulseExecuteError, PulseRuntimeError, PulseScheduleError, PulseStartError, PulseStopError } from "../errors";
import { PulseCycle } from "./PulseCycle";

/** One start/stop lifetime. Owns timing, cancellation and its cycles. */
export class PulseSession {

    #pulse = null;
    #opt = null;
    #ctrl = new AbortController();

    #state = false;
    #timeoutId;
    #fireAt;

    #current = null;
    #last;

    #consumeNextId;

    constructor(pulse, opt, consumeNextId) {
        this.#pulse = pulse;
        this.#opt = opt;
        this.#consumeNextId = consumeNextId;
    }

    get pulse() { return this.#pulse; }
    get signal() { return this.#ctrl.signal; }

    get interval() { return this.#opt.interval; }
    get offset() { return this.#opt.offset; }
    get align() { return this.#opt.align; }

    get state() { return this.#state && !this.#ctrl.signal.aborted; }
    get current() { return this.#current; }
    get last() { return this.#last; }
    get countdown() { return this.calculateCountdown(); }
    get potential() { return this.#pulse.potential }
    get nextAt() { return this.state ? this.#pulse.potential + this.#opt.getNow() : undefined; }
    get nextId() { return this.#pulse.nextId; }

    calculateCountdown() {
        if (!this.state || this.#fireAt == null) { return; }
        return Math.max(0, this.#fireAt - this.#opt.getNow());
    }

    start() {
        if (this.#state) { return false; }
        this.#state = true;

        try {
            this.#opt.onStart(this);
        } catch (err) {
            // A failed start should not leave a live session behind.
            this.#state = false;
            this.#ctrl.abort(err);
            throw new PulseStartError(err);
        }

        return this.#schedule(true);
    }

    stop(reason) {
        if (!this.#state) { return false; }
        // A consumer stopping pulse.session should also detach it from Pulse.
        if (this.#pulse.session === this) { return this.#pulse.stop(reason); }

        this.#state = false;
        clearTimeout(this.#timeoutId);
        this.#fireAt = undefined;
        this.#current = null;
        this.#ctrl.abort(reason);

        if (reason != null) { this.#handleError(reason); }

        try { this.#opt.onStop(this, reason); }
        catch(err) { this.#handleError(new PulseStopError(err)); }

        return true;
    }

    #handleError(error) { return handleError(this.pulse, error, this.#opt.onError); }

    // Even a temporarily broken clock/configuration must not permanently stall scheduling.
    #schedule(isInit) {
        if (!this.state || this.#current != null) { return false; }

        try {
            const fireIn = this.#pulse.calculatePotential(isInit);
            this.#fireAt = this.#opt.getNow() + fireIn;
            this.#timeoutId = setTimeout(this.#tick, fireIn);
            this.#timeoutId.unref?.();
            return true;
        } catch (err) {
            this.stop(new PulseScheduleError(err));
            return false;
        }

    }

    #tick = async () => {
        if (!this.state || this.#current != null) { return; }

        let cycle;

        try {
            this.#current = cycle = new PulseCycle(this.#pulse, this, this.#opt);
            await cycle._execute(this.#consumeNextId());
            if (!cycle.ok) { this.#handleError(new PulseRuntimeError(cycle.error)); }
        } catch (err) {
            this.stop(new PulseExecuteError(err));
        }

        if (!this.state) { return; }

        if (cycle && this.#current === cycle) {
            this.#last = cycle;
            this.#current = null;
        }
        this.#schedule(false);
    }

    toJSON() {
        const { interval, offset, align, state, current, last, countdown, potential, nextAt, nextId } = this;
        return { interval, offset, align, state, current, last, countdown, potential, nextAt, nextId };
    }

}
