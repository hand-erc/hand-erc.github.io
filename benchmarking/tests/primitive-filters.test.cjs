const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const context = { document: { addEventListener() {} } };
vm.createContext(context);
for (const script of ['primitives.js', 'benchmarks.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'static/js', script), 'utf8'), context);
}
const tasks = JSON.parse(fs.readFileSync(path.join(root, 'data/system.jsonc'), 'utf8'))
  .sections.flatMap(section => section.benchmarks || []).filter(task => !task._hidden);

function matchingIds(selections) {
  return tasks.filter(task => context.matchesPrimitiveFilters(task, selections)).map(task => task.id).sort();
}

test('no selections returns every visible system task', () => {
  assert.deepEqual(matchingIds({}), tasks.map(task => task.id).sort());
});

test('indirect manipulation includes all tool-use subtypes', () => {
  assert.deepEqual(matchingIds({ manipulation: ['Indirect'] }), [
    'cut-pattern-with-scissors', 'thread-screw-with-screwdriver', 'use-chopsticks'
  ]);
});

test('multiple values within one primitive are alternatives', () => {
  assert.deepEqual(matchingIds({ manipulation: ['Direct', 'Indirect'] }), matchingIds({}));
  assert.deepEqual(matchingIds({ constraintComplexity: ['Low', 'Moderate'], motionRegime: ['Dynamic'] }), ['spin-a-top']);
});

test('different primitives combine, including values with explanatory suffixes', () => {
  assert.deepEqual(matchingIds({ manipulation: ['Direct'], controlledDegreesOfFreedom: ['High'] }), [
    'bundle-dowels-with-rubber-band', 'bundle-socks', 'in-hand-object-reorientation', 'paper-folding', 'tie-a-knot'
  ]);
});

test('rigidity matches the full environment value', () => {
  assert.deepEqual(matchingIds({ rigidity: ['Rigid manipulandum / environment not engaged'] }), ['in-hand-object-reorientation']);
  assert.deepEqual(matchingIds({ rigidity: ['Mixed manipulanda / rigid environment'], constraintComplexity: ['High'] }), [
    'bundle-dowels-with-rubber-band', 'fasten-unfasten-button', 'zip-unzip-zipper'
  ]);
});

test('relative size combines with physical constraints', () => {
  assert.deepEqual(matchingIds({ relativeSize: ['Comparable to the hand'], constraintComplexity: ['High'] }), [
    'in-hand-object-reorientation', 'peg-in-hole', 'twist-lid-on-jar'
  ]);
});

test('constraint change matches the level despite task-specific wording', () => {
  assert.deepEqual(matchingIds({ constraintChange: ['Moderate'], motionRegime: ['Dynamic'] }), ['spin-a-top']);
});

test('unrepresented values and incompatible combinations produce no results', () => {
  assert.deepEqual(matchingIds({ constraintChange: ['Low'] }), []);
  assert.deepEqual(matchingIds({ manipulation: ['Indirect'], motionRegime: ['Dynamic'] }), []);
});

test('a task missing a selected primitive does not match', () => {
  assert.equal(context.matchesPrimitiveFilters({ primitiveProfile: {} }, { motionRegime: ['Dynamic'] }), false);
});

test('controls offer only the seven original primitives and their colored values', () => {
  const html = context.createPrimitiveFilters();
  assert.equal((html.match(/<fieldset/g) || []).length, 7);
  assert.equal((html.match(/aria-pressed="false"/g) || []).length, 21);
  assert(!/observability|dynamicEnvironment|irreversibility/.test(html));
});
