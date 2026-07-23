# tape-six-fast-check [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/tape-six-fast-check.svg
[npm-url]: https://npmjs.org/package/tape-six-fast-check

`tape-six-fast-check` brings property-based testing to [tape-six](https://github.com/uhop/tape-six), powered by [fast-check](https://fast-check.dev/): two tester methods — `t.prop()` for properties and `t.scheduler()` for race-condition testing — reported as counted tape-six assertions with **structured** counterexamples, seeds, and replay paths.

ES modules, TypeScript bindings included. Works wherever tape-six and fast-check run: Node, Deno, Bun, and browsers (with an import map).

```js
import test from 'tape-six';
import fc from 'fast-check';
import 'tape-six-fast-check';

test('sorting is idempotent', async t => {
  await t.prop(
    [fc.array(fc.integer())],
    a => {
      const once = [...a].sort((x, y) => x - y);
      const twice = [...once].sort((x, y) => x - y);
      return JSON.stringify(once) === JSON.stringify(twice);
    },
    'sort(sort(a)) === sort(a)'
  );
});
```

- **On success:** one counted, named passing assertion — visible in the plan and the TAP output like any other `t.*` assertion.
- **On failure:** one failing assertion carrying the shrunk counterexample, the seed, and the replay path as **structured data** (read from `fc.check()` run details, never parsed from message text), located at the `t.prop()` call site.

## Install

```bash
npm install --save-dev tape-six-fast-check tape-six fast-check
```

`tape-six` (≥ 1.16.0) and `fast-check` (≥ 4) are **peer dependencies** — your project supplies them; the plugin pins neither.

## Usage

Import the package once per test file — it registers the tester methods as a side effect:

```js
import 'tape-six-fast-check';
```

### t.prop()

```js
await t.prop(arbitraries, predicate, options?, msg?)
```

Runs `fc.check()` over the given property and reports one aggregate assertion on the current test. Returns the full fast-check [run details](https://fast-check.dev/docs/core-blocks/runners/#check).

- `arbitraries` — a non-empty **array** of fast-check arbitraries, one per predicate argument.
- `predicate` — the property body: `(...values) => boolean | void | Promise<boolean | void>`. **Throw or return `false` to fail**; any other outcome passes. Sync or async.
- `options` — [`fc.check()` parameters](https://fast-check.dev/docs/configuration/user-definable-values/): `numRuns`, `seed`, `path`, `endOnFailure`, …
- `msg` — the assertion name (defaults to `'property holds'`). May take the options slot: `t.prop(arbs, predicate, 'name')`.

Do **not** call `t.*` assertions inside the predicate — it runs up to `numRuns` times, so every inner assertion would be re-reported on each run. Signal through the return value or by throwing; the plugin reports a single aggregate assertion per `t.prop()` call.

```js
test('addition is commutative', async t => {
  await t.prop([fc.integer(), fc.integer()], (a, b) => a + b === b + a, 'a + b === b + a');
});
```

### Replaying a failure

A failed run reports its counterexample, `seed`, and `path` as structured assertion data. Pin them in `options` to replay the exact shrunk case:

```js
await t.prop([fc.array(fc.integer())], mySortIsStable, {
  seed: -1651341797,
  path: '25:3:1',
  endOnFailure: true
});
```

### t.scheduler()

```js
await t.scheduler(body, options?, msg?)
```

Race-condition testing sugar over `fc.asyncProperty(fc.scheduler(), body)`. The `body` receives fast-check's cooperative [scheduler](https://fast-check.dev/docs/advanced/race-conditions/): wrap promises with `s.schedule(...)` (or `s.scheduleFunction(...)`), drain with `await s.waitAll()`, and fast-check explores task interleavings across runs. Throw or return `false` to fail; the same aggregate reporting and replay mechanics as `t.prop()` apply.

- `options` additionally accepts `act` — passed through to `fc.scheduler({act})` (for React-style wrappers).

```js
test('last write wins regardless of interleaving', async t => {
  await t.scheduler(async s => {
    let state = 'initial';
    s.schedule(Promise.resolve()).then(() => (state = 'a'));
    s.schedule(Promise.resolve()).then(() => (state = 'b'));
    await s.waitAll();
    return state !== 'initial';
  }, 'some write always lands');
});
```

## TypeScript

The typings augment tape-six's `Tester` interface, so `t.prop` / `t.scheduler` are fully typed after a single `import 'tape-six-fast-check'`. Predicate argument types are inferred from the arbitraries tuple:

```ts
await t.prop([fc.integer(), fc.string()], (n, s) => typeof n === 'number' && s.length >= 0);
```

Exported helper types: `ArbitraryTuple`, `PropPredicate`, `SchedulerBody`, `SchedulerOptions`.

## Release notes

- 1.0.0 — Initial release: `t.prop()`, `t.scheduler()`, TypeScript augmentation of `Tester`.

## License

BSD-3-Clause © 2026 [Eugene Lazutkin](https://www.lazutkin.com/).
