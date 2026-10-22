// LungScope world: decides before first paint whether the pinned timeline runs (html.ls-live) or the stacked static frames show.
// Static frames: no script, reduced motion, or a screen too short for the pinned stage.
(function () {
  try {
    var d = document.documentElement;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var narrow = window.innerWidth < 720;
    var ok = !reduce && window.innerWidth >= 320 && window.innerHeight >= (narrow ? 640 : 600);
    if (ok) d.classList.add('ls-live');
  } catch (e) { /* the static frames show */ }
})();
