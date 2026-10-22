// Story mode boot: sets the mode before first paint so there is no flash. No-JS visitors never run this and see both sections stacked.
(function () {
  try {
    var h = location.hash === '#explore' ? 'explore' : location.hash === '#quick' ? 'quick' : null;
    var s = null;
    try { s = sessionStorage.getItem('story-mode'); } catch (e) {}
    document.documentElement.setAttribute('data-story', h || (s === 'explore' ? 'explore' : 'quick'));
  } catch (e) {}
})();
