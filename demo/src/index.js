
import { info, log } from "@randajan/simple-lib/node";
import { Pulse } from "../../dist/esm/index.mjs";

import test from 'node:test';
import assert from 'node:assert/strict';

const options = (extra = {}) => ({
    align: false,
    interval: 20,
    runOnStart: true,
    onPulse: () => {},
    ...extra,
});

function useClock(t, at = 1_000) {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: new Date(at) });
    return async (ms = 0) => {
        t.mock.timers.tick(ms);
        await flush();
    };
}

async function flush() {
    // Async timer callbacks continue in microtasks after the clock advances.
    for (let i = 0; i < 8; i++) { await Promise.resolve(); }
}

test('onPulse receives PulseCycle, including session, signal and metadata', async t => {
    const advance = useClock(t);
    let startedSession;
    let stoppedSession;
    let callbackCycle;

    const pulse = new Pulse(options({
        onStart: session => { startedSession = session; },
        onStop: session => { stoppedSession = session; },
        onPulse: cycle => {
            callbackCycle = cycle;
            assert.equal(cycle.pulse, pulse);
            assert.equal(cycle.session, startedSession);
            assert.equal(cycle.signal, startedSession.signal);
            cycle.warn('hello');
            return 42;
        },
    }));

    assert.equal(pulse.start(), true);
    assert.equal(pulse.start(), false);
    assert.equal(pulse.state, true);
    await advance(0);

    assert.equal(callbackCycle.id, 0);
    assert.equal(callbackCycle.ok, true);
    assert.equal(callbackCycle.done, true);
    assert.equal(callbackCycle.result, 42);
    assert.equal(callbackCycle.started, 1_000);
    assert.equal(callbackCycle.ended, 1_000);
    assert.equal(callbackCycle.runtime, 0);
    assert.deepEqual(callbackCycle.warnings, ['hello']);
    assert.equal(pulse.last, callbackCycle);
    assert.equal(pulse.current, null);
    assert.equal(pulse.nextId, 1);

    assert.equal(pulse.stop(), true);
    assert.equal(pulse.stop(), false);
    assert.equal(stoppedSession, startedSession);
    assert.equal(startedSession.signal.aborted, true);
    assert.equal(pulse.last, callbackCycle);
});

test('relative timing: initial offset, countdown and recurring interval', async t => {
    const advance = useClock(t);
    const calls = [];
    const pulse = new Pulse(options({
        runOnStart: false,
        offset: 5,
        onPulse: cycle => calls.push({ id: cycle.id, time: Date.now() }),
    }));

    pulse.start();
    assert.equal(pulse.countdown, 25);
    assert.equal(pulse.nextAt, 1_025);
    await advance(24);
    assert.equal(calls.length, 0);
    await advance(1);
    assert.deepEqual(calls, [{ id: 0, time: 1_025 }]);
    assert.equal(pulse.countdown, 20);
    await advance(20);
    assert.deepEqual(calls, [
        { id: 0, time: 1_025 },
        { id: 1, time: 1_045 },
    ]);
    pulse.stop();
});

test('aligned timing: first pulse and next wall-clock boundary', async t => {
    const advance = useClock(t);
    const calls = [];
    const pulse = new Pulse(options({
        align: true,
        interval: 100,
        offset: 20,
        runOnStart: false,
        onPulse: () => calls.push(Date.now()),
    }));

    pulse.start();
    assert.equal(pulse.countdown, 20);
    assert.equal(pulse.nextAt, 1_020);
    await advance(19);
    assert.deepEqual(calls, []);
    await advance(1);
    assert.deepEqual(calls, [1_020]);
    assert.equal(pulse.nextAt, 1_120);
    await advance(100);
    assert.deepEqual(calls, [1_020, 1_120]);
    pulse.stop();
});

test('an unresolved onPulse does not overlap with another cycle', async t => {
    const advance = useClock(t);
    let resolveFirst;
    const first = new Promise(resolve => { resolveFirst = resolve; });
    let calls = 0;
    const pulse = new Pulse(options({
        onPulse: () => ++calls === 1 ? first : 'next',
    }));

    pulse.start();
    await advance(0);
    assert.equal(calls, 1);
    assert.equal(pulse.current.done, undefined);
    await advance(100);
    assert.equal(calls, 1);

    resolveFirst('first');
    await flush();
    assert.equal(pulse.last.result, 'first');
    await advance(20);
    assert.equal(calls, 2);
    pulse.stop();
});

