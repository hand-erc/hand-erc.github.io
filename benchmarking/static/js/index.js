// Toggle collapsible sections
function toggleCollapse(toggle) {
  const collapsible = toggle.closest('.collapsible');
  const isExpanding = collapsible.classList.contains('is-collapsed');
  collapsible.classList.toggle('is-collapsed');

  // When expanding a section, also expand its child subsections
  if (isExpanding) {
    collapsible.querySelectorAll('.collapsible.is-collapsed').forEach(function (child) {
      child.classList.remove('is-collapsed');
    });
  }
}

// Scroll to top functionality
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function () {
  const scrollButton = document.querySelector('.scroll-to-top');
  if (scrollButton) {
    if (window.pageYOffset > 300) {
      scrollButton.classList.add('visible');
    } else {
      scrollButton.classList.remove('visible');
    }
  }
});
