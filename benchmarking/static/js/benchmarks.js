// Cache for benchmark data
let benchmarkData = null;

/**
 * Fetch the index and all per-level JSON files in parallel.
 */
async function fetchBenchmarks() {
  if (benchmarkData) return benchmarkData;

  // Load the index file (lists levels with pointers to per-level files)
  const indexResponse = await fetch('data/benchmarks.jsonc');
  const index = await indexResponse.json();

  // Fetch all level files in parallel
  const levelPromises = index.levels.map(async (level) => {
    const res = await fetch(level.file);
    const levelData = await res.json();
    return { ...level, sections: levelData.sections, testbeds: levelData.testbeds, categories: levelData.categories, description: levelData.description || '', comingSoon: levelData.comingSoon || false };
  });

  benchmarkData = { levels: await Promise.all(levelPromises) };
  return benchmarkData;
}

/**
 * Filter out benchmarks marked as hidden (_hidden: true) in the data.
 * To restore a hidden benchmark, remove its _hidden property.
 */
function filterVisible(benchmarks) {
  return benchmarks.filter(function (b) { return !b._hidden; });
}

/**
 * Create HTML for a single benchmark card.
 * Numbering is disabled — to re-enable, restore the ${number} span below.
 */
function createCard(benchmark, index, prefix) {
  // const number = prefix ? prefix + '.' + (index + 1) : String(index + 1);  // NUMBERING DISABLED — uncomment to restore
  return `
    <div class="column is-one-third-desktop is-half-tablet">
      <a href="benchmark.html?id=${benchmark.id}" class="benchmark-card-link">
        <div class="card benchmark-card">
          <div class="card-content">
            <p class="title is-5">${benchmark.title}</p>
            <p class="subtitle is-6">${benchmark.shortDescription}</p>
          </div>
          <footer class="card-footer">
            <span class="card-footer-item">
              <span class="icon"><i class="fas fa-arrow-right"></i></span>
              <span>View Details</span>
            </span>
          </footer>
        </div>
      </a>
    </div>`;
}

/**
 * Create HTML for a subsection (smaller heading + card grid).
 * Numbering is disabled — to re-enable, restore the section-number span below.
 */
function createSubsection(subsection, subIndex, sectionPrefix) {
  // const subPrefix = sectionPrefix + '.' + (subIndex + 1);  // NUMBERING DISABLED — uncomment to restore
  const visibleBenchmarks = filterVisible(subsection.benchmarks);
  const cardsHTML = visibleBenchmarks.map(function (b, i) {
    return createCard(b, i, '');
  }).join('');

  const descriptionHTML = subsection.description
    ? `<p class="subsection-description">${subsection.description}</p>`
    : '';

  return `
    <div class="benchmark-subsection collapsible is-collapsed">
      <h4 class="title is-5 subsection-divider collapsible-toggle" onclick="toggleCollapse(this)">
        <span class="collapse-icon"><i class="fas fa-chevron-down"></i></span>
        ${subsection.title}
      </h4>
      <div class="collapsible-content">
        ${descriptionHTML}
        <div class="columns is-multiline benchmark-cards">
          ${cardsHTML}
        </div>
      </div>
    </div>`;
}

/**
 * Create HTML for a benchmark section (divider + card grid).
 * Supports optional subsections array.
 */
/**
 * Numbering is disabled — to re-enable, restore the numberHTML and sectionPrefix usage below.
 */
function createSection(section, sectionIndex, totalSections) {
  // const showSectionNumber = totalSections > 1;  // NUMBERING DISABLED — uncomment to restore
  // const sectionPrefix = String(sectionIndex + 1);  // NUMBERING DISABLED — uncomment to restore

  const descriptionHTML = section.description
    ? `<p class="section-description">${section.description}</p>`
    : '';

  let contentHTML = '';

  // Render section-level benchmarks first (filtering hidden)
  if (section.benchmarks && section.benchmarks.length > 0) {
    const visibleBenchmarks = filterVisible(section.benchmarks);
    const cardsHTML = visibleBenchmarks.map(function (b, i) {
      return createCard(b, i, '');
    }).join('');
    contentHTML += `<div class="columns is-multiline benchmark-cards">${cardsHTML}</div>`;
  }

  // Then render subsections if present (filtering hidden)
  // SUBSECTION HEADINGS DISABLED — to restore, replace the block below with: contentHTML += filterVisible(section.subsections).map(function (sub, i) { return createSubsection(sub, i, ''); }).join('');
  if (section.subsections && section.subsections.length > 0) {
    var allSubBenchmarks = [];
    filterVisible(section.subsections).forEach(function (sub) {
      allSubBenchmarks = allSubBenchmarks.concat(filterVisible(sub.benchmarks));
    });
    if (allSubBenchmarks.length > 0) {
      var subCardsHTML = allSubBenchmarks.map(function (b, i) {
        return createCard(b, i, '');
      }).join('');
      contentHTML += `<div class="columns is-multiline benchmark-cards">${subCardsHTML}</div>`;
    }
  }

  // const numberHTML = showSectionNumber ? `<span class="section-number">${sectionPrefix}.</span> ` : '';  // NUMBERING DISABLED — uncomment to restore

  // If there is only one section, render it flat (no collapsible dropdown)
  if (totalSections === 1) {
    return `
      <div class="benchmark-section">
        <h3 class="title is-4 section-divider">${section.title}</h3>
        ${descriptionHTML}
        ${contentHTML}
      </div>`;
  }

  return `
    <div class="benchmark-section collapsible is-collapsed">
      <h3 class="title is-4 section-divider collapsible-toggle" onclick="toggleCollapse(this)">
        <span class="collapse-icon"><i class="fas fa-chevron-down"></i></span>
        ${section.title}
      </h3>
      <div class="collapsible-content">
        ${descriptionHTML}
        ${contentHTML}
      </div>
    </div>`;
}

