# AGENTS.md — tape-six-fast-check

> `tape-six-fast-check` is a property-based-testing plugin for [tape-six](https://github.com/uhop/tape-six) powered by [fast-check](https://fast-check.dev/). It registers two tester methods — `t.prop()` and `t.scheduler()` — that run `fc.check()` and report **one aggregate assertion** per call, carrying structured counterexample/seed/path data. Both tape-six and fast-check are peer dependencies.

For project structure and data flow see [ARCHITECTURE.md](./ARCHITECTURE.md).
Usage docs live in the [README](./README.md) — this project has no wiki by design.

## Setup

```bash
git clone https://github.com/uhop/tape-six-fast-check.git
cd tape-six-fast-check
npm install
```

No submodules, no build step. The peers (`tape-six`, `fast-check`) are also devDependencies, so a plain `npm install` makes the tests runnable.

## Commands

- **Install:** `npm install`
- **Test (Node):** `npm test` (runs `tape6 --flags FO`)
- **Test (Bun):** `npm run test:bun`
- **Test (Deno):** `npm run test:deno`
- **Type tests (Node/Bun/Deno):** `npm run ts-test` / `ts-test:bun` / `ts-test:deno` (runs the `.ts` typings smoke test)
- **Lint:** `npm run lint` (Prettier check)
- **Lint fix:** `npm run lint:fix` (Prettier write)
- **TypeScript check:** `npm run ts-check`
- **JS lint check (optional):** `npm run js-check` (`tsc --project tsconfig.check.json` — `checkJs` lint for unused/undeclared variables, `strict: false`; not a type check — use `ts-check` for types)

## Project structure

```
tape-six-fast-check/
├── index.js          # The whole plugin: t.prop, t.scheduler, registration
├── index.d.ts        # TypeScript definitions + the tape-six Tester augmentation (sole source of types + docs)
├── package.json      # Package config; "tape6" section configures test discovery
└── tests/
    ├── test-prop.js        # t.prop functionality (incl. failure paths via a fake tester)
    ├── test-scheduler.js   # t.scheduler functionality
    └── test-types.ts       # TS typings smoke test (run via ts-test; type-checked by ts-check)
```

This is a **library, not a CLI** — it ships no `bin`. The entire implementation is a single root module (`index.js`); there is no `src/` and no build step.

## Code style

- **ES modules** throughout (`"type": "module"` in package.json).
- **No transpilation** — code runs directly in Node, Deno, Bun, and browsers.
- **No runtime dependencies** — `tape-six` and `fast-check` are **peer** dependencies; the consumer supplies both. Never move them to `dependencies`.
- **Prettier** for formatting (see `.prettierrc`).
- **No JSDoc in `.js`** — `index.d.ts` is the sole source of types and docs; `index.js` carries `// @ts-self-types="./index.d.ts"` at the top so IDE hover defers to the `.d.ts`.
- **No narrating comments** — comments are short _why_-markers only (a non-trivial decision/constraint, an algorithm reference, or required JSDoc), never a restatement of _what_ the code does.

## Architecture

- **Registration is a side effect of import:** `registerTesterMethod('prop', …)` / `registerTesterMethod('scheduler', …)` install the methods on tape-six's `Tester.prototype`. A same-name collision with a different implementation throws loudly (tape-six's rule) — never rename to dodge it.
- **One aggregate assertion per call**, delivered through `Tester.reportAssertion({ok, message, marker, operator, expected, actual})`. Success is a lean pass; failure sets `expected: true` and packs `actual` with `{counterexample, seed, path, numRuns, numShrinks, error}`.
- **Structured data only — never parse text.** All failure data is read from `fc.check()` run details (structured public API). Parsing fast-check's report/message text is banned — it breaks when fast-check rewords, and it is against the tape-six family rule ("events stay uniform"). If parsed data were ever unavoidable it would go under the event's `data.actual`, never top-level.
- **Marker mechanics:** each method captures `new Error()` in its own frame; tape-six's `State` resolves the location from `stackList[markerIndex]` with `markerIndex` defaulting to `1` — the caller's frame, i.e. the `t.prop()` call site in the user's test. `t.scheduler` must keep capturing its own marker (delegating capture to a shared helper one frame deeper would point the location at this plugin instead of user code).
- **v1 predicate contract:** inside a property body, **throw or return `false`** to fail. `t.*` assertions inside predicates are unsupported — a predicate runs up to `numRuns` times and would re-report on every run. (A scoped sub-tester materializing only the shrunk failing run is a possible later refinement.)
- **`t.scheduler` is sugar** over `fc.asyncProperty(fc.scheduler(), body)`; the `act` key is split out of the options bag and forwarded to `fc.scheduler({act})`, everything else goes to `fc.check()`.
- **Msg-last signatures** with the message allowed in the options slot (`t.prop(arbs, predicate, 'name')`) — the house convention.

## Usage

```js
import test from 'tape-six';
import fc from 'fast-check';
import 'tape-six-fast-check';

test('addition is commutative', async t => {
  await t.prop([fc.integer(), fc.integer()], (a, b) => a + b === b + a, 'a + b === b + a');
});
```

## Key conventions

- **Do not add runtime dependencies.** Peers stay peers.
- **Never special-case fast-check's errors with text parsing** — structured `fc.check()` run details are the only data source.
- All public API is typed in `index.d.ts` (including the `declare module 'tape-six'` Tester augmentation). Keep `index.js` and `index.d.ts` in sync.
- The module exports nothing at runtime — it is a side-effect plugin; the API surface is the two tester methods.
- Always `await` `t.prop(...)` / `t.scheduler(...)` — the assertion reports when the run completes.
