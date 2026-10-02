/**
 * Shared primitive definitions, value labels, and colors for the system guide,
 * benchmark cards, and task justifications. Ratings are qualitative.
 */
const primitiveDefinitions = [
  {
    key: 'manipulation', label: 'Manipulation',
    description: 'How the hand acts on the task object.',
    values: [
      { value: 'Direct', tag: 'Direct', tone: 'blue', description: 'The hand manipulates the task object directly.' },
      { value: 'Indirect', tag: 'Indirect / tool use', tone: 'purple', description: 'The hand acts on the task object through one or more tools.' }
    ]
  },
  {
    key: 'rigidity', label: 'Rigidity',
    description: 'Whether the manipulated objects (manipulanda) and the environment deform during interaction.',
    values: [
      { value: 'Rigid manipulanda / rigid environment', tag: 'Rigid / rigid environment', tone: 'blue', description: 'The manipulated objects and active environment are rigid.' },
      { value: 'Deformable manipulanda / rigid environment', tag: 'Deformable / rigid environment', tone: 'teal', description: 'The manipulated objects deform against a rigid environment.' },
      { value: 'Mixed manipulanda / rigid environment', tag: 'Mixed rigidity / rigid environment', tone: 'purple', description: 'Rigid and deformable objects are manipulated in a rigid environment.' },
      { value: 'Rigid manipulandum / environment not engaged', tag: 'Rigid / environment not engaged', tone: 'slate', description: 'A rigid object is manipulated without using environmental contact.' }
    ]
  },
  {
    key: 'relativeSize', label: 'Size relative to hand',
    description: 'The size of the relevant manipulated objects compared with the hand.',
    values: [
      { value: 'Smaller than the hand', tag: 'Smaller than hand', tone: 'blue', description: 'The relevant object is smaller than the hand.' },
      { value: 'Comparable to the hand', tag: 'Comparable to hand', tone: 'teal', description: 'The relevant object is approximately the size of the hand.' },
      { value: 'Larger than the hand', tag: 'Larger than hand', tone: 'purple', description: 'The relevant object is larger than the hand.' },
      { value: 'Mixed relative to the hand', tag: 'Mixed sizes', tone: 'amber', description: 'Different objects, or dimensions of one object, span multiple size categories.' }
    ]
  },
  {
    key: 'controlledDegreesOfFreedom', label: 'Controlled degrees of freedom',
    description: 'How much independent motion or deformation must be coordinated, including object pose, multiple objects, finger coordination, and deformability. The levels describe qualitative coordination demands.',
    values: [
      { value: 'Low', tag: 'Low DoF', tone: 'blue', description: 'One rigid object is controlled at a time.' },
      { value: 'Moderate', tag: 'Moderate DoF', tone: 'amber', description: 'Coupled rigid bodies or localized, guided deformation must be coordinated.' },
      { value: 'High', tag: 'High DoF', tone: 'purple', description: 'Several bodies, distributed deformation, or substantial coordination of multiple contacts must be controlled.' }
    ]
  },
  {
    key: 'constraintComplexity', label: 'Constraint complexity',
    description: 'How restrictive the simultaneous interaction constraints are: access, alignment, tolerances, contact geometry, and force or impedance requirements.',
    values: [
      { value: 'Low', tag: 'Low constraints', tone: 'blue', description: 'Few loose constraints, without tight mating or substantial force regulation.' },
      { value: 'Moderate', tag: 'Moderate constraints', tone: 'amber', description: 'Restricted paths, pose tolerances, clutter, or limited force regulation.' },
      { value: 'High', tag: 'High constraints', tone: 'purple', description: 'Tight mating, severe grasp-access restrictions, topology, or demanding coordination of contact forces.' }
    ]
  },
  {
    key: 'constraintChange', label: 'Constraint change',
    description: 'How the active contact set changes as contacts are established, broken, or reorganized during the task.',
    values: [
      { value: 'Low', tag: 'Low constraint change', tone: 'blue', description: 'The contact arrangement remains effectively constant.' },
      { value: 'Moderate', tag: 'Moderate constraint change', tone: 'amber', description: 'A limited set of transitions occurs, or the same grasp, transport, and release cycle repeats.' },
      { value: 'High', tag: 'High constraint change', tone: 'purple', description: 'Progressive or qualitatively different contact modes occur, such as insertion, threading, cutting, wrapping, or exploration.' }
    ]
  },
  {
    key: 'motionRegime', label: 'Motion regime',
    description: 'Whether success requires deliberately generating or exploiting object dynamics.',
    values: [
      { value: 'Quasistatic', tag: 'Quasistatic', tone: 'blue', description: 'Success does not depend on momentum or other dynamic effects, even if the task is performed quickly.' },
      { value: 'Dynamic', tag: 'Dynamic', tone: 'purple', description: 'Success depends on deliberately generating or exploiting dynamics, such as spinning a top.' }
    ]
  }
];

