export function getBaseName() {
  // When hosted on GitHub Pages, this gives "/my-score-tracker"
  const path = window.location.pathname;
  // Take only the first part ("/my-score-tracker")
  const segments = path.split('/').filter(Boolean);
  return segments.length ? `/${segments[0]}` : '/';
}