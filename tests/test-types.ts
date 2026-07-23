import test from 'tape-six';
import fc from 'fast-check';
import type {RunDetails, Scheduler} from 'fast-check';

import 'tape-six-fast-check';
import type {ArbitraryTuple, PropPredicate, SchedulerOptions} from 'tape-six-fast-check';

test('types: t.prop infers predicate arguments from arbitraries', async t => {
  const details: RunDetails<[number, string]> = await t.prop(
    [fc.integer(), fc.string()],
    (n, s) => typeof n === 'number' && typeof s === 'string',
    {numRuns: 5},
    'inferred tuple'
  );
  t.ok(!details.failed);
});

test('types: the message can take the options slot', async t => {
  await t.prop([fc.boolean()], b => b || !b, 'named without options');
  t.pass();
});

test('types: predicates may be sync or async', async t => {
  const syncPredicate: PropPredicate<[number]> = n => n === n;
  const asyncPredicate: PropPredicate<[number]> = async n => n === n;
  await t.prop([fc.nat()], syncPredicate, {numRuns: 3});
  await t.prop([fc.nat()], asyncPredicate, {numRuns: 3});
  t.pass();
});

test('types: ArbitraryTuple maps values to arbitraries', async t => {
  const arbitraries: ArbitraryTuple<[number, boolean]> = [fc.nat(), fc.boolean()];
  await t.prop(arbitraries, (n, b) => typeof n === 'number' && typeof b === 'boolean', {
    numRuns: 3
  });
  t.pass();
});

test('types: t.scheduler receives a Scheduler and accepts options', async t => {
  const options: SchedulerOptions = {numRuns: 3, seed: 7};
  const details: RunDetails<[Scheduler]> = await t.scheduler(
    async (s: Scheduler) => {
      const wrapped = s.schedule(Promise.resolve(1));
      await s.waitAll();
      const value: number = await wrapped;
      return value === 1;
    },
    options,
    'typed scheduler'
  );
  t.ok(!details.failed);
});
