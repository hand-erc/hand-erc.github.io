document.addEventListener('DOMContentLoaded', async function () {
  const params = new URLSearchParams(window.location.search);
  const benchmarkId = params.get('id');

  if (!benchmarkId) {
    showNotFound();
    return;
  }

  try {
    // Load index, then search each level file for the benchmark
    const indexResponse = await fetch('data/benchmarks.jsonc');
    const index = await indexResponse.json();

    let benchmark = null;
    let parentLevel = null;

    // Fetch all level files in parallel, then search
    const levelResults = await Promise.all(
      index.levels.map(async (level) => {
        const res = await fetch(level.file);
        const levelData = await res.json();
        return { ...level, sections: levelData.sections };
      })
    );

    for (const level of levelResults) {
      for (const section of level.sections) {
        // Search in section benchmarks
        const found = section.benchmarks.find(b => b.id === benchmarkId);
        if (found) {
          benchmark = found;
          parentLevel = level;
          break;
        }
        // Search in subsections if present
        if (section.subsections) {
          for (const sub of section.subsections) {
            const subFound = sub.benchmarks.find(b => b.id === benchmarkId);
            if (subFound) {
              benchmark = subFound;
              parentLevel = level;
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

    populatePage(benchmark, parentLevel);
  } catch (error) {
    console.error('Failed to load benchmark data:', error);
    showNotFound();
  }
});

/**
 * Populate the page with benchmark data.
 */
function populatePage(benchmark, level) {
  // Page title
  document.title = benchmark.title + ' - HAND Benchmarking';

  // Breadcrumb
  document.getElementById('breadcrumb-level').textContent = level.label;
  document.getElementById('breadcrumb-level').href = 'benchmarks.html#' + level.id;
  document.getElementById('breadcrumb-benchmark').textContent = benchmark.title;

  // Hero
  document.getElementById('benchmark-title').textContent = benchmark.title;
  document.getElementById('benchmark-subtitle').textContent = benchmark.shortDescription;

  // Image
  if (benchmark.image && benchmark.image.trim() !== '') {
    const imgSection = document.getElementById('image-section');
    const img = document.getElementById('benchmark-image');
    img.src = benchmark.image;
    img.alt = benchmark.title;
    imgSection.style.display = '';

    // Hide image section if the image fails to load
    img.onerror = function () {
      imgSection.style.display = 'none';
    };
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

  // Justification
  if (benchmark.justification) {
    document.getElementById('benchmark-justification').innerHTML =
      '<p>' + escapeHTML(benchmark.justification) + '</p>';
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
    '<thead><tr><th>Metric</th><th>Unit</th><th>Description</th></tr></thead><tbody></tbody>';

  const tbody = table.querySelector('tbody');
  benchmark.metrics.forEach(function (m) {
    const row = document.createElement('tr');
    row.innerHTML =
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

/**
 * Basic HTML escaping to prevent XSS from data.
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
