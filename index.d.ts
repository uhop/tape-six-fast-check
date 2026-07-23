import type {Arbitrary, Parameters, RunDetails, Scheduler, SchedulerAct} from 'fast-check';

/**
 * Maps a tuple of values to the matching tuple of arbitraries. Used to infer
 * predicate argument types from the arbitraries passed to {@link Tester.prop}.
 * @see https://github.com/uhop/tape-six-fast-check#tprop
 */
export type ArbitraryTuple<Ts extends [unknown, ...unknown[]]> = {
  [K in keyof Ts]: Arbitrary<Ts[K]>;
};

/**
 * Property predicate: throw or return `false` to fail the property; any other
 * outcome (including `undefined`) passes. Sync or async.
 * @see https://github.com/uhop/tape-six-fast-check#tprop
 */
export type PropPredicate<Ts extends [unknown, ...unknown[]]> = (
  ...values: Ts
) => boolean | void | Promise<boolean | void>;

/**
 * Scheduler body: receives fast-check's cooperative scheduler; wrap promises
 * with `s.schedule(...)` and drain with `await s.waitAll()` (or `s.waitFor`).
 * Throw or return `false` to fail. @see https://github.com/uhop/tape-six-fast-check#tscheduler
 */
export type SchedulerBody = (s: Scheduler) => boolean | void | Promise<boolean | void>;

/**
 * Options for {@link Tester.scheduler}: `fc.check()` parameters (`seed`, `path`,
 * `numRuns`, …) plus the scheduler's optional `act` wrapper, passed to `fc.scheduler({act})`.
 * @see https://github.com/uhop/tape-six-fast-check#tscheduler
 */
export type SchedulerOptions = Parameters<[Scheduler]> & {act?: SchedulerAct};

declare module 'tape-six' {
  interface Tester {
    /**
     * Runs a fast-check property over the given arbitraries and reports one
     * aggregate assertion on this test: a counted pass, or a failure carrying
     * the structured counterexample, seed, and replay path (never parsed from
     * message text). Replay a failure with `{seed, path}` in `options`.
     * Returns the full `fc.check()` run details.
     * @param arbitraries - non-empty array of arbitraries, one per predicate argument
     * @param predicate - property body; throw or return `false` to fail
     * @param options - `fc.check()` parameters (`seed`, `path`, `numRuns`, …)
     * @param msg - assertion name (defaults to `'property holds'`)
     * @see https://github.com/uhop/tape-six-fast-check#tprop
     */
    prop<Ts extends [unknown, ...unknown[]]>(
      arbitraries: [...ArbitraryTuple<Ts>],
      predicate: PropPredicate<Ts>,
      options?: Parameters<Ts>,
      msg?: string
    ): Promise<RunDetails<Ts>>;
    prop<Ts extends [unknown, ...unknown[]]>(
      arbitraries: [...ArbitraryTuple<Ts>],
      predicate: PropPredicate<Ts>,
      msg?: string
    ): Promise<RunDetails<Ts>>;

    /**
     * Race-condition testing sugar: runs `body` under fast-check's cooperative
     * scheduler (`fc.asyncProperty(fc.scheduler(), body)`), exploring task
     * interleavings, and reports one aggregate assertion on this test.
     * Returns the full `fc.check()` run details.
     * @param body - receives the scheduler; throw or return `false` to fail
     * @param options - `fc.check()` parameters plus optional `act`
     * @param msg - assertion name (defaults to `'scheduled property holds'`)
     * @see https://github.com/uhop/tape-six-fast-check#tscheduler
     */
    scheduler(
      body: SchedulerBody,
      options?: SchedulerOptions,
      msg?: string
    ): Promise<RunDetails<[Scheduler]>>;
    scheduler(body: SchedulerBody, msg?: string): Promise<RunDetails<[Scheduler]>>;
  }
}
