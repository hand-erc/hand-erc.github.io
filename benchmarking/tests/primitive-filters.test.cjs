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
    'bundle-dowels-with-rubber-band', 'bundle-socks', 'paper-folding', 'tie-a-knot'
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
    'bundle-socks', 'in-hand-object-reorientation', 'peg-in-hole', 'twist-lid-on-jar'
  ]);
});

test('constraint change matches the level despite task-specific wording', () => {
  assert.deepEqual(matchingIds({ constraintChange: ['Moderate'], motionRegime: ['Dynamic'] }), ['spin-a-top']);
});

test('low constraint change is represented and incompatible combinations produce no results', () => {
  assert.deepEqual(matchingIds({ constraintChange: ['Low'] }), ['paper-folding']);
  assert.deepEqual(matchingIds({ manipulation: ['Indirect'], motionRegime: ['Dynamic'] }), []);
});

test('in-hand reorientation separates object DoF from contact complexity and change', () => {
  assert.deepEqual(matchingIds({ controlledDegreesOfFreedom: ['Low'], constraintComplexity: ['High'],
    constraintChange: ['High'], rigidity: ['Rigid manipulandum / environment not engaged'] }), ['in-hand-object-reorientation']);
});

test('revised profile cards and task tags use the shared value colors', () => {
  const profile = tasks.find(task => task.id === 'in-hand-object-reorientation').primitiveProfile;
  const definitions = context.getPrimitiveDefinitions();
  for (const [key, level, tone] of [
    ['controlledDegreesOfFreedom', 'Low', 'blue'],
    ['constraintComplexity', 'High', 'purple'],
    ['constraintChange', 'High', 'purple']
  ]) {
    const definition = definitions.find(primitive => primitive.key === key);
    const card = context.createPrimitiveProfileCard(definition, profile[key]);
    assert(card.includes('primitive-tone-' + tone));
    assert(card.includes('data-primitive="' + key + '" data-value="' + level + '"'));
    assert(context.getPrimitiveTagsHTML(profile).includes('data-primitive="' + key + '" data-value="' + level + '"'));
  }
});

test('deformable task constraint ratings follow the revised justifications', () => {
  assert.deepEqual(matchingIds({ rigidity: ['Deformable manipulanda / rigid environment'],
    constraintComplexity: ['High'], constraintChange: ['High'] }), ['bundle-socks', 'tie-a-knot']);
  assert.deepEqual(matchingIds({ controlledDegreesOfFreedom: ['High'], constraintComplexity: ['Low'],
    constraintChange: ['Low'] }), ['paper-folding']);
});

test('configuration images use placeholders instead of former stock references', () => {
  for (const id of ['peg-in-hole', 'in-hand-object-reorientation']) {
    assert(tasks.find(task => task.id === id).configurationImages.every(image => image.src.endsWith('/placeholder.svg')));
  }
});

test('zipper configurations follow the open, closed, reopened procedure', () => {
  const zipper = tasks.find(task => task.id === 'zip-unzip-zipper');
  assert(zipper.setup.some(step => step.includes('zipper fully open')));
  assert(zipper.configurationImages[0].alt.includes('Fully open'));
  assert(zipper.configurationImages[1].alt.includes('closed'));
  assert(zipper.configurationImages[2].alt.includes('fully reopened'));
});

test('screw task uses a seated reference for preparation and completion', () => {
  const screw = tasks.find(task => task.id === 'thread-screw-with-screwdriver');
  const seatedStep = screw.setup.findIndex(step => step.includes('fully seated'));
  const backedOutStep = screw.setup.findIndex(step => step.includes('Back the screw out exactly three complete turns'));
  assert(seatedStep >= 0 && backedOutStep > seatedStep);
  assert(screw.setup[backedOutStep].includes('before each trial'));
  assert(screw.procedures.some(step => step.includes('rotate the screw') && step.includes('flush against the mounting block')));
  assert(screw.procedures.at(-1).includes('fully seated'));
  assert(screw.procedures.at(-1).includes('screwdriver has been disengaged'));
  assert(!/three rotations|four complete rotations|additional three turns/.test(screw.description + screw.procedures.join(' ')));
});

