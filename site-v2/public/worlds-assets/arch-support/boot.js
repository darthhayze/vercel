// Arch-support world: marks the page as script-ready before first paint so entrance animations can start from their hidden state.
// Without script, nothing is hidden and every drawing shows its final state. If the page script never reports ready, the hidden state is removed.
(function () {
  var d = document.documentElement;
  d.classList.add('as-js');
  setTimeout(function () { if (!window.__asReady) d.classList.remove('as-js'); }, 6000);
})();
