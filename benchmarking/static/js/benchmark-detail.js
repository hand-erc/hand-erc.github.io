document.addEventListener('DOMContentLoaded', async function () {
  const params = new URLSearchParams(window.location.search);
  const benchmarkId = params.get('id');

  if (!benchmarkId) {
    showNotFound();
    return;
  }

  try {
    // Load index and PM data in parallel
    const [indexResponse, pmResponse] = await Promise.all([
      fetch('data/benchmarks.jsonc'),
      fetch('data/hand-metrics.jsonc')
    ]);
    const index = await indexResponse.json();
    const pmData = await pmResponse.json();
    const pmIndex = buildPMIndex(pmData);

    let benchmark = null;
    let parentLevel = null;
    let parentSection = null;

    // Fetch all level files in parallel, then search
    const levelResults = await Promise.all(
      index.levels.map(async (level) => {
        const res = await fetch(level.file);
        const levelData = await res.json();
        return { ...level, sections: levelData.sections };
      })
    );

    for (const level of levelResults) {
      if (!level.sections) continue;
      for (const section of level.sections) {
        // Search in section benchmarks
        if (section.benchmarks) {
          const found = section.benchmarks.find(b => b.id === benchmarkId);
          if (found) {
            benchmark = found;
            parentLevel = level;
            parentSection = section;
            break;
          }
        }
        // Search in subsections if present
        if (section.subsections) {
          for (const sub of section.subsections) {
            const subFound = sub.benchmarks.find(b => b.id === benchmarkId);
            if (subFound) {
              benchmark = subFound;
              parentLevel = level;
              parentSection = section;
              break;
            }
          }
          if (benchmark) break;
        }
      }
      if (benchmark) break;
    }

    if (!benchmark) {
      showNotFound();
      return;
    }

    populatePage(benchmark, parentLevel, parentSection, pmIndex);
  } catch (error) {
    console.error('Failed to load benchmark data:', error);
    showNotFound();
  }
});

/**
 * Build a Performance Metrics index from hand-metrics.jsonc.
 * Returns: { levelId: { sectionTitle: [{name, number}] } }
 */
function buildPMIndex(pmData) {
  var LEVEL_MAP = { 'Application': 'application', 'System': 'system', 'Hand': 'hand', 'Component': 'component' };
  var index = {};

  (pmData.categories || []).forEach(function (cat, ci) {
    var catNum = ci + 1;
    var levelId = LEVEL_MAP[cat.title] || cat.title.toLowerCase();
    index[levelId] = index[levelId] || {};

    (cat.sections || []).forEach(function (sec, si) {
      var secNum = catNum + '.' + (si + 1);
      var entries = [];

      if (sec.benchmarks) {
        sec.benchmarks.forEach(function (b, bi) {
          entries.push({ name: b.name, number: secNum + '.' + (bi + 1) });
        });
      }
      if (sec.subsections) {
        sec.subsections.forEach(function (sub, subi) {
          var subNum = secNum + '.' + (subi + 1);
          sub.benchmarks.forEach(function (b, bi) {
            entries.push({ name: b.name, number: subNum + '.' + (bi + 1) });
          });
        });
      }

      index[levelId][sec.title] = entries;
    });
  });

  return index;
}

/**
 * Look up a Performance Metrics reference number.
 */
function findPMNumber(pmIndex, levelId, sectionTitle, name) {
  if (!name) return '';

  // Try section-specific lookup first
  if (pmIndex[levelId] && pmIndex[levelId][sectionTitle]) {
    var found = pmIndex[levelId][sectionTitle].find(function (e) { return e.name === name; });
    if (found) return found.number;
  }

  // Fall back to any section in this level
  if (pmIndex[levelId]) {
    for (var sec in pmIndex[levelId]) {
      var found = pmIndex[levelId][sec].find(function (e) { return e.name === name; });
      if (found) return found.number;
    }
  }

  // Fall back to all levels
  for (var lid in pmIndex) {
    for (var sec in pmIndex[lid]) {
      var found = pmIndex[lid][sec].find(function (e) { return e.name === name; });
      if (found) return found.number;
    }
  }

  return '';
}

/**
 * Populate the page with benchmark data.
 */