test('photographed tasks reference their starting and ending images in the instructions', () => {
  const photographedTasks = tasks.filter(task => !task.configurationImages.every(image => image.src.endsWith('/placeholder.svg')));
  assert.equal(photographedTasks.length, 14);
  for (const task of photographedTasks) {
    assert(task.setup.some(step => step.includes('Starting configuration image')), task.id + ' setup');
    assert(task.procedures.some(step => step.includes('Ending configuration image')), task.id + ' procedure');
    for (const image of task.configurationImages.slice(1, -1)) {
      assert(task.procedures.some(step => step.includes(image.caption + ' image')), task.id + ' intermediate image');
    }
    for (const image of task.configurationImages) {
      assert(fs.existsSync(path.join(root, image.src)), task.id + ' image exists');
    }
  }
});

test('placeholder images are not treated as instructional references', () => {
  for (const id of ['peg-in-hole', 'in-hand-object-reorientation']) {
    const task = tasks.find(task => task.id === id);
    assert(!/image|photo/i.test(task.setup.concat(task.procedures).join(' ')));
  }
});

test('image references retain task criteria and clarify illustrative states', () => {
  const find = id => tasks.find(task => task.id === id);
  const top = find('spin-a-top');
  assert(top.setup.some(step => step.includes('resting position')));
  assert(top.procedures.some(step => step.includes('not the successful spinning state')));
  assert(top.procedures.some(step => step.includes('at least 5 seconds')));
  const screw = find('thread-screw-with-screwdriver');
  assert(screw.setup.some(step => step.includes("mounting block's threaded seating surface")));
  const scissors = find('cut-pattern-with-scissors');
  assert(scissors.procedures.some(step => step.includes('access cut is excluded from this tolerance')));
  const washer = find('pick-up-flat-object');
  assert(washer.procedures.some(step => step.includes('at least 2 cm')));
  assert(washer.procedures.some(step => step.includes('at least 3 seconds')));
  assert(!washer.procedures.some(step => step.includes('target region')));
  const retrieval = find('extract-object-from-opaque-bag');
  assert(retrieval.setup.some(step => step.includes('visual feedback is not permitted')));
  assert(retrieval.procedures.some(step => step.includes('not a required target')));
  const socks = find('bundle-socks');
  assert(socks.setup.some(step => step.includes('side by side')));
  assert(!socks.setup.some(step => step.includes('touching each other')));
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

test('primitive tags consistently use lowercase words, preserving the DoF acronym', () => {
  for (const primitive of context.getPrimitiveDefinitions()) {
    for (const value of primitive.values) {
      const words = value.tag.replace(/\bDoF\b/g, 'dof');
      assert.equal(words, words.toLowerCase(), primitive.key + ': ' + value.tag);
    }
  }
});

test('the guide, filters, task cards, and justification cards share compact rigidity tags', () => {
  const rigidity = context.getPrimitiveDefinitions().find(primitive => primitive.key === 'rigidity');
  assert.deepEqual(Array.from(rigidity.values, value => value.tag), [
    'rigid obj/rigid env', 'deformable obj/rigid env', 'mixed obj/rigid env', 'rigid obj/no env contact'
  ]);
  const guide = context.createPrimitiveGuide();
  const filters = context.createPrimitiveFilters();
  for (const value of rigidity.values) {
    const label = '>' + value.tag + '<';
    assert(guide.includes(label));
    assert(filters.includes(label));
    const task = tasks.find(task => task.primitiveProfile.rigidity === value.value);
    assert(task, value.value);
    assert(context.getPrimitiveTagsHTML(task.primitiveProfile).includes(label));
    assert(context.createPrimitiveProfileCard(rigidity, value.value).includes(label));
  }
});

test('moderate DoF describes the additional motion or deformation that must be controlled', () => {
  const dof = context.getPrimitiveDefinitions().find(primitive => primitive.key === 'controlledDegreesOfFreedom');
  const moderate = dof.values.find(value => value.value === 'Moderate');
  assert.equal(moderate.description, 'Object motion must be coordinated with limited movement of other components or local deformation.');
  assert(!/guided mechanisms|restricted to a fixed path/i.test(moderate.description));
  assert(context.createPrimitiveGuide().includes(moderate.description));
  assert(context.createPrimitiveFilters().includes(moderate.description));
});
