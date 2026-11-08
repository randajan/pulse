
/** One pulse execution and its user-visible metadata (formerly createMetaData). */
export class PulseCycle {

    #pulse = null;
    #session = null;
    #opt = null;
    #warnings = [];
    
    #ok = true;
    #id = undefined;
    #done = undefined;
    #result = undefined;
    #error = undefined;
    #started = undefined;
    #ended = undefined;

    constructor(pulse, session, opt) {
        this.#pulse = pulse;
        this.#session = session;
        this.#opt = opt;
    }

    get pulse() { return this.#pulse; }
    get session() { return this.#session; }
    get signal() { return this.#session.signal; }

    get id() { return this.#id; }

    get ok() { return this.#ok; }
    get done() { return this.#done; }

    get started() { return this.#started; }
    get ended() { return this.#ended; }
    get runtime() { return (this.#done ? this.#ended : this.#opt.getNow()) - this.#started; }
    get lateBy() { return Math.max(0, this.runtime - this.#opt.interval); }
    
    get warnings() { return [...this.#warnings]; }
    get result() { return this.#result; }
    get error() { return this.#error; }

    warn(warning) { return this.#warnings.push(warning); }

    async _execute(id) {
        if (this.#id != null) { return false; }

        const { getNow, onPulse } = this.#opt;

        this.#id = id;
        this.#started = getNow();

        try {
            this.#result = await onPulse(this);
        } catch (err) {
            this.#error = err;
            this.#ok = false;
        }

        this.#done = true;
        this.#ended = getNow();

        return true;
    }

    toJSON() {
        const { id, ok, done, started, ended, runtime, lateBy, warnings, result, error } = this;
        return { id, ok, done, started, ended, runtime, lateBy, warnings, result, error };
    }
}