test('restart isolates an old unresolved cycle from the new session', async t => {
    const advance = useClock(t);
    let resolveOld;
    const oldWork = new Promise(resolve => { resolveOld = resolve; });
    const sessions = [];
    const pulse = new Pulse(options({
        onPulse: cycle => {
            sessions.push(cycle.session);
            return cycle.id === 0 ? oldWork : cycle.id;
        },
    }));

    pulse.start();
    await advance(0);
    const oldSession = pulse.session;
    assert.equal(pulse.nextId, 1);

    pulse.restart();
    assert.notEqual(pulse.session, oldSession);
    assert.equal(oldSession.signal.aborted, true);
    await advance(0);
    assert.equal(pulse.last.id, 1);
    assert.equal(pulse.nextId, 2);

    resolveOld('late');
    await flush();
    assert.equal(pulse.last.id, 1);
    await advance(20);
    assert.equal(pulse.last.id, 2);
    assert.equal(sessions.length, 3);
    pulse.stop();
});

test('onPulse failure reports PulseRuntimeError and next pulse continues', async t => {
    const advance = useClock(t);
    const failure = new Error('work failed');
    const errors = [];
    let finishErrorHandler;
    const slowErrorHandler = new Promise(resolve => { finishErrorHandler = resolve; });
    const pulse = new Pulse(options({
        onPulse: cycle => {
            if (cycle.id === 0) { throw failure; }
            return 'recovered';
        },
        onError: (pulse, type, error) => { errors.push({ type, error }); return slowErrorHandler; },
    }));

    pulse.start();
    await advance(0);
    assert.equal(pulse.last.ok, false);
    assert.equal(pulse.last.done, true);
    assert.equal(pulse.last.error, failure);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, 'runtime');
    assert.equal(errors[0].error.name, 'PulseRuntimeError');
    assert.equal(errors[0].error.cause, failure);
    assert.equal(pulse.state, true);

    await advance(20);
    assert.equal(pulse.last.id, 1);
    assert.equal(pulse.last.result, 'recovered'); // onError is still pending.
    finishErrorHandler();
    await flush();
    pulse.stop();
});

test('onStart failure rejects the start, aborts session and reports the cause', t => {
    useClock(t);
    const failure = new Error('start failed');
    const errors = [];
    let session;
    const pulse = new Pulse(options({
        onStart: s => { session = s; throw failure; },
        onError: (pulse, type, error) => errors.push({ type, error }),
    }));

    assert.throws(() => pulse.start(), err =>
        err.name === 'PulseStartError' && err.cause === failure
    );
    assert.equal(pulse.state, false);
    assert.equal(pulse.session, null);
    assert.equal(session.signal.aborted, true);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, 'start');
    assert.equal(errors[0].error.cause, failure);
});

test('onStop failure cannot prevent stopping the scheduler', t => {
    useClock(t);
    const failure = new Error('stop failed');
    const errors = [];
    let session;
    const pulse = new Pulse(options({
        onStart: s => { session = s; },
        onStop: () => { throw failure; },
        onError: (pulse, type, error) => errors.push({ type, error }),
    }));

    pulse.start();
    assert.equal(pulse.stop(), true);
    assert.equal(pulse.state, false);
    assert.equal(session.signal.aborted, true);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, 'stop');
    assert.equal(errors[0].error.name, 'PulseStopError');
    assert.equal(errors[0].error.cause, failure);
});

test('failed scheduling stops the session and reports PulseScheduleError', t => {
    useClock(t);
    const failure = new Error('cannot plan');
    const errors = [];
    const pulse = new Pulse(options({
        onError: (pulse, type, error) => errors.push({ type, error }),
    }));

    pulse.calculatePotential = () => { throw failure; };
    assert.equal(pulse.start(), false);
    assert.equal(pulse.state, false);
    assert.equal(pulse.session, null);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, 'schedule');
    assert.equal(errors[0].error.name, 'PulseScheduleError');
    assert.equal(errors[0].error.cause, failure);
});

test('last survives stopping a new session before its first cycle', async t => {
    const advance = useClock(t);
    const pulse = new Pulse(options({ onPulse: () => 'saved' }));

    pulse.start();
    await advance(0);
    const last = pulse.last;
    pulse.stop();
    pulse.start();
    pulse.stop(); // New session produced no cycles.
    assert.equal(pulse.last, last);
});

test('session.stop() delegates to Pulse.stop() and aborts the session', t => {
    useClock(t);
    const pulse = new Pulse(options());
    pulse.start();
    const session = pulse.session;
    assert.equal(session.stop(), true);
    assert.equal(pulse.session, null);
    assert.equal(pulse.state, false);
    assert.equal(session.signal.aborted, true);
});

test('toJSON returns a finite public snapshot without circular references', async t => {
    const advance = useClock(t);
    const pulse = new Pulse(options({ onPulse: cycle => { cycle.warn('ok'); return 7; } }));
    pulse.start();
    await advance(0);
    const json = JSON.parse(JSON.stringify(pulse));
    assert.equal(json.state, true);
    assert.equal(json.nextId, 1);
    assert.equal(json.last.id, 0);
    assert.equal(json.last.result, 7);
    assert.deepEqual(json.last.warnings, ['ok']);
    pulse.stop();
});
