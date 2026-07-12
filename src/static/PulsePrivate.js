import { solid } from "@randajan/props";
import { createMetaData } from "./metadata";
import { formatOptions } from "./options";


export class PulsePrivate {

    constructor(pulse, options) {
        this.pulse = pulse;
        this.state = false;
        this.nextId = 0;
        this.opt = formatOptions(options);

        this.run = this.run.bind(this);
    }

    getCountdown() {
        const { state, fireAt, opt:{ getNow } } = this;
        if (!state || fireAt == null) { return; }
        return Math.max(0, fireAt - getNow());
    }

    getPotential(isInit = true) {
        const { opt:{ align, runOnStart, interval, offset, getNow } } = this;
        if (isInit && runOnStart) { return 0; }
        if (!align) { return isInit ? (interval + offset) : interval; }
        const now = getNow() - offset;
        const rest = ((now % interval) + interval) % interval;
        return rest === 0 ? interval : interval - rest;
    }

    reset() {
        this.nextId = 0;
        return true;
    }

    start(reset=false) {
        const { pulse, state, timeoutId, opt:{ onStart } } = this;
        if (state) { return false; }
        onStart(pulse);
        if (reset) { this.reset(); }
        this.state = true;
        return this.plan(true);
    }

    stop(reset=false) {
        const { pulse, state, timeoutId, opt:{ onStop } } = this;
        if (!state) { return false; }
        clearTimeout(timeoutId);
        this.state = false;
        delete this.fireAt;
        if (reset) { this.reset(); }
        onStop(pulse);
        return true;
    }

    plan(isInit) {
        const { state, metaData, nextId, opt:{ maxRuns, getNow } } = this;
        if (!state || metaData != null) { return false; }
        if (maxRuns && maxRuns <= nextId) { this.stop(true); return false; }
        const fireIn = this.getPotential(isInit);
        this.fireAt = getNow() + fireIn;
        this.timeoutId = setTimeout(this.run, fireIn);
        this.timeoutId.unref?.();
        return true;
    }

    async run() {
        const { pulse, state, metaData, opt:{ noMeta, getNow, onPulse, onError, afterPulse } } = this;
        if (!state || metaData) { return; }

        const id = this.nextId++;
        const md = this.metaData = noMeta ? id : createMetaData(this, id);
        let errA, errB, result;

        try {
            result = await onPulse(pulse, md);
            if (!noMeta) { solid(md, "result", result); }
        }
        catch (err) {
            errA = err;
            if (!noMeta) { solid(md, "error", errA); }
        }

        if (!noMeta) { solid(md, "ended", getNow()); }

        if (errA != null) {
            if (noMeta) { onError(pulse, errA, md); }
            else { onError(pulse, md); }
        }

        try { await afterPulse(pulse, md); }
        catch (err) { errB = err; }

        this.last = noMeta ? result : md;
        delete this.metaData;

        if (errB != null) {
            this.stop();
            throw errB;
        }

        this.plan(false);
    }

    restart(reset) {
        this.stop(reset);
        return this.start(reset);
    }

}