function populatePage(benchmark, level, section, pmIndex) {
  // Page title
  document.title = benchmark.title + ' - HAND Benchmarking';

  // Breadcrumb and back link
  document.getElementById('breadcrumb-level').textContent = level.label;
  document.getElementById('breadcrumb-level').href = 'benchmarks.html#' + level.id;
  document.getElementById('breadcrumb-benchmark').textContent = benchmark.title;
  document.getElementById('back-link').href = 'benchmarks.html#' + level.id;

  // Hero
  document.getElementById('benchmark-title').textContent = benchmark.title;
  document.getElementById('benchmark-subtitle').textContent = benchmark.shortDescription;

  // Concise manipulation primitive tags
  if (benchmark.primitiveProfile) {
    const primitiveTags = document.getElementById('benchmark-primitive-tags');
    primitiveTags.innerHTML = getPrimitiveTags(benchmark.primitiveProfile).map(function (tag) {
      return '<span class="primitive-tag">' + escapeHTML(tag) + '</span>';
    }).join('');
    primitiveTags.style.display = '';
  }

  // Images
  var imageList = benchmark.images || (benchmark.image ? [benchmark.image] : []);
  if (imageList.length > 0) {
    var largeSection = document.getElementById('large-image-section');
    var sidebarSection = document.getElementById('image-section');
    var existingImg = document.getElementById('benchmark-image');
    existingImg.style.display = 'none';

    var hasLargeImages = false;
    imageList.forEach(function (item) {
      var src = typeof item === 'string' ? item : item.src;
      var maxWidth = typeof item === 'object' && item.maxWidth ? item.maxWidth : '280px';
      var useLarge = typeof item === 'object' && item.maxWidth;
      if (src && src.trim() !== '') {
        var img = document.createElement('img');
        img.src = src;
        img.alt = benchmark.title;
        img.loading = 'lazy';
        img.style.maxWidth = maxWidth;
        img.style.borderRadius = '6px';
        img.style.display = 'block';
        img.style.height = 'auto';
        img.onerror = function () { img.style.display = 'none'; };
        if (useLarge) {
          img.style.flex = '0 1 ' + maxWidth;
          img.style.maxHeight = '300px';
          img.style.objectFit = 'contain';
          largeSection.appendChild(img);
          hasLargeImages = true;
        } else {
          img.style.marginBottom = '8px';
          sidebarSection.appendChild(img);
          sidebarSection.style.display = '';
        }
      }
    });
    if (hasLargeImages) {
      largeSection.style.display = 'flex';
    }
  }

  // Description
const descriptionElement = document.getElementById('benchmark-description');

if (benchmark.protocolLink) {
  const description = benchmark.description;
  const index = description.lastIndexOf("here");

  if (index !== -1) {
    const before = escapeHTML(description.substring(0, index));
    const after = escapeHTML(description.substring(index + 4));

    descriptionElement.innerHTML =
      `<p>${before}<a href="${benchmark.protocolLink}"
          target="_blank"
          rel="noopener noreferrer">here</a>${after}</p>`;
  } else {
    descriptionElement.innerHTML =
      '<p>' + escapeHTML(description) + '</p>';
  }
} else {
  descriptionElement.innerHTML =
    '<p>' + escapeHTML(benchmark.description) + '</p>';
}

  // Procedures
  const procList = document.getElementById('benchmark-procedures');
  benchmark.procedures.forEach(function (step) {
    const li = document.createElement('li');
    li.textContent = step;
    procList.appendChild(li);
  });

  // Starting, intermediate, and ending task configurations
  if (benchmark.configurationImages && benchmark.configurationImages.length > 0) {
    const gallery = document.getElementById('benchmark-configurations');
    gallery.innerHTML = '';
    gallery.style.setProperty('--configuration-count', benchmark.configurationImages.length);

    benchmark.configurationImages.forEach(function (configuration) {
      const figure = document.createElement('figure');
      figure.className = 'configuration-card';

      const image = document.createElement('img');
      image.src = configuration.src;
      image.alt = configuration.alt || configuration.caption || benchmark.title + ' configuration';
      figure.appendChild(image);

      const caption = document.createElement('figcaption');
      caption.textContent = configuration.caption;
      figure.appendChild(caption);

      gallery.appendChild(figure);
    });

    document.getElementById('configurations-section').style.display = '';
  }

  // Justification
  if (benchmark.justification) {
    const justification = document.getElementById('benchmark-justification');
    const sentences = splitIntoSentences(benchmark.justification);
    const lead = sentences.shift() || benchmark.justification;
    const rationaleHTML = sentences.length > 0
      ? '<ul class="justification-points">' + sentences.map(function (sentence) {
          return '<li>' + escapeHTML(sentence) + '</li>';
        }).join('') + '</ul>'
      : '';
    const profileHTML = benchmark.primitiveProfile
      ? '<h3 class="justification-subheading">Primitive profile</h3>' +
        '<div class="primitive-profile-grid">' +
        getPrimitiveDefinitions().map(function (primitive) {
          return '<article class="primitive-profile-card">' +
            '<span class="primitive-profile-label">' + escapeHTML(primitive.label) + '</span>' +
            '<span class="primitive-profile-value">' +
              escapeHTML(benchmark.primitiveProfile[primitive.key] || 'Not specified') +
            '</span>' +
          '</article>';
        }).join('') +
        '</div>'
      : '';

    justification.innerHTML =
      profileHTML +
      '<h3 class="justification-subheading">Why this task</h3>' +
      '<p class="justification-lead">' + escapeHTML(lead) + '</p>' +
      rationaleHTML;
    document.getElementById('justification-section').style.display = '';
  }

  // Setup
  if (benchmark.setup && benchmark.setup.length > 0) {
    document.getElementById('benchmark-setup').innerHTML =
      '<ol>' + benchmark.setup.map(s => '<li>' + escapeHTML(s) + '</li>').join('') + '</ol>';
    document.getElementById('setup-section').style.display = '';
  }

  if (benchmark.items && benchmark.items.length > 0) {

    let html = `
      <table class="table is-fullwidth is-striped">
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Specification</th>
          </tr>
        </thead>
        <tbody>
    `;

    benchmark.items.forEach(item => {

      const itemName = item.link
        ? `<a href="${item.link}"
              target="_blank"
              rel="noopener noreferrer">
            ${escapeHTML(item.item)}
          </a>`
        : escapeHTML(item.item);

      html += `
        <tr>
          <td>${itemName}</td>
          <td>${escapeHTML(item.quantity || "")}</td>
          <td>${escapeHTML(item.specification || "")}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    document.getElementById("benchmark-items").innerHTML = html;
    document.getElementById("items-section").style.display = "";
  }

  // Metrics table
  const metricsContainer = document.getElementById('benchmark-metrics');
  const table = document.createElement('table');
  table.className = 'table is-fullwidth is-striped is-hoverable metrics-table';
  table.innerHTML =
    '<thead><tr><th style="width:5.5rem">PM Ref</th><th>Metric</th><th>Unit</th><th>Description</th></tr></thead><tbody></tbody>';

  const sectionTitle = section ? section.title : '';
  const tbody = table.querySelector('tbody');
  benchmark.metrics.forEach(function (m) {
    const searchName = m.name || benchmark.title;
    const pmNum = findPMNumber(pmIndex, level.id, sectionTitle, searchName);
    const row = document.createElement('tr');
    row.innerHTML =
      '<td class="metric-number">' + escapeHTML(pmNum) + '</td>' +
      '<td>' + escapeHTML(m.name) + '</td>' +
      '<td>' + escapeHTML(m.unit) + '</td>' +
      '<td>' + escapeHTML(m.description) + '</td>';
    tbody.appendChild(row);
  });
  metricsContainer.appendChild(table);

  // Execution constraints
  const constraintsList = document.getElementById('benchmark-execution-constraints');
  const constraintsSection = document.getElementById('execution-constraints-section');

  constraintsList.innerHTML = '';

  if (benchmark.executionConstraints && benchmark.executionConstraints.length > 0) {
    benchmark.executionConstraints.forEach(function (constraint) {
      const li = document.createElement('li');
      li.textContent = constraint;
      constraintsList.appendChild(li);
    });

    constraintsSection.style.display = '';
  } else {
    constraintsSection.style.display = 'none';
  }

    // Analysis methods
  const analysisList = document.getElementById('benchmark-analysis');
  const analysisSection = analysisList.closest('section');

  analysisList.innerHTML = '';

  if (benchmark.analysisMethods && benchmark.analysisMethods.length > 0) {
    benchmark.analysisMethods.forEach(function (method) {
      const li = document.createElement('li');
      li.textContent = method;
      analysisList.appendChild(li);
    });

    if (analysisSection) {
      analysisSection.style.display = '';
    }
  } else {
    if (analysisSection) {
      analysisSection.style.display = 'none';
    }
  }
  // References
  if (benchmark.references && benchmark.references.length > 0) {
    const refList = document.getElementById('benchmark-references');
    refList.innerHTML = '';
    benchmark.references.forEach(function (ref) {
      const li = document.createElement('li');
      li.innerHTML = ref;
      refList.appendChild(li);
    });
    document.getElementById('references-section').style.display = '';
  }

  // Show content, hide loading
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('benchmark-content').style.display = '';
}

/**
 * Show the not-found state.
 */
function showNotFound() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('not-found-state').style.display = '';
}

function getPrimitiveDefinitions() {
  return [
    { key: 'manipulation', label: 'Manipulation' },
    { key: 'rigidity', label: 'Rigidity' },
    { key: 'relativeSize', label: 'Size relative to hand' },
    { key: 'controlledDegreesOfFreedom', label: 'Controlled degrees of freedom' },
    { key: 'constraintComplexity', label: 'Constraint complexity' },
    { key: 'constraintChange', label: 'Constraint change' },
    { key: 'motionRegime', label: 'Motion regime' }
  ];
}

function getPrimitiveTags(profile) {
  var rigidity = profile.rigidity || '';
  var rigidityLower = rigidity.toLowerCase();
  var rigidityTag = rigidityLower.startsWith('mixed')
    ? 'Mixed rigidity'
    : rigidityLower.startsWith('deformable') ? 'Deformable' : 'Rigid';
  var dof = (profile.controlledDegreesOfFreedom || '').split(' — ')[0];
  var constraints = (profile.constraintComplexity || '').split(' — ')[0];

  return [
    profile.manipulation,
    rigidityTag,
    dof ? dof + ' DoF' : '',
    constraints ? constraints + ' constraints' : '',
    profile.motionRegime
  ].filter(Boolean);
}

function splitIntoSentences(text) {
  return (String(text).match(/[^.!?]+(?:[.!?]+|$)/g) || [])
    .map(function (sentence) { return sentence.trim(); })
    .filter(Boolean);
}

/**
 * Basic HTML escaping to prevent XSS from data.
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
