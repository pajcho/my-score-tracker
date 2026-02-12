export function getBaseName() {
  const isGitHubPages = window.location.hostname === 'pajcho.github.io';
  if (!isGitHubPages) {
    return '/';
  }

  return '/my-score-tracker';
}
