const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const navItems = document.querySelectorAll('.nav-links a');
const currentYear = document.querySelector('#current-year');
const revealTargets = document.querySelectorAll('.section-heading, .panel, .project-card, .contact-panel, .hero-card');

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navLinks.classList.toggle('is-open');
  });

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navToggle.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('is-open');
    });
  });
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal', 'is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
  });

  revealTargets.forEach((target) => {
    target.classList.add('reveal');
    observer.observe(target);
  });
} else {
  revealTargets.forEach((target) => {
    target.classList.add('is-visible');
  });
}
