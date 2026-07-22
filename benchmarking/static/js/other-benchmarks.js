/**
 * Render a list of categories, each with sections of benchmarks.
 */
function renderCategories(categories) {
  return categories.map(function (cat) {
    var sectionsHTML = cat.sections.map(function (sec) {
      var items = sec.benchmarks.map(function (b) {
        return '<li><strong>' + escapeHTML(b.name) + '</strong> &mdash; ' + escapeHTML(b.description) + '</li>';
      }).join('');
      return '<h4 class="title is-5" style="margin-bottom: 0.5rem; margin-top: 1.25rem;">' +
        escapeHTML(sec.title) + '</h4>' +
        '<ul style="list-style: disc; padding-left: 1.5rem; margin-bottom: 0.5rem;">' + items + '</ul>';
    }).join('');

    return '<div class="benchmark-section" style="margin-bottom: 2rem;">' +
      '<h3 class="title is-4 section-divider">' + escapeHTML(cat.title) + '</h3>' +
      sectionsHTML +
      '</div>';
  }).join('');
}

function escapeHTML(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async function () {
  try {
    var [designRes, notSupportedRes] = await Promise.all([
      fetch('data/model-based.jsonc'),
      fetch('data/not-currently-supported.jsonc')
    ]);

    var designData = await designRes.json();
    var notSupportedData = await notSupportedRes.json();

    // Design-Based Benchmarks
    var desc = designData.description;
    document.getElementById('design-based-description').textContent =
      Array.isArray(desc) ? desc.join('') : desc;
    document.getElementById('design-based-content').innerHTML =
      renderCategories(designData.categories || []);

    // Not Currently Supported
    var nsDesc = notSupportedData.description;
    document.getElementById('not-supported-description').textContent =
      Array.isArray(nsDesc) ? nsDesc.join('') : nsDesc;
    document.getElementById('not-supported-content').innerHTML =
      renderCategories(notSupportedData.categories || []);

  } catch (error) {
    console.error('Failed to load data:', error);
    document.getElementById('design-based-content').innerHTML =
      '<p class="has-text-danger">Failed to load benchmarks. Please try refreshing.</p>';
    document.getElementById('not-supported-content').innerHTML =
      '<p class="has-text-danger">Failed to load benchmarks. Please try refreshing.</p>';
  }
});