/**
 * Create HTML for a testbeds table.
 */
function createTestbedsTable(testbeds) {
  const rows = testbeds.map(function (tb) {
    const images = (tb.images || []).map(function (src) {
      return '<img src="' + src + '" alt="' + (tb.name || '') + '" style="max-height:900px; margin:2px;">';
    }).join('');
    const benchmarks = (tb.associatedBenchmarks || []).join(', ');
    const hardware = (tb.measurementHardware || []).join(', ');
    return '<tr>' +
      '<td>' + (tb.name || '') + '</td>' +
      '<td>' + (tb.hostInstitution || '') + '</td>' +
      '<td>' + (images || '') + '</td>' +
      '<td>' + (tb.description || '') + '</td>' +
      '<td>' + benchmarks + '</td>' +
      '<td>' + hardware + '</td>' +
      '<td>' + (tb.testbedLead ? '<a href="mailto:' + tb.testbedLead + '">' + tb.testbedLead + '</a>' : '') + '</td>' +
      '</tr>';
  }).join('');

  return `
    <div class="table-container" style="overflow-x: auto;">
      <table class="table is-bordered is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th>Name</th>
            <th>Host Institution</th>
            <th>Images</th>
            <th>Description</th>
            <th>Associated Benchmarks</th>
            <th>Measurement Hardware</th>
            <th>Testbed Lead</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" class="has-text-centered has-text-grey">No testbeds added yet.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

/**
 * Create HTML for the "Not Currently Supported" tab.
 */
function createNotSupportedList(categories) {
  return categories.map(function (cat) {
    const sectionsHTML = cat.sections.map(function (sec) {
      const items = sec.benchmarks.map(function (b) {
        return '<li>' + b.name + ' &mdash; ' + b.description + '</li>';
      }).join('');
      return `
        <h5 class="title is-6" style="margin-bottom: 0.5rem; margin-top: 1rem;">${sec.title}</h5>
        <ul style="list-style: disc; padding-left: 1.5rem; margin-bottom: 0.5rem;">${items}</ul>`;
    }).join('');

    return `
      <div class="benchmark-section" style="margin-bottom: 2rem;">
        <h3 class="title is-4 section-divider">${cat.title}</h3>
        ${sectionsHTML}
      </div>`;
  }).join('');
}

/**
 * Render all tab panels from the data.
 */
function renderTabPanels(data) {
  const container = document.getElementById('tab-content');
  container.innerHTML = '';

  data.levels.forEach((level, index) => {
    const panel = document.createElement('div');
    const activeTab = document.querySelector('#level-tabs li.is-active');
    const defaultLevel = activeTab ? activeTab.dataset.level : 'system';
    panel.className = 'tab-panel' + (level.id === defaultLevel ? ' is-active' : '');
    panel.dataset.level = level.id;

    const desc = level.description;
    let descHTML = '';
    if (desc) {
      const text = Array.isArray(desc) ? desc.join('') : desc;
      descHTML = `<div class="content has-text-left" style="margin-bottom: 2rem;">
           <p class="is-size-5" style="color: var(--text-secondary); line-height: 1.8;">${text}</p>
         </div>`;
    }

    if (level.comingSoon) {
      panel.innerHTML = descHTML + `
        <div class="coming-soon">
          <span class="icon"><i class="fas fa-hard-hat"></i></span>
          <p class="title is-4">Coming Soon</p>
          <p class="subtitle">Benchmarks for this level are currently under development.</p>
        </div>`;
    } else if (level.type === 'testbeds') {
      panel.innerHTML = descHTML + createTestbedsTable(level.testbeds || []);
    } else if (level.type === 'not-supported') {
      panel.innerHTML = descHTML + createNotSupportedList(level.categories || []);
    } else {
      const total = level.sections.length;
      panel.innerHTML = descHTML + level.sections.map(function (s, i) {
        return createSection(s, i, total);
      }).join('');
    }

    container.appendChild(panel);
  });
}

/**
 * Set up tab switching behavior.
 */
function setupTabs() {
  const tabs = document.querySelectorAll('#level-tabs li');

  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      // Update active tab
      tabs.forEach(t => t.classList.remove('is-active'));
      this.classList.add('is-active');

      // Show matching panel
      const level = this.dataset.level;
      document.querySelectorAll('.tab-panel').forEach(panel => {
        if (panel.dataset.level === level) {
          panel.classList.add('is-active');
        } else {
          panel.classList.remove('is-active');
        }
      });

      // Update URL hash
      history.replaceState(null, '', '#' + level);
    });
  });
}

/**
 * Activate a tab based on URL hash.
 */
function activateTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return;

  const targetTab = document.querySelector(`#level-tabs li[data-level="${hash}"]`);
  if (targetTab) {
    targetTab.click();
  }
}

/**
 * Initialize the benchmarks page.
 */
document.addEventListener('DOMContentLoaded', async function () {
  try {
    const data = await fetchBenchmarks();
    renderTabPanels(data);
    setupTabs();
    activateTabFromHash();

    // Handle browser back/forward with hash changes
    window.addEventListener('hashchange', activateTabFromHash);
  } catch (error) {
    console.error('Failed to load benchmarks:', error);
    document.getElementById('tab-content').innerHTML = `
      <div class="not-found">
        <div class="icon"><i class="fas fa-exclamation-triangle"></i></div>
        <p class="title is-4">Failed to load benchmarks</p>
        <p class="subtitle">Please try refreshing the page.</p>
      </div>`;
  }
});
