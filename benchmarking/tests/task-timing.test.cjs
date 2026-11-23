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

test('every published system task defines only start, stop, and limit without timing notes', () => {
  assert.equal(tasks.length, 16);
  for (const task of tasks) {
    assert.deepEqual(Object.keys(task.timing).sort(), ['limit', 'start', 'stop']);
    for (const key of ['start', 'stop', 'limit']) {
      assert.equal(typeof task.timing[key], 'string', task.id + ': ' + key);
      assert(task.timing[key].trim().length > 0, task.id + ': ' + key);
    }
  }
});

test('all task timers start when the start signal is sent, not when movement begins', () => {
  for (const task of tasks) {
    assert(task.timing.start.includes('Complete setup first'), task.id);
    assert(task.timing.start.includes('manipulators stationary'), task.id);
    assert(task.timing.start.includes('Start timing when the start signal is sent.'), task.id);
    assert(!task.timing.start.includes('first task-directed movement'), task.id);
  }
});

test('transfer tasks keep their fixed 60-second counting windows', () => {
  for (const id of ['box-and-blocks', 'use-chopsticks']) {
    const timing = find(id).timing;
    assert.equal(timing.limit, '60 seconds.');
    assert(timing.stop.includes('60 seconds have elapsed'));
    assert(timing.stop.includes('only transfers completed within that period'));
    assert.equal(find(id).metrics[0].name, 'Number of Blocks Transferred');
  }
});

test('peg insertion keeps the three-hour limit and partial peg-count metric', () => {
  const timing = find('peg-in-hole').timing;
  assert.equal(timing.limit, 'Three hours.');
  assert(timing.start.includes('selecting the row and placing the pegs and pegboard'));
  assert(timing.stop.includes('all five pegs'));
  assert(timing.stop.includes('whichever comes first'));
  assert.equal(find('peg-in-hole').metrics[0].name, 'Pegs Inserted');
});

test('previously time-limited completion tasks retain 60-second limits and reject unsuccessful completions', () => {
  for (const task of tasks.filter(task => task.id !== 'spin-a-top' && task.metrics.some(metric => metric.name === 'Total Task Completion Time'))) {
    assert(task.timing.limit.includes('60 seconds'), task.id);
    assert(task.timing.limit.includes('unsuccessful trial, not a completion time'), task.id);
  }
});

test('required grasp and orientation holds verify success without adding to completion time', () => {
  for (const [id, seconds] of [['pick-up-flat-object', 3], ['in-hand-object-reorientation', 2]]) {
    const timing = find(id).timing;
    assert(timing.stop.includes('subsequent ' + seconds + '-second hold succeeds'));
    assert(timing.stop.includes('hold is not included in completion time'));
    assert(timing.limit.includes(seconds + '-second verification hold is untimed'));
    assert(timing.stop.includes('later successful hold, measured from the original start signal'));
    assert(!timing.limit.includes('including the ' + seconds + '-second hold'));
  }
  assert(find('pick-up-flat-object').timing.stop.includes('reaches the required height and becomes stationary'));
  assert(find('in-hand-object-reorientation').timing.stop.includes('reaches the target orientation tolerance'));
});

test('dowel retention is checked for three seconds after the timed release', () => {
  const task = find('bundle-dowels-with-rubber-band');
  assert(task.timing.stop.includes('released onto the table'));
  assert(task.timing.stop.includes('all seven dowels remain secured for 3 seconds'));
  assert(task.timing.stop.includes('check is not included in completion time'));
  assert(task.procedures.some(step => step.includes('at least 3 seconds after')));
});

test('tool tasks stop at their existing task endpoints, not tool put-down', () => {
  assert(find('thread-screw-with-screwdriver').timing.stop.includes('fully seated'));
  assert(find('thread-screw-with-screwdriver').timing.stop.includes('disengaged'));
  assert(!/put down|setting.*down/.test(find('thread-screw-with-screwdriver').timing.stop));
  assert(find('cut-pattern-with-scissors').timing.stop.includes('completely separated'));
  assert(!/put down|setting.*down/.test(find('cut-pattern-with-scissors').timing.stop));
});

test('blind retrieval starts after setup and ends after the correct target is released', () => {
  const timing = find('extract-object-from-opaque-bag').timing;
  assert(timing.start.includes('including randomization'));
  assert(timing.stop.includes('placed on the table and released'));
  assert(timing.start.includes('identifying the target to the manipulator'));
  assert(timing.stop.includes('without first removing a distractor'));
});

test('the top reports signal-to-release completion time and verifies the five-second spin afterward', () => {
  const task = find('spin-a-top');
  const timing = task.timing;
  assert(timing.start.includes('Start timing when the start signal is sent.'));
  assert(timing.stop.includes('Stop when the top is released to spin freely'));
  assert(timing.stop.includes('at least 5 seconds without further manipulator contact'));
  assert(timing.stop.includes('verification period is not included in completion time'));
  assert(timing.limit.includes('No overall trial time limit is specified'));
  assert(timing.limit.includes('no need to wait for a successful top to stop spinning'));
  assert.equal(task.metrics[0].name, 'Total Task Completion Time');
  assert(task.metrics[0].description.includes('excluding the subsequent 5-second verification period'));
  assert(task.procedures.some(step => step.includes('at least 5 seconds after release')));
});

test('the metrics index matches the top completion-time metric and all other system metrics', () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, 'data/hand-metrics.jsonc'), 'utf8'));
  const metrics = index.categories.find(category => category.title === 'System').sections
    .flatMap(section => section.benchmarks || []);
  assert(!metrics.some(metric => metric.name === 'Spin Duration'));
  assert(metrics.find(metric => metric.name === 'Total Task Completion Time').description.includes('Spin a Top'));
  for (const task of tasks) {
    for (const metric of task.metrics) {
      assert(metrics.some(entry => entry.name === metric.name), task.id + ': ' + metric.name);
    }
  }
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
    for (const label of ['Start', 'Stop', 'Time limit']) {
      assert(html.includes('<strong>' + label + ':</strong>'), task.id);
    }
    assert(html.includes(task.timing.start), task.id);
    assert(html.includes(task.timing.stop), task.id);
    assert(!html.includes('<strong>Notes:</strong>'), task.id);
  }
});

test('the renderer ignores legacy timing notes', () => {
  context.populateTiming({ ...find('paper-folding').timing, notes: 'Legacy timing note' });
  const html = elements['benchmark-timing'].innerHTML;
  assert(!html.includes('Notes:'));
  assert(!html.includes('Legacy timing note'));
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
