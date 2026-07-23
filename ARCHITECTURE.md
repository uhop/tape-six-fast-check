# Architecture — tape-six-fast-check

A single-module plugin connecting two stable public APIs: tape-six's tester extension point and fast-check's property runner. No build step, no runtime dependencies of its own.

## Layout

```
index.js       # implementation: t.prop, t.scheduler, registration
index.d.ts     # types + docs, incl. the tape-six Tester interface augmentation
tests/         # tape-six test suite (fast-check is the subject and a devDep)
```

## Data flow

```
t.prop(arbitraries, predicate, options?, msg?)
  │  validate args (TypeError), split msg out of the options slot
  │  marker = new Error()            — captured in the method's own frame
  ▼
fc.asyncProperty(...arbitraries, async wrapper(predicate))
  ▼
await fc.check(property, params)    — structured RunDetails, no text parsing
  ▼
Tester.reportAssertion({ok: !failed, message, marker, operator,
                        expected?, actual?})
  ▼
returns RunDetails to the caller
```

`t.scheduler(body, options?, msg?)` follows the same path with the property fixed to `fc.asyncProperty(fc.scheduler(act && {act}), body)` — the `act` key is split out of the options bag for `fc.scheduler`; the rest goes to `fc.check`.

## Key decisions

- **One aggregate assertion per call.** A property run is one logical check no matter how many cases fast-check executes. Success reports a lean counted pass; failure reports `expected: true` and a structured `actual`: `{counterexample, seed, path, numRuns, numShrinks, error}` — read from `RunDetails`, so it survives any fast-check message rewording. Parsing report text is banned (the tape-six family "events stay uniform" rule).
- **Marker in the method's own frame.** tape-six resolves an assertion's location as `stackList[markerIndex]` (default `1`) of the marker's stack — frame 0 is the method that created it, frame 1 its caller. Each public method creates its own marker so frame 1 is always the user's call site; a shared helper creating the marker would shift the location into this plugin.
- **Always `fc.asyncProperty`.** One code path handles sync and async predicates; the async wrapper satisfies fast-check's Promise-returning predicate typing and the per-call cost is noise for tests.
- **Throw / return-`false` predicate contract (v1).** `t.*` assertions inside a predicate would re-report on every run (up to `numRuns`), so they are unsupported; a scoped sub-tester that materializes only the shrunk failing run is a possible later refinement.
- **Peers, not dependencies.** The consumer's project owns the tape-six and fast-check versions; the plugin declares `tape-six ^1.16.0` (`registerTesterMethod`, `reportAssertion`, `Tester`-as-interface) and `fast-check ^4.0.0` (`RunDetails` shape) as floors.
- **Side-effect registration.** Importing the module installs both methods via `registerTesterMethod`, which throws loudly on a conflicting name — collisions must surface, not be silently renamed around.

## Boundaries

- tape-six surface used: `registerTesterMethod` (from `tape-six/Tester.js`) and `Tester.reportAssertion`. Nothing else.
- fast-check surface used: `asyncProperty`, `check`, `scheduler` and the `RunDetails` fields `failed`, `counterexample`, `counterexamplePath`, `seed`, `numRuns`, `numShrinks`, `errorInstance`.
- The module has **no runtime exports**; `index.d.ts` exports helper types (`ArbitraryTuple`, `PropPredicate`, `SchedulerBody`, `SchedulerOptions`) and augments `tape-six`'s `Tester`.
