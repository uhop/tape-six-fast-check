import test from 'tape-six';
import fc from 'fast-check';

import 'tape-six-fast-check';

const fakeTester = () => {
  const reported = [];
  return {reported, reportAssertion: a => reported.push(a)};
};

test('t.prop: passing property reports one counted assertion', async t => {
  t.plan(2);
  const details = await t.prop(
    [fc.integer(), fc.integer()],
    (a, b) => a + b === b + a,
    'addition commutes'
  );
  t.ok(!details.failed, 'run details report success');
});

test('t.prop: failing property reports a structured counterexample', async t => {
  const fake = fakeTester();
  const details = await t.prop.call(
    fake,
    [fc.integer({min: 1, max: 100})],
    n => n < 50,
    {seed: 42},
    'all values are small'
  );

  t.ok(details.failed, 'run details report failure');
  t.equal(fake.reported.length, 1, 'exactly one aggregate assertion');

  const a = fake.reported[0];
  t.equal(a.ok, false, 'the assertion failed');
  t.equal(a.message, 'all values are small', 'the message is the given name');
  t.equal(a.operator, 'prop', 'operator is prop');
  t.ok(a.marker instanceof Error, 'marker is an Error for source location');
  t.equal(a.expected, true, 'expected is true');
  t.equal(a.actual.seed, 42, 'the forced seed is reported');
  t.deepEqual(a.actual.counterexample, details.counterexample, 'counterexample is structured data');
  t.ok(a.actual.counterexample[0] >= 50, 'the counterexample violates the predicate');
  t.equal(typeof a.actual.path, 'string', 'the replay path is present');
});

test('t.prop: replay via seed + path reproduces the counterexample', async t => {
  const fake = fakeTester();
  const args = [[fc.integer({min: 1, max: 1000})], n => n < 500];
  const first = await t.prop.call(fake, ...args, {seed: 987});
  const replay = await t.prop.call(fake, ...args, {
    seed: first.seed,
    path: first.counterexamplePath,
    endOnFailure: true
  });
  t.ok(first.failed && replay.failed, 'both runs failed');
  t.deepEqual(
    replay.counterexample,
    first.counterexample,
    'replay lands on the same counterexample'
  );
});

test('t.prop: a throwing predicate fails and captures the error', async t => {
  const fake = fakeTester();
  const boom = new Error('boom');
  const details = await t.prop.call(
    fake,
    [fc.integer()],
    () => {
      throw boom;
    },
    {seed: 1}
  );
  t.ok(details.failed, 'the property failed');
  t.equal(fake.reported[0].actual.error, boom, 'the thrown error rides the structured payload');
});

test('t.prop: async predicates are supported', async t => {
  const details = await t.prop(
    [fc.nat({max: 1000})],
    async n => {
      await Promise.resolve();
      return n >= 0;
    },
    {numRuns: 20},
    'async nat is non-negative'
  );
  t.ok(!details.failed, 'async predicate passed');
});

test('t.prop: the message can take the options slot', async t => {
  const fake = fakeTester();
  await t.prop.call(fake, [fc.nat()], n => n >= 0, 'nat is non-negative');
  t.equal(
    fake.reported[0].message,
    'nat is non-negative',
    'message picked up from the options slot'
  );
  t.equal(fake.reported[0].ok, true, 'the assertion passed');
});

test('t.prop: the default message is used when none is given', async t => {
  const fake = fakeTester();
  await t.prop.call(fake, [fc.boolean()], b => b || !b, {numRuns: 5});
  t.equal(fake.reported[0].message, 'property holds', 'default message');
});

test('t.prop: invalid arguments reject with TypeError', async t => {
  await t.rejects(
    t.prop([], () => true),
    TypeError,
    'empty arbitraries array rejects'
  );
  await t.rejects(
    t.prop(fc.nat(), () => true),
    TypeError,
    'non-array arbitraries reject'
  );
  await t.rejects(t.prop([fc.nat()], 42), TypeError, 'non-function predicate rejects');
});
