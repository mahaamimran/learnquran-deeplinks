function init() {
  hideSpinner();
  showFallback();
}

function hideSpinner() {
  const r = document.getElementById("redirect-state");
  if (r) r.style.display = "none";
}
function showFallback() {
  const f = document.getElementById("fallback-ui");
  if (f) f.style.display = "flex";
}

window.onload = init;
