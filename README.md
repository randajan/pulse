# @randajan/pulse


[![NPM](https://img.shields.io/npm/v/@randajan/pulse.svg)](https://www.npmjs.com/package/@randajan/pulse) 
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)


---

## Overview

**@randajan/pulse** is a tiny, zero‑dependency scheduler that fires your callback on aligned or relative intervals. It focuses on precision, clarity and graceful error handling, so you can drive heart‑beat logic, telemetry or background maintenance tasks with just a few lines of code.

The package ships dual builds—**ESM** *and* **CommonJS**—and works the same in Node.js and the browser.

### ESM **&** CommonJS ready

```js
// ESM
import createPulse, { Pulse } from "@randajan/pulse";

// CommonJS
const createPulse = require("@randajan/pulse");
```

---

## Quick start

```js
import createPulse from "@randajan/pulse";

const pulse = createPulse({
  interval: 1000,                // 1 second
  align: true,                   // align to wall-clock time
  onPulse: (pulse, meta) => {
    console.log("tick", meta.runtime, "ms");
  },
  onError: (pulse, meta) => console.error("Pulse error:", meta.error),
  autoStart: true               // start immediately
});

// Later…
setTimeout(() => pulse.stop(), 10_000);
```

Every time **onPulse** runs it receives the pulse instance and a fresh metadata object:

```ts
interface PulseMeta {
  readonly id:       number;
  readonly started:  Date;
  readonly runtime:  number;            // ms since started
  readonly lateBy:   number;            // ms over interval runtime
  readonly warnings: string[];
  warn(w: string | Error): void;        // push warning
}
```

---

## `createPulse(options)` — options reference

| Option      | Type       | Required | Default            | Description                                                        |
| ----------- | ---------- | -------- | ------------------ | ------------------------------------------------------------------ |
| `interval`  | `number`   | ✔︎       | —                  | Period in ms. Min **10 ms**, max **2 147 483 647 ms** (\~24 days). |
| `align`     | `boolean`  | ✔︎       | —                  | If `true`, pulse is aligned to wall-clock interval edges. If `false`, pulse runs relatively from start. |
| `offset`    | `number`   |          | `0`                | Timing offset. Range and meaning depend on `align`; see below.     |
| `maxRuns`   | `number`   |          | `0`                | Maximum number of pulses before automatic stop. `0` means unlimited. |
| `getNow`    | `function` |          | `() => Date.now()` | Custom clock—handy for deterministic tests or time travel.         |
| `autoStart` | `boolean`  |          | `false`            | If `true`, the scheduler starts right after construction.          |
| `runOnStart` | `boolean` |          | `false`            | If `true`, the first pulse is scheduled immediately on start.      |
| `noMeta` | `boolean`  |          | `false`            | If `true`, callbacks receive the numeric pulse id instead of `PulseMeta`. |
| `onPulse`   | `function` | ✔︎       | —                  | Async/sync callback executed on each pulse. Receives `(pulse, meta)`.  |
| `onError`   | `function` |          | `() => {}`         | Called when `onPulse` throws or rejects. Receives `(pulse, meta)`, or `(pulse, error, id)` with `noMeta: true`. |
| `onStart`   | `function` |          | `() => {}`         | Called right before pulse starts.                          |
| `onStop`   | `function` |          | `() => {}`         | Called right after pulse stops.                            |
| `afterPulse`   | `function` |        | `() => {}`        | Async/sync callback executed after each pulse even if `onPulse` raises an error. Receives `(pulse, meta)`.  |


### `align` and `offset`

With `align: true`, pulses are scheduled on wall-clock interval edges shifted by `offset`. In this mode `offset` must be between `0` and `interval`.

```js
createPulse({
  align: true,
  interval: 60_000,
  offset: 30_000,
  onPulse: () => console.log("fires around every minute at :30")
});
```

With `align: false`, the first pulse is delayed by `interval + offset`; every following pulse uses `interval`. In this mode `offset` can be negative down to `-interval`, or positive as long as `interval + offset` does not exceed the maximum JavaScript timer delay.

```js
createPulse({
  align: false,
  interval: 5_000,
  offset: -4_000,
  onPulse: () => console.log("first fire after 1s, then every 5s")
});
```

In Node.js, Pulse calls `timeout.unref?.()` for its internal timers. A running pulse will not keep an otherwise idle Node process alive.

### `runOnStart`

With `runOnStart: true`, the first pulse is scheduled with a `0` ms delay when `start()` is called. The callback still runs asynchronously through the scheduler, not directly inside `start()`.

```js
createPulse({
  align: false,
  interval: 60_000,
  runOnStart: true,
  onPulse: () => console.log("runs now, then every minute")
});
```

`runOnStart` only affects the initial plan after `start()`. After the first pulse completes, the next pulse is scheduled normally: aligned to the wall-clock grid when `align: true`, or after `interval` when `align: false`.

---

## API

| Member                 | Returns   | Description                                          |
| ---------------------- | --------- | ---------------------------------------------------- |
| `createPulse(options)` | `Pulse`   | Convenience wrapper around `new Pulse(options)`.     |
| `new Pulse(options)`   | `Pulse`   | Class constructor when you prefer `new`.             |
| `pulse.start()`        | `boolean` | Starts the loop; returns `false` if already running. |
| `pulse.stop()`         | `boolean` | Stops the loop; returns `false` if already stopped.  |
| `pulse.restart()`         | `boolean` | Call pulse.stop() and then pulse.start() |
| `pulse.reset()`         | `boolean` | Resets nextId counter |
| `pulse.state`          | `boolean` | `true` = running, `false` = stopped (read-only)                 |
| `pulse.align`          | `boolean` | Alignment mode (read-only).                          |
| `pulse.interval`       | `number`  | Interval in ms (read‑only).                          |
| `pulse.offset`         | `number`  | Offset in ms (read‑only).                            |
| `pulse.countdown`         | `number\|undefined`  | Real ms remaining to the currently scheduled pulse; `undefined` while stopped. |
| `pulse.potential`         | `number`  | Real countdown while running, otherwise ms that would be used by the next `start()`; returns `0` when `runOnStart` applies. |
| `pulse.nextAt`         | `number\|undefined`  | Timestamp of the next scheduled pulse while running. |
| `pulse.last`         | `any\|PulseMeta`  | Last callback result with `noMeta: true`; otherwise last metadata. |

---

## Why not `setInterval`?

`setInterval` drifts: extra work inside the callback pushes the next tick further, eventually desynchronising your schedule. With `align: true`, **Pulse** recalculates the next edge *after* each run and keeps the loop tightly aligned to the wall-clock grid. With `align: false`, it runs as a promise-friendly relative scheduler.

---

## Recipes

### Long delays (> 24 days)

JavaScript timers accept at most **2 147 483 647 ms**. To wait longer, chain pulses:

```js
createPulse({
  align: false,
  interval: 2_147_483_647,
  onPulse: async (pulse, meta) => {
    if (stillWaiting()) return;   // keep sleeping…
    // …real logic here
  },
  autoStart: true
});
```


---

## License

MIT © [randajan](https://github.com/randajan)
