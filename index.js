// @ts-self-types="./index.d.ts"

import fc from 'fast-check';
import {registerTesterMethod} from 'tape-six/Tester.js';

// the options slot can hold the message: t.prop(arbs, predicate, 'msg')
const splitTail = (options, msg) =>
  typeof options == 'string' && msg === undefined ? [{}, options] : [options || {}, msg];

const runChecked = async (tester, property, params, msg, marker, operator) => {
  const details = await fc.check(property, params);
  const assertion = {ok: !details.failed, message: msg, marker, operator};
  if (details.failed) {
    assertion.expected = true;
    // structured run details only — never parsed from fc's report text
    assertion.actual = {
      counterexample: details.counterexample,
      seed: details.seed,
      path: details.counterexamplePath,
      numRuns: details.numRuns,
      numShrinks: details.numShrinks,
      error: details.errorInstance
    };
  }
  tester.reportAssertion(assertion);
  return details;
};

async function prop(arbitraries, predicate, options, msg) {
  if (!Array.isArray(arbitraries) || !arbitraries.length)
    throw new TypeError('t.prop: arbitraries must be a non-empty array');
  if (typeof predicate != 'function') throw new TypeError('t.prop: predicate must be a function');
  const [params, message] = splitTail(options, msg);
  return runChecked(
    this,
    // async wrapper: accepts sync and async predicates alike
    // @ts-expect-error TS2556 — a variable-length array can't satisfy the tuple-rest signature
    fc.asyncProperty(...arbitraries, async (...values) => predicate(...values)),
    params,
    message || 'property holds',
    new Error(), // created here → stackList[1] (default markerIndex) is the caller
    'prop'
  );
}

async function schedulerMethod(body, options, msg) {
  if (typeof body != 'function') throw new TypeError('t.scheduler: body must be a function');
  const [{act, ...params}, message] = splitTail(options, msg);
  return runChecked(
    this,
    fc.asyncProperty(fc.scheduler(act && {act}), async s => body(s)),
    params,
    message || 'scheduled property holds',
    new Error(),
    'scheduler'
  );
}

registerTesterMethod('prop', prop);
registerTesterMethod('scheduler', schedulerMethod);