function getPrimitiveDefinitions() {
  return primitiveDefinitions;
}

function escapePrimitiveHTML(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getPrimitiveValue(primitive, rawValue) {
  const value = String(rawValue || '').split(' — ')[0];
  return primitive.values.find(function (entry) { return entry.value === value; });
}

function renderPrimitiveTag(primitive, value, label) {
  return '<span class="primitive-tag primitive-tone-' + value.tone + '"' +
    ' data-primitive="' + primitive.key + '" data-value="' + escapePrimitiveHTML(value.value) + '"' +
    ' title="' + escapePrimitiveHTML(primitive.label + ': ' + value.value) + '">' +
    escapePrimitiveHTML(label || value.tag) + '</span>';
}

function getPrimitiveTagsHTML(profile) {
  if (!profile) return '';
  return primitiveDefinitions.map(function (primitive) {
    const value = getPrimitiveValue(primitive, profile[primitive.key]);
    return value ? renderPrimitiveTag(primitive, value) : '';
  }).join('');
}

function createPrimitiveGuide() {
  const definitionsHTML = primitiveDefinitions.map(function (primitive) {
    return '<article class="primitive-guide-card">' +
      '<h4 class="title is-5">' + escapePrimitiveHTML(primitive.label) + '</h4>' +
      '<p>' + escapePrimitiveHTML(primitive.description) + '</p>' +
      '<ul class="primitive-guide-values">' + primitive.values.map(function (value) {
        return '<li>' + renderPrimitiveTag(primitive, value) +
          '<span>' + escapePrimitiveHTML(value.description) + '</span></li>';
      }).join('') + '</ul></article>';
  }).join('');

  return '<section class="benchmark-section primitive-guide" id="system-primitives" aria-labelledby="primitive-guide-title">' +
    '<h3 class="title is-4 section-divider" id="primitive-guide-title">Manipulation primitives</h3>' +
    '<p class="section-description">Each task is described by the seven primitives below. The colored labels are used in the task cards and justification profiles. ' +
      'For graded primitives, blue means Low, amber means Moderate, and purple means High. ' +
      'Each rating describes the task’s demands along that primitive. Categorical values use the colors shown in their entries.</p>' +
    '<div class="primitive-guide-grid">' + definitionsHTML + '</div></section>';
}

function createPrimitiveProfileCard(primitive, rawValue) {
  const value = getPrimitiveValue(primitive, rawValue);
  const explanation = String(rawValue || '').split(' — ').slice(1).join(' — ');
  return '<article class="primitive-profile-card' + (value ? ' primitive-tone-' + value.tone : '') + '">' +
    '<span class="primitive-profile-label">' + escapePrimitiveHTML(primitive.label) + '</span>' +
    (value ? renderPrimitiveTag(primitive, value, value.value) : '<span class="primitive-profile-value">Not specified</span>') +
    (explanation ? '<span class="primitive-profile-value">' + escapePrimitiveHTML(explanation) + '</span>' : '') +
    '</article>';
}
