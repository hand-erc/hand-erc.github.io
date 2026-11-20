const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const tasks = JSON.parse(fs.readFileSync(path.join(root, 'data/system.jsonc'), 'utf8'))
  .sections.flatMap(section => section.benchmarks || []).filter(task => !task._hidden);
const find = id => tasks.find(task => task.id === id);

const elements = {
  'timing-section': { style: { display: 'none' } },
  'benchmark-timing': { innerHTML: '' }
};
const context = {
  document: {
    addEventListener() {},
    getElementById(id) { return elements[id]; },
    createElement(tag) {
      assert.equal(tag, 'div');
      let text = '';
      return {
        set textContent(value) { text = String(value); },
        get innerHTML() {
          return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
      };
    }
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'static/js/benchmark-detail.js'), 'utf8'), context);

test('every published system task defines start, stop, limit, and timing notes', () => {
  assert.equal(tasks.length, 16);
  for (const task of tasks) {
    for (const key of ['start', 'stop', 'limit', 'notes']) {
      assert.equal(typeof task.timing[key], 'string', task.id + ': ' + key);
      assert(task.timing[key].trim().length > 0, task.id + ': ' + key);
    }
  }
});

test('task timing excludes setup and starts from stationary hands at first task-directed movement', () => {
  for (const task of tasks.filter(task => task.id !== 'spin-a-top')) {
    assert(task.timing.start.includes('Complete setup first'), task.id);
    assert(task.timing.start.includes('manipulators stationary'), task.id);
    assert(task.timing.start.includes('first task-directed movement after the start signal'), task.id);
  }
});

test('transfer tasks keep their fixed 60-second counting windows', () => {
  for (const id of ['box-and-blocks', 'use-chopsticks']) {
    const timing = find(id).timing;
    assert.equal(timing.limit, '60 seconds.');
    assert(timing.stop.includes('60 seconds have elapsed'));
    assert(timing.stop.includes('only transfers completed within that period'));
    assert(timing.notes.includes('number of blocks transferred, not completion time'));
  }
});

test('peg insertion keeps the three-hour limit and partial peg-count metric', () => {
  const timing = find('peg-in-hole').timing;
  assert.equal(timing.limit, 'Three hours.');
  assert(timing.start.includes('selecting the row and placing the pegs and pegboard'));
  assert(timing.stop.includes('all five pegs'));
  assert(timing.stop.includes('whichever comes first'));
  assert(timing.notes.includes('number of pegs successfully inserted'));
});

test('completion-time tasks keep the 60-second limit and do not report failures as completions', () => {
  for (const task of tasks.filter(task => task.metrics.some(metric => metric.name === 'Total Task Completion Time'))) {
    assert(task.timing.limit.includes('60 seconds'), task.id);
    assert(task.timing.limit.includes('unsuccessful trial, not a completion time'), task.id);
    assert(task.timing.notes.includes('starting position are not timed') ||
      task.timing.notes.includes('starting position is not timed'), task.id);
  }
});

test('required in-hand holds are included in completion time', () => {
  for (const [id, seconds] of [['pick-up-flat-object', 3], ['in-hand-object-reorientation', 2]]) {
    const timing = find(id).timing;
    assert(timing.stop.includes(seconds + ' continuous seconds'));
    assert(timing.limit.includes('including the ' + seconds + '-second hold'));
    assert(timing.notes.includes('remains grasped'));
  }
});

test('dowel retention is checked for three seconds after the timed release', () => {
  const task = find('bundle-dowels-with-rubber-band');
  assert(task.timing.stop.includes('released onto the table'));
  assert(task.timing.notes.includes('3-second post-release stability check is not included in completion time'));
  assert(task.timing.notes.includes('all seven dowels remain secured'));
  assert(task.procedures.some(step => step.includes('at least 3 seconds after')));
});

test('tool tasks stop at their existing task endpoints, not tool put-down', () => {
  assert(find('thread-screw-with-screwdriver').timing.stop.includes('fully seated'));
  assert(find('thread-screw-with-screwdriver').timing.stop.includes('disengaged'));
  assert(find('thread-screw-with-screwdriver').timing.notes.includes('setting the screwdriver down afterward'));
  assert(find('cut-pattern-with-scissors').timing.stop.includes('completely separated'));
  assert(find('cut-pattern-with-scissors').timing.notes.includes('Inspect cutting accuracy afterward'));
});

test('blind retrieval includes tactile search, but excludes randomization', () => {
  const timing = find('extract-object-from-opaque-bag').timing;
  assert(timing.start.includes('including randomization'));
  assert(timing.stop.includes('placed on the table and released'));
  assert(timing.notes.includes('All tactile searching and retrieval are timed'));
  assert(timing.notes.includes('post-trial inspection'));
});

test('the top retains its release-based spin-duration metric and five-second success criterion', () => {
  const timing = find('spin-a-top').timing;
  assert(timing.start.includes('spin-duration timer when the manipulator releases the top'));
  assert(timing.stop.includes('first contact'));
  assert(timing.stop.includes('other than its bottom tip'));
  assert(timing.limit.includes('No overall trial time limit is specified'));
  assert(timing.limit.includes('at least 5 seconds'));
  assert(timing.notes.includes('spin duration, not completion time'));
});

test('the Timing section is between Setup and Procedure, leaving configuration images immediately after Procedure', () => {
  const html = fs.readFileSync(path.join(root, 'benchmark.html'), 'utf8');
  assert(html.indexOf('id="setup-section"') < html.indexOf('id="timing-section"'));
  assert(html.indexOf('id="timing-section"') < html.indexOf('id="benchmark-procedures"'));
  assert(html.indexOf('id="benchmark-procedures"') < html.indexOf('id="configurations-section"'));
  assert(html.includes('aria-labelledby="timing-title"'));
  assert(html.includes('id="timing-title">Timing</h2>'));
});

test('the detail renderer displays all timing fields for every system task', () => {
  for (const task of tasks) {
    context.populateTiming(task.timing);
    assert.equal(elements['timing-section'].style.display, '');
    const html = elements['benchmark-timing'].innerHTML;
    for (const label of ['Start', 'Stop', 'Time limit', 'Notes']) {
      assert(html.includes('<strong>' + label + ':</strong>'), task.id);
    }
    assert(html.includes(task.timing.start), task.id);
    assert(html.includes(task.timing.stop), task.id);
  }
});

test('the detail renderer hides and clears timing for benchmarks without timing data', () => {
  for (const missing of [undefined, null, {}, { start: ' ' }]) {
    context.populateTiming(find('paper-folding').timing);
    context.populateTiming(missing);
    assert.equal(elements['timing-section'].style.display, 'none');
    assert.equal(elements['benchmark-timing'].innerHTML, '');
  }
});

test('timing text is escaped before rendering', () => {
  context.populateTiming({ start: '<script>alert("test")</script> & text' });
  const html = elements['benchmark-timing'].innerHTML;
  assert(html.includes('&lt;script&gt;'));
  assert(html.includes('&amp; text'));
  assert(!html.includes('<script>'));
});
