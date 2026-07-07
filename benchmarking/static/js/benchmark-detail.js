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
      if (!level.sections) continue;
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

  // Breadcrumb and back link
  document.getElementById('breadcrumb-level').textContent = level.label;
  document.getElementById('breadcrumb-level').href = 'benchmarks.html#' + level.id;
  document.getElementById('breadcrumb-benchmark').textContent = benchmark.title;
  document.getElementById('back-link').href = 'benchmarks.html#' + level.id;

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
  document.getElementById('benchmark-description').innerHTML =
    '<p>' + escapeHTML(benchmark.description) + '</p>';

  // Associated Component Testbed
  if (benchmark.associatedTestbed && benchmark.associatedTestbed.trim() !== '') {
    document.getElementById('benchmark-testbed').innerHTML =
      '<p>' + benchmark.associatedTestbed + '</p>';
    document.getElementById('testbed-section').style.display = '';
  }

  // Test Procedure
  const procList = document.getElementById('benchmark-procedures');
  benchmark.procedures.forEach(function (step) {
    const li = document.createElement('li');
    li.innerHTML = step;
    procList.appendChild(li);
  });

  // Collected Data
  if (benchmark.collectedData && benchmark.collectedData.some(function (d) { return d.trim() !== ''; })) {
    const cdList = document.getElementById('benchmark-collected-data');
    benchmark.collectedData.forEach(function (item) {
      if (item.trim() !== '') {
        const li = document.createElement('li');
        li.innerHTML = item;
        cdList.appendChild(li);
      }
    });
    document.getElementById('collected-data-section').style.display = '';
  }

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

  // Analysis methods
  if (benchmark.analysisMethods && benchmark.analysisMethods.some(function (m) { return m.trim() !== ''; })) {
    const analysisList = document.getElementById('benchmark-analysis');
    benchmark.analysisMethods.forEach(function (method) {
      if (method.trim() !== '') {
        const li = document.createElement('li');
        li.textContent = method;
        analysisList.appendChild(li);
      }
    });
    document.getElementById('analysis-section').style.display = '';
  }

  // Metrics table
  const metricsContainer = document.getElementById('benchmark-metrics');
  const table = document.createElement('table');
  table.className = 'table is-fullwidth is-striped is-hoverable metrics-table';
  table.innerHTML =
    '<thead><tr><th>Metric</th><th>Unit</th><th>Data Used in Computation</th><th>Equation</th></tr></thead><tbody></tbody>';

  const tbody = table.querySelector('tbody');
  var dash = '<span style="color: #bbb;">—</span>';
  benchmark.metrics.forEach(function (m) {
    const row = document.createElement('tr');
    row.innerHTML =
      '<td>' + (m.name ? escapeHTML(m.name) : dash) + '</td>' +
      '<td>' + (m.unit ? escapeHTML(m.unit) : dash) + '</td>' +
      '<td>' + (m.dataUsed ? escapeHTML(m.dataUsed) : dash) + '</td>' +
      '<td>' + (m.equation ? m.equation : dash) + '</td>';
    tbody.appendChild(row);
  });
  metricsContainer.appendChild(table);

  // References
  if (benchmark.references && benchmark.references.some(function (r) { return r.trim() !== ''; })) {
    const refList = document.getElementById('benchmark-references');
    benchmark.references.forEach(function (ref) {
      if (ref.trim() !== '') {
        const li = document.createElement('li');
        li.innerHTML = ref;
        refList.appendChild(li);
      }
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
