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
    return { ...level, sections: levelData.sections, description: levelData.description || '', comingSoon: levelData.comingSoon || false };
  });

  benchmarkData = { levels: await Promise.all(levelPromises) };
  return benchmarkData;
}

/**
 * Create HTML for a single benchmark card with numbering prefix.
 */
function createCard(benchmark, index, prefix) {
  const number = prefix ? prefix + '.' + (index + 1) : String(index + 1);
  return `
    <div class="column is-one-third-desktop is-half-tablet">
      <a href="benchmark.html?id=${benchmark.id}" class="benchmark-card-link">
        <div class="card benchmark-card">
          <div class="card-content">
            <p class="title is-5"><span class="benchmark-number">${number}.</span> ${benchmark.title}</p>
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
 */
function createSubsection(subsection, subIndex, sectionPrefix) {
  const subPrefix = sectionPrefix + '.' + (subIndex + 1);
  const cardsHTML = subsection.benchmarks.map(function (b, i) {
    return createCard(b, i, subPrefix);
  }).join('');

  const descriptionHTML = subsection.description
    ? `<p class="subsection-description">${subsection.description}</p>`
    : '';

  return `
    <div class="benchmark-subsection collapsible">
      <h4 class="title is-5 subsection-divider collapsible-toggle" onclick="toggleCollapse(this)">
        <span class="collapse-icon"><i class="fas fa-chevron-down"></i></span>
        <span class="section-number">${subPrefix}</span> ${subsection.title}
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
function createSection(section, sectionIndex, totalSections) {
  const showSectionNumber = totalSections > 1;
  const sectionPrefix = String(sectionIndex + 1);

  const descriptionHTML = section.description
    ? `<p class="section-description">${section.description}</p>`
    : '';

  let contentHTML = '';

  // Render section-level benchmarks first
  if (section.benchmarks && section.benchmarks.length > 0) {
    const cardsHTML = section.benchmarks.map(function (b, i) {
      return createCard(b, i, showSectionNumber ? sectionPrefix : '');
    }).join('');
    contentHTML += `<div class="columns is-multiline benchmark-cards">${cardsHTML}</div>`;
  }

  // Then render subsections if present
  if (section.subsections && section.subsections.length > 0) {
    contentHTML += section.subsections.map(function (sub, i) {
      return createSubsection(sub, i, sectionPrefix);
    }).join('');
  }

  const numberHTML = showSectionNumber ? `<span class="section-number">${sectionPrefix}.</span> ` : '';

  return `
    <div class="benchmark-section collapsible">
      <h3 class="title is-4 section-divider collapsible-toggle" onclick="toggleCollapse(this)">
        <span class="collapse-icon"><i class="fas fa-chevron-down"></i></span>
        ${numberHTML}${section.title}
      </h3>
      <div class="collapsible-content">
        ${descriptionHTML}
        ${contentHTML}
      </div>
    </div>`;
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
