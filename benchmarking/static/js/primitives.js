/**
 * Shared primitive definitions, value labels, and colors for the system guide,
 * benchmark cards, and task justifications. Ratings are qualitative.
 */
const primitiveDefinitions = [
  {
    key: 'manipulation', label: 'Manipulation',
    description: 'How the hand produces the task’s main effect on the object, such as moving, fastening, or cutting it.',
    values: [
      { value: 'Direct', tag: 'direct', tone: 'blue', description: 'The hand acts directly on the task object.' },
      { value: 'Indirect', tag: 'indirect / tool use', tone: 'purple', description: 'Tools transmit the hand’s action to the task object.' }
    ]
  },
  {
    key: 'rigidity', label: 'Rigidity',
    description: 'Whether the handled objects and tools (manipulanda) deform under task forces, and whether external supports or fixtures are rigid. Fabric, rope, and elastic fasteners count as deformable manipulanda.',
    values: [
      { value: 'Rigid manipulanda / rigid environment', tag: 'rigid obj/rigid env', tone: 'blue', description: 'Rigid objects and tools interact with rigid supports or fixtures.' },
      { value: 'Deformable manipulanda / rigid environment', tag: 'deformable obj/rigid env', tone: 'teal', description: 'Deformable objects are handled using rigid supports or fixtures.' },
      { value: 'Mixed manipulanda / rigid environment', tag: 'mixed obj/rigid env', tone: 'purple', description: 'Rigid and deformable components are handled together in a rigid environment.' },
      { value: 'Rigid manipulandum / environment not engaged', tag: 'rigid obj/no env contact', tone: 'slate', description: 'A rigid object is manipulated within the hand without environmental contact.' }
    ]
  },
  {
    key: 'relativeSize', label: 'Size relative to hand',
    description: 'The size of the objects, tools, or local components actively handled, compared with the hand. Fixed boards and supports are excluded. Sheets are compared by their planar extent; ropes and dowels by both length and graspable cross-section.',
    values: [
      { value: 'Smaller than the hand', tag: 'smaller than hand', tone: 'blue', description: 'The main handled object or component is smaller than the hand.' },
      { value: 'Comparable to the hand', tag: 'comparable to hand', tone: 'teal', description: 'The handled object is approximately the size of the hand.' },
      { value: 'Larger than the hand', tag: 'larger than hand', tone: 'purple', description: 'The handled object extends beyond the hand’s size.' },
      { value: 'Mixed relative to the hand', tag: 'mixed sizes', tone: 'amber', description: 'Handled components or relevant dimensions span multiple size categories.' }
    ]
  },
  {
    key: 'controlledDegreesOfFreedom', label: 'Controlled degrees of freedom',
    description: 'How much independent motion or deformation of the manipulanda must be controlled, accounting for the number of objects and fixture guidance. Finger-contact coordination is reflected in the constraint primitives.',
    values: [
      { value: 'Low', tag: 'low DoF', tone: 'blue', description: 'One rigid object is controlled at a time.' },
      { value: 'Moderate', tag: 'moderate DoF', tone: 'amber', description: 'Object motion must be coordinated with limited movement of other components or local deformation.' },
      { value: 'High', tag: 'high DoF', tone: 'purple', description: 'Multiple independently controlled components or distributed deformation require substantial coordination.' }
    ]
  },
  {
    key: 'constraintComplexity', label: 'Constraint complexity',
    description: 'How restrictive the simultaneously active physical constraints are: access, alignment, tolerances, contact geometry, and force or impedance requirements. Ratings reflect the task’s most restrictive required interaction.',
    values: [
      { value: 'Low', tag: 'low constraints', tone: 'blue', description: 'Few simultaneous constraints leave broad freedom in grasp and motion.' },
      { value: 'Moderate', tag: 'moderate constraints', tone: 'amber', description: 'Alignment, confinement, or contact-force requirements allow several feasible manipulation strategies.' },
      { value: 'High', tag: 'high constraints', tone: 'purple', description: 'Restrictive geometry, topology, or coupled contact modes and forces strongly constrain manipulation.' }
    ]
  },
  {
    key: 'constraintChange', label: 'Constraint change',
    description: 'How the active contact set and resulting motion restrictions change during the task. The rating considers the variety and progression of contact modes as well as how often contacts form or break.',
    values: [
      { value: 'Low', tag: 'low constraint change', tone: 'blue', description: 'Few simple contact transitions introduce limited motion restrictions.' },
      { value: 'Moderate', tag: 'moderate constraint change', tone: 'amber', description: 'Support transfers or repeated handling cycles change contact constraints in a predictable sequence.' },
      { value: 'High', tag: 'high constraint change', tone: 'purple', description: 'Contact modes reorganize, mating interfaces engage or disengage, or deformable self-contacts evolve.' }
    ]
  },
  {
    key: 'motionRegime', label: 'Motion regime',
    description: 'Whether success requires deliberately generating or exploiting object dynamics.',
    values: [
      { value: 'Quasistatic', tag: 'quasistatic', tone: 'blue', description: 'Controlled positioning and contact forces suffice; exploiting momentum is unnecessary.' },
      { value: 'Dynamic', tag: 'dynamic', tone: 'purple', description: 'Success requires deliberately generating or exploiting momentum and inertial effects.' }
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
    (value ? renderPrimitiveTag(primitive, value) : '<span class="primitive-profile-value">Not specified</span>') +
    (explanation ? '<span class="primitive-profile-value">' + escapePrimitiveHTML(explanation) + '</span>' : '') +
    '</article>';
}
