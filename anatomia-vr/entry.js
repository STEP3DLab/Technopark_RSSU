// Shared links select a mode only; they never contain a score or learner record.
export function practiceFromURL(base) {
  try {
    const params = new URL(base).searchParams;
    const modes = params.getAll('practice');
    if (modes.length !== 1 || params.has('compare') || params.has('lesson')) return null;
    return ['recognition','verbal','contrast','results','hub'].includes(modes[0]) ? modes[0] : null;
  } catch { return null; }
}
function launchSharedPractice() {
  const mode = practiceFromURL(location.href);
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(`anatomia:${name}`, {detail}));
  if (mode === 'recognition' || mode === 'verbal') emit('recognition', {mode:mode === 'verbal' ? 'verbal' : 'visual'});
  else if (mode === 'contrast') emit('workbench', {mode:'contrast'});
  else if (mode === 'results') emit('progress-report', {});
  else if (mode === 'hub') emit('navigate', {action:'practice'});
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', launchSharedPractice, {once:true});
  else launchSharedPractice();
}
