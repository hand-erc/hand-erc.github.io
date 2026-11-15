// Feedback box shown above the footer on every benchmarking page.
// Sending opens GitHub's new-issue form with the feedback already filled in,
// so no GitHub token ever has to be stored on this public site.
(function () {
  const REPO_URL = 'https://github.com/hand-erc/hand-erc.github.io';
  const ISSUE_TEMPLATE = 'website-feedback.yml'; // .github/ISSUE_TEMPLATE/website-feedback.yml
  const MAX_LENGTH = 2000;
  const MAX_URL_LENGTH = 8000; // GitHub rejects much longer URLs with "414 URI Too Long"

  function getPageName() {
    return document.title.replace(/\s*-\s*HAND Benchmarking\s*$/i, '').trim() || 'HAND Benchmarking';
  }

  /**
   * Build a link to the new-issue form. The "feedback" and "page" keys match
   * the field ids in the issue template, which fills those fields in.
   */
  function buildIssueURL(feedback) {
    const pageName = getPageName();
    const params = [
      ['template', ISSUE_TEMPLATE],
      ['title', 'Website feedback: ' + pageName],
      ['feedback', feedback],
      ['page', pageName + ' (' + window.location.href + ')']
    ];
    return REPO_URL + '/issues/new?' + params.map(function (pair) {
      return pair[0] + '=' + encodeURIComponent(pair[1]);
    }).join('&');
  }

  function createSection() {
    const section = document.createElement('section');
    section.className = 'section feedback-section';
    section.setAttribute('aria-labelledby', 'feedback-title');
    section.innerHTML = `
      <div class="container is-max-desktop">
        <h2 class="title is-3 has-text-centered" id="feedback-title">Feedback</h2>
        <form class="feedback-form" novalidate>
          <label class="label feedback-label" for="feedback-text">
            Spotted an error or have a suggestion about this page? Let us know.
          </label>
          <textarea class="textarea" id="feedback-text" name="feedback" rows="4"
            maxlength="${MAX_LENGTH}" placeholder="Your feedback"
            aria-describedby="feedback-note feedback-count"></textarea>
          <span class="feedback-count" id="feedback-count"></span>
          <div class="feedback-actions">
            <p class="feedback-note" id="feedback-note">
              This opens a new issue on GitHub with your feedback filled in. Review it there and click
              <strong>Create</strong> to send it. You'll need a free GitHub account, and the issue will be public.
            </p>
            <button type="submit" class="button is-dark feedback-submit">
              <span class="icon"><i class="fab fa-github" aria-hidden="true"></i></span>
              <span>Continue on GitHub</span>
            </button>
          </div>
          <p class="feedback-status" role="status" aria-live="polite"></p>
        </form>
      </div>`;
    return section;
  }

  document.addEventListener('DOMContentLoaded', function () {
    const section = createSection();
    const footer = document.querySelector('footer.footer');
    if (footer) {
      footer.parentNode.insertBefore(section, footer);
    } else {
      document.body.appendChild(section);
    }

    const form = section.querySelector('.feedback-form');
    const textarea = section.querySelector('#feedback-text');
    const count = section.querySelector('#feedback-count');
    const status = section.querySelector('.feedback-status');

    function updateCount() {
      count.textContent = textarea.value.length + ' / ' + MAX_LENGTH;
    }

    function showStatus(message, isError) {
      status.textContent = message;
      status.classList.toggle('is-error', Boolean(isError));
    }

    textarea.addEventListener('input', updateCount);
    updateCount();

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const feedback = textarea.value.trim();

      if (!feedback) {
        showStatus('Please write your feedback first.', true);
        textarea.focus();
        return;
      }

      const url = buildIssueURL(feedback);
      if (url.length > MAX_URL_LENGTH) {
        showStatus('Your feedback is too long to send through GitHub. Please shorten it.', true);
        return;
      }

      window.open(url, '_blank', 'noopener');

      // Popup blockers can stop the new tab, so also offer a plain link.
      showStatus('GitHub opened in a new tab with your feedback filled in. Click Create there to send it. ');
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Didn\'t open? Continue on GitHub.';
      status.appendChild(link);
    });
  });
})();
