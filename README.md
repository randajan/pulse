# @randajan/pulse

[![NPM](https://img.shields.io/npm/v/@randajan/pulse.svg)](https://www.npmjs.com/package/@randajan/pulse)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

A promise-friendly scheduler with aligned or relative intervals, isolated execution sessions, cancellation signals, and structured error reporting. Suitable for heartbeats, telemetry, maintenance tasks, and other recurring asynchronous work.

Supports ESM and CommonJS, runs in Node.js and browsers, and includes TypeScript declarations.

> **Upgrading from v2?** Version 3 has breaking API changes. See [Migrating from v2 to v3](#migrating-from-v2-to-v3) before updating.

## Installation

```bash
npm install @randajan/pulse
```

```js
// ESM
import createPulse, { Pulse, PulseSession, PulseCycle } from "@randajan/pulse";

// CommonJS
const { default: createPulse, Pulse } = require("@randajan/pulse");
```

## Quick start

```js
import createPulse from "@randajan/pulse";

const pulse = createPulse({
    interval: 1000,
    align: true,
    autoStart: true,
    onPulse: async cycle => {
        cycle.warn("Example warning");
        console.log(`Pulse #${cycle.id}`, cycle.session.state);
        return "done";
    },
    onError: (pulse, type, error) => console.error(`[pulse] ${type}:`, error.cause ?? error)
});

