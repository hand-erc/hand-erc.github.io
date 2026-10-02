/**
 * Shared primitive definitions, value labels, and colors for the system guide,
 * benchmark cards, and task justifications. Ratings are qualitative.
 */
const primitiveDefinitions = [
  {
    key: 'manipulation', label: 'Manipulation',
    description: 'How the hand produces the task’s main effect on the object, such as moving, fastening, or cutting it.',
    values: [
      { value: 'Direct', tag: 'Direct', tone: 'blue', description: 'The hand acts directly on the relevant object or mechanism.' },
      { value: 'Indirect', tag: 'Indirect / tool use', tone: 'purple', description: 'One or more tools transmit the hand’s action to the object. Other direct contacts, such as supporting paper during cutting, may still occur.' }
    ]
  },
  {
    key: 'rigidity', label: 'Rigidity',
    description: 'Whether the handled objects and tools (manipulanda) deform under task forces, and whether external supports or fixtures are rigid. Fabric, rope, and elastic fasteners count as deformable manipulanda.',
    values: [
      { value: 'Rigid manipulanda / rigid environment', tag: 'Rigid / rigid environment', tone: 'blue', description: 'The handled objects and tools are effectively rigid, and the task uses a rigid support or fixture.' },
      { value: 'Deformable manipulanda / rigid environment', tag: 'Deformable / rigid environment', tone: 'teal', description: 'The handled objects deform, and the task uses a rigid support or fixture during setup, manipulation, or release.' },
      { value: 'Mixed manipulanda / rigid environment', tag: 'Mixed rigidity / rigid environment', tone: 'purple', description: 'The task coordinates rigid components or tools with deformable material, using a rigid support or fixture.' },
      { value: 'Rigid manipulandum / environment not engaged', tag: 'Rigid / environment not engaged', tone: 'slate', description: 'The rigid object stays within the hand, and environmental contact is excluded throughout the trial.' }
    ]
  },
  {
    key: 'relativeSize', label: 'Size relative to hand',
    description: 'The size of the objects, tools, or local components actively handled, compared with the hand. Fixed boards and supports are excluded. Sheets are compared by their planar extent; ropes and dowels by both length and graspable cross-section.',
    values: [
      { value: 'Smaller than the hand', tag: 'Smaller than hand', tone: 'blue', description: 'The primary handled object or local component is smaller than the hand.' },
      { value: 'Comparable to the hand', tag: 'Comparable to hand', tone: 'teal', description: 'The relevant object’s overall extent is approximately the size of the hand.' },
      { value: 'Larger than the hand', tag: 'Larger than hand', tone: 'purple', description: 'The relevant object extends beyond the hand over the area being manipulated.' },
      { value: 'Mixed relative to the hand', tag: 'Mixed sizes', tone: 'amber', description: 'Relevant tools and objects span different sizes, or a slender object is longer than the hand while its graspable cross-section is smaller.' }
    ]
  },
  {
    key: 'controlledDegreesOfFreedom', label: 'Controlled degrees of freedom',
    description: 'How much independent object motion, deformation, and finger-contact motion must be coordinated. These qualitative levels account for fixture guidance and the task’s required manipulation strategy as well as the number of objects.',
    values: [
      { value: 'Low', tag: 'Low DoF', tone: 'blue', description: 'One rigid object’s pose or motion is controlled through a simple grasp, with no required sustained reconfiguration of finger contacts or coordination of additional movable components.' },
      { value: 'Moderate', tag: 'Moderate DoF', tone: 'amber', description: 'Limited additional coordination is required for guided mechanism motion, localized deformation, or movable distractors during confined exploration.' },
      { value: 'High', tag: 'High DoF', tone: 'purple', description: 'The task requires coordinating several independently controlled objects or tool elements, distributed deformation, or sustained independent motion of finger contacts and object pose.' }
    ]
  },
  {
    key: 'constraintComplexity', label: 'Constraint complexity',
    description: 'How restrictive the simultaneously active physical constraints are: access, alignment, tolerances, contact geometry, and force or impedance requirements. Ratings reflect the task’s most restrictive required interaction.',
    values: [
      { value: 'Low', tag: 'Low constraints', tone: 'blue', description: 'Few physical constraints are active together, with broad freedom to choose contacts and motion. Speed or precise release timing can still be demanding.' },
      { value: 'Moderate', tag: 'Moderate constraints', tone: 'amber', description: 'The task requires path or edge alignment, managing clutter and confinement, compliant positioning, or simple opposing-contact force regulation, while leaving multiple feasible ways to satisfy those requirements.' },
      { value: 'High', tag: 'High constraints', tone: 'purple', description: 'Tight mating geometry, severely restricted grasp access, knot topology, or interdependent alignment and contact-force requirements sharply restrict feasible motions or grasps.' }
    ]
  },
  {
    key: 'constraintChange', label: 'Constraint change',
    description: 'How the active contact set and resulting motion restrictions change during the task. The rating considers the variety and progression of contact modes as well as how often contacts form or break.',
    values: [
      { value: 'Low', tag: 'Low constraint change', tone: 'blue', description: 'The contact arrangement and motion restrictions remain effectively constant throughout the task.' },
      { value: 'Moderate', tag: 'Moderate constraint change', tone: 'amber', description: 'Contacts follow a limited sequence, shift within a continuously controlled grasp, or repeat the same acquisition-and-release cycle. A single fold with support, self-contact, and release also falls here.' },
      { value: 'High', tag: 'High constraint change', tone: 'purple', description: 'Contacts progressively impose new motion restrictions, engage or disengage along an interface, or repeatedly reorganize during cutting, exploration, knotting, rolling and tucking, or wrapping.' }
    ]
  },
  {
    key: 'motionRegime', label: 'Motion regime',
    description: 'Whether success requires deliberately generating or exploiting object dynamics.',
    values: [
      { value: 'Quasistatic', tag: 'Quasistatic', tone: 'blue', description: 'Success can be achieved through controlled positioning and contact forces without deliberately exploiting momentum or free motion. A time limit alone does not change this rating.' },
      { value: 'Dynamic', tag: 'Dynamic', tone: 'purple', description: 'Success deliberately uses momentum or inertial effects. For Spin a Top, the imparted angular velocity and release conditions determine whether the top continues spinning upright.' }
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

function createPrimitiveGuide(benchmarks = []) {
  const definitionsHTML = primitiveDefinitions.map(function (primitive) {
    return '<article class="primitive-guide-card">' +
      '<h4 class="title is-5">' + escapePrimitiveHTML(primitive.label) + '</h4>' +
      '<p>' + escapePrimitiveHTML(primitive.description) + '</p>' +
      '<ul class="primitive-guide-values">' + primitive.values.map(function (value) {
        const examples = benchmarks.filter(function (benchmark) {
          return benchmark.primitiveProfile && getPrimitiveValue(primitive, benchmark.primitiveProfile[primitive.key]) === value;
        }).slice(0, 3).map(function (benchmark) { return benchmark.title; });
        return '<li>' + renderPrimitiveTag(primitive, value) +
          '<span>' + escapePrimitiveHTML(value.description) + '</span>' +
          '<span class="primitive-guide-examples">' + (examples.length
            ? '<strong>Examples:</strong> ' + escapePrimitiveHTML(examples.join(', '))
            : 'No current benchmark has this value.') + '</span>' +
          '</li>';
      }).join('') + '</ul></article>';
  }).join('');

  return '<section class="benchmark-section primitive-guide" id="system-primitives" aria-labelledby="primitive-guide-title">' +
    '<h3 class="title is-4 section-divider" id="primitive-guide-title">Manipulation primitives</h3>' +
    '<p class="section-description">Each task is described by the seven primitives below. The colored labels are used in the task cards and justification profiles. ' +
      'For graded primitives, blue means Low, amber means Moderate, and purple means High. ' +
      'Each rating describes the task’s demands along that primitive. Categorical values use the colors shown in their entries. Examples reflect the current task profiles.</p>' +
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
