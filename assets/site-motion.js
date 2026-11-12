(() => {
  'use strict';
  document.querySelectorAll('.telegram-result').forEach(example => {
    example.querySelectorAll('.telegram-result-part').forEach((part, index) => {
      if (index === 1) return; // The quote remains plain selectable text.
      const label = part.querySelector('.telegram-result-label');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lead-highlight-toggle';
      button.textContent = label.textContent;
      button.setAttribute('aria-pressed', 'false');
      button.title = 'Подсветить эту часть результата';
      label.replaceChildren(button);
      button.addEventListener('click', () => {
        const active = part.classList.toggle('is-highlighted');
        button.setAttribute('aria-pressed', String(active));
      });
    });
  });
})();
