import test from 'tape-six';

import 'tape-six-fast-check';

const fakeTester = () => {
  const reported = [];
  return {reported, reportAssertion: a => reported.push(a)};
};

test('t.scheduler: scheduled tasks drain and complete', async t => {
  t.plan(2);
  const details = await t.scheduler(
    async s => {
      const log = [];
      s.schedule(Promise.resolve('a')).then(v => log.push(v));
      s.schedule(Promise.resolve('b')).then(v => log.push(v));
      await s.waitAll();
      return log.length === 2;
    },
    {numRuns: 10},
    'both tasks complete'
  );
  t.ok(!details.failed, 'run details report success');
});

test('t.scheduler: finds an order-dependent bug', async t => {
  const fake = fakeTester();
  const details = await t.scheduler.call(
    fake,
    async s => {
      let value = null;
      s.schedule(Promise.resolve()).then(() => (value = 'first'));
      s.schedule(Promise.resolve()).then(() => (value = 'second'));
      await s.waitAll();
      return value === 'second'; // holds only under one of the two interleavings
    },
    {seed: 5, numRuns: 50}
  );
  t.ok(details.failed, 'the interleaving bug was found');
  t.equal(fake.reported.length, 1, 'exactly one aggregate assertion');
  t.equal(fake.reported[0].ok, false, 'the assertion failed');
  t.equal(fake.reported[0].operator, 'scheduler', 'operator is scheduler');
  t.equal(fake.reported[0].actual.seed, 5, 'the forced seed is reported');
});

test('t.scheduler: the message can take the options slot', async t => {
  const fake = fakeTester();
  await t.scheduler.call(
    fake,
    async s => {
      await s.waitAll();
    },
    'drains an empty scheduler'
  );
  t.equal(fake.reported[0].message, 'drains an empty scheduler', 'message picked up');
  t.equal(fake.reported[0].ok, true, 'the assertion passed');
});

test('t.scheduler: the default message is used when none is given', async t => {
  const fake = fakeTester();
  await t.scheduler.call(fake, async s => s.waitAll(), {numRuns: 3});
  t.equal(fake.reported[0].message, 'scheduled property holds', 'default message');
});

test('t.scheduler: invalid arguments reject with TypeError', async t => {
  await t.rejects(t.scheduler(42), TypeError, 'non-function body rejects');
});