// Later
setTimeout(() => pulse.stop(), 10_000);
```

**`onPulse` receives exactly one argument: a `PulseCycle`.** Access its parent through `cycle.session` and `cycle.pulse`. No separate metadata object is created.

## Architecture

| Class | Responsibility | Lifetime |
| --- | --- | --- |
| `Pulse` | Public API, configuration, global `nextId`, and the last completed cycle | Until the Pulse instance is discarded |
| `PulseSession` | One active start/stop period: timers, planning, `AbortController`, current and last cycle | Created by each `pulse.start()` |
| `PulseCycle` | One execution: result, error, timestamps, warnings, and callback context | Created for each scheduled execution |

```js
onPulse: async cycle => {
    const pulse = cycle.pulse;
    const session = cycle.session;
    const signal = cycle.signal; // session's AbortSignal

    // Pass signal to cancellable work when available.
    const response = await fetch("/health", { signal });
    return response.status;
}
```

Stopping or restarting aborts the **session's signal**. This does **not** forcibly terminate an already running Promise: callback code must cooperate with cancellation. Each new session has its own signal, so late completion of an old cycle cannot reschedule the new session.

A session runs at most one cycle at a time. The next cycle is planned after the previous callback settles.

## Options

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `interval` | `number` | Yes | — | Period in milliseconds, from `10` to `2_147_483_647`. |
| `align` | `boolean` | Yes | — | Align to clock boundaries when `true`; schedule relative delays when `false`. |
| `offset` | `number` | No | `0`* | Shift the schedule. See [Scheduling](#scheduling). |
| `runOnStart` | `boolean` | No | `false` | Schedule the first cycle with a zero-millisecond delay. |
| `getNow` | `() => number` | No | `Date.now` | Clock returning finite, nonnegative milliseconds. Validated on construction and on every call. |
| `autoStart` | `boolean` | No | `false` | Automatically call `start()` in the constructor. |
| `onPulse` | `(cycle) => value \| Promise` | Yes | — | Execute the task; receives a `PulseCycle`. |
| `onStart` | `(session) => void` | No | No-op | Called before the first timer is scheduled. Throwing prevents startup. |
| `onStop` | `(session, reason) => void` | No | No-op | Called after the session has stopped, optionally with the stop reason. |
| `onError` | `(pulse, type, error) => void` | No | Console logging | Error notification; does **not** block the scheduler. |

*With `align: false` and `runOnStart: true`, `offset` must be omitted and the normalized offset is `-interval` internally.*

### Scheduling

**Aligned mode:** `align: true` schedules the next cycle on the next clock boundary, shifted by `offset` (from `0` to `interval`). For example, run at the 30-second mark of each minute:

```js
createPulse({
    align: true, interval: 60_000, offset: 30_000,
    onPulse: cycle => console.log("minute :30", cycle.id),
    autoStart: true
});
```

**Relative mode:** `align: false` waits `interval + offset` before the first cycle and `interval` after each completed cycle. The initial offset may be negative down to `-interval` or positive as long as the initial delay fits the JavaScript timer limit.

```js
createPulse({
    align: false, interval: 5000, offset: -4000,
    onPulse: cycle => console.log("pulse", cycle.id),
    autoStart: true
}); // First execution after ~1s; subsequent delays are 5s after completion.
```

With `runOnStart: true`, the first cycle is scheduled immediately (via a zero-delay timer), regardless of alignment. Subsequent executions follow the selected schedule.

Internal timers use `timeout.unref?.()` when available, so an otherwise idle Node.js process is not kept alive by Pulse alone. Timer precision is still subject to runtime scheduling delays.

## Public API

### `Pulse`

| Member | Description |
| --- | --- |
| `createPulse(options)` / `new Pulse(options)` | Create a scheduler. |
| `pulse.start()` | Start a **new** session; returns `false` if already running. |
| `pulse.stop(reason?)` | Stop the active session; returns `false` if already stopped. |
| `pulse.restart()` | Stop the current session and create a new one. |
| `pulse.session` | Active `PulseSession`, or `null` after stop. |
| `pulse.state` | Whether the active session is running. |
| `pulse.current` | Active `PulseCycle`, if any. |
| `pulse.last` | Last completed cycle, preserved across stops/restarts until replaced. |
| `pulse.nextId` | Next globally increasing cycle ID; **not** reset on restart. |
| `pulse.interval`, `pulse.offset`, `pulse.align` | Read-only configuration. |
| `pulse.countdown` | Milliseconds remaining until the scheduled timer, or `undefined`. |
| `pulse.potential` | Remaining countdown, or computed delay until a potential initial execution. |
| `pulse.nextAt` | Expected next execution timestamp in milliseconds, or `undefined`. |
| `pulse.calculatePotential(isInit?)` | Compute the next delay (initial behavior by default). |
| `pulse.toJSON()` | Snapshot of public scheduler state. |

### `PulseSession`

Available from `pulse.session` while running or via `cycle.session`, even after a stop. Exposes `pulse`, `signal`, `state`, `current`, `last`, `nextId`, `interval`, `offset`, `align`, `countdown`, `potential`, `nextAt`, `stop(reason?)`, `calculateCountdown()` and `toJSON()`.

Calling `session.stop()` on the active session also detaches it from its parent `Pulse`.

### `PulseCycle`

| Member | Description |
| --- | --- |
| `cycle.id` | Globally sequential cycle ID. |
| `cycle.pulse`, `cycle.session`, `cycle.signal` | Parent scheduler, its session and cancellation signal. |
| `cycle.started`, `cycle.ended` | Millisecond timestamps (`ended` is set after completion). |
| `cycle.done`, `cycle.ok` | Whether execution finished and whether `onPulse` succeeded. |
| `cycle.runtime` | Execution time in milliseconds, including elapsed time while running. |
| `cycle.lateBy` | `max(0, runtime - interval)` — runtime overrun, not timer scheduling latency. |
| `cycle.result`, `cycle.error` | Resolved return value or thrown/rejected value of `onPulse`. |
| `cycle.warnings`, `cycle.warn(warning)` | Snapshot of collected warnings; append a warning (`string` or `Error`). |
| `cycle.toJSON()` | Snapshot of cycle metadata. |

```js
onPulse: async cycle => {
    cycle.warn("Processing started");
    const value = await doWork(cycle.signal);
    return value; // available as cycle.result after completion
}
```

## Error handling

`onPulse` failures are recorded on the `PulseCycle` and reported as `PulseRuntimeError`. They do **not** stop the session; another cycle is scheduled after completion. Scheduling failures and unexpected execution failures stop the session and are reported through `onError`.

```js
import { PulseRuntimeError, PulseScheduleError } from "@randajan/pulse";

