# @randajan/pulse


[![NPM](https://img.shields.io/npm/v/@randajan/pulse.svg)](https://www.npmjs.com/package/@randajan/pulse) 
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)


---

## Overview

**@randajan/pulse** is a tiny, zero‑dependency scheduler that fires your callback at *wall‑clock‑aligned* intervals. It focuses on precision (no drift), clarity and graceful error handling, so you can drive heart‑beat logic, telemetry or background maintenance tasks with just a few lines of code.

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
  onPulse: meta => {
    console.log("tick", meta.runtime, "ms");
  },
  onError: err => console.error("Pulse error:", err),
  autoStart: true               // start immediately
});

// Later…
setTimeout(() => pulse.stop(), 10_000);
```

Every time **onPulse** runs it receives a fresh metadata object:

```ts
interface PulseMeta {
  readonly started:  Date;
  readonly runtime:  number;            // ms since started
  readonly warnings: string[];
  warn(w: string | Error): void;        // push warning
}
```

---

## `createPulse(options)` — options reference

| Option      | Type       | Required | Default            | Description                                                        |
| ----------- | ---------- | -------- | ------------------ | ------------------------------------------------------------------ |
| `interval`  | `number`   | ✔︎       | —                  | Period in ms. Min **10 ms**, max **2 147 483 647 ms** (\~24 days). |
| `offset`    | `number`   |          | `0`                | Fixed shift applied to every pulse (0 ≤ offset < interval).        |
| `getNow`    | `function` |          | `() => Date.now()` | Custom clock—handy for deterministic tests or time travel.         |
| `autoStart` | `boolean`  |          | `false`            | If `true`, the scheduler starts right after construction.          |
| `noMeta` | `boolean`  |          | `false`            | If `false`, the scheduler creates metadata `PuleMeta` at runtime        |
| `onPulse`   | `function` | ✔︎       | —                  | Async/sync callback executed on each pulse. Receives `PulseMeta`.  |
| `onError`   | `function` |          | `() => {}`         | Called when `onPulse` throws or rejects.                           |
| `onStart`   | `function` |          | `() => {}`         | Called right before pulse starts.                          |
| `onStop`   | `function` |          | `() => {}`         | Called right after pulse stops.                            |
| `afterPulse`   | `function` |        | `() => {}`        | Async/sync callback executed after each pulse even if the onPulse raises an error. Receives `PulseMeta`.  |


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
| `pulse.nextId`          | `number` | next pulse id (read-only).              |
| `pulse.interval`       | `number`  | Interval in ms (read‑only).                          |
| `pulse.offset`         | `number`  | Offset in ms (read‑only).                            |
| `pulse.last`         | `number`  | if noMeta=true there will be last result, else there will be last metadata         |

---

## Why not `setInterval`?

`setInterval` drifts: extra work inside the callback pushes the next tick further, eventually desynchronising your schedule. **Pulse** recalculates the next edge *after* each run and keeps the loop tightly aligned to the original wall‑clock grid.

---

## Recipes

### Long delays (> 24 days)

JavaScript timers accept at most **2 147 483 647 ms**. To wait longer, chain pulses:

```js
createPulse({
  interval: 2_147_483_647,
  onPulse: async meta => {
    if (stillWaiting()) return;   // keep sleeping…
    // …real logic here
  },
  autoStart: true
});
```


---

## License

MIT © [randajan](https://github.com/randajan)