createPulse({
    interval: 1000, align: false,
    onPulse: cycle => doWork(cycle.signal),
    onError: (pulse, type, error) => {
        console.error(type, error.cause ?? error);
        if (error instanceof PulseScheduleError) console.warn("Scheduling stopped");
        if (error instanceof PulseRuntimeError) console.warn("Next cycle will still run");
    }
});
```

| Class | `type` | When reported | Effect |
| --- | --- | --- | --- |
| `PulseStartError` | `start` | `onStart` throws | Start fails and throws; session is cancelled. |
| `PulseStopError` | `stop` | `onStop` throws | Session remains stopped; error is reported. |
| `PulseScheduleError` | `schedule` | Planning the next timer fails | Session stops; no automatic retry. |
| `PulseExecuteError` | `execute` | Unexpected error while preparing/executing a cycle | Session stops. |
| `PulseRuntimeError` | `runtime` | `onPulse` throws or rejects | Cycle records failure; session continues. |

All classes derive from `PulseError`, expose `pulseErrType` and preserve the original failure in `error.cause`. When `onError` is absent, errors are logged to the console. If it returns a Promise, Pulse **does not await it** before scheduling more work; failures inside `onError` are logged instead of recursively reported.

`onStart` can prevent startup. `onStop` runs only *after* the session has been stopped, so an `onStop` error cannot reactivate it. `stop(reason)` forwards a supplied reason to `onStop` and reports any non-null reason via `onError` (an arbitrary reason is classified as `unknown`).

## Migrating from v2 to v3

**v3 is a breaking release.** Update all callbacks and remove obsolete options before upgrading.

| v2 | v3 | Migration action |
| --- | --- | --- |
| `onPulse(pulse, meta)` | `onPulse(cycle)` | Use `cycle.pulse`, `cycle.session` or `cycle.signal` as needed. |
| `onError(pulse, meta)` / `onError(pulse, error, id)` | `onError(pulse, type, error)` | Read original failure from `error.cause`; error reporting is non-blocking. |
| `onStart(pulse)` | `onStart(session)` | Access parent via `session.pulse`. |
| `onStop(pulse)` | `onStop(session, reason)` | Use session context and optional stop reason. |
| `PulseMeta` / numeric ID with `noMeta` | `PulseCycle` | Metadata always exists as a cycle instance. |
| `noMeta` | Removed | Delete the option; specifying it throws. |
| `maxRuns` | Removed | Implement an explicit counter in your callback if needed. |
| `afterPulse` | Removed | Place cleanup in `onPulse` using `try/finally`. |
| `pulse.reset()` | Removed | Cycle IDs are global to each `Pulse` instance and are not reset. |
| `start(reset)`, `stop(reset)`, `restart(reset)` | `start()`, `stop(reason?)`, `restart()` | Remove reset flags; `stop` now accepts an optional reason. |
| Metadata timestamps / `last` result | Millisecond timestamps / last `PulseCycle` | `started` is a number, and `pulse.last?.result` holds the callback result. |

### Callback migration example

```js
// v2
createPulse({
    interval: 1000, align: false,
    onPulse: (pulse, meta) => console.log(meta.id, pulse.state),
    onError: (pulse, meta) => console.error(meta.error),
    onStart: pulse => console.log(pulse.state)
});

// v3
createPulse({
    interval: 1000, align: false,
    onPulse: cycle => console.log(cycle.id, cycle.pulse.state),
    onError: (pulse, type, error) => console.error(type, error.cause),
    onStart: session => console.log(session.state)
});
```

For code previously using `maxRuns`, keep an application-level counter and call `cycle.session.stop()` when you reach the desired count. For cleanup previously handled by `afterPulse`, place it in `finally` inside `onPulse`.

## Why not `setInterval`?

A standard `setInterval` can invoke a callback again while an earlier asynchronous invocation is still running. Pulse waits for `onPulse` to settle before planning another execution. In aligned mode, it recalculates the next clock boundary rather than accumulating delays from previous executions. In relative mode, each subsequent delay starts after the previous cycle completes.

## License

MIT © [randajan](https://github.com/randajan)
