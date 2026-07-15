function redirectToAppOrStore() {
    const androidStore =
      "https://play.google.com/store/apps/details?id=com.alhuda.apps.learnquran";
    const iosStore =
      "https://apps.apple.com/app/learn-quran/id1483311132";
  
    const ua = navigator.userAgent;
    const isAndroid = /android/i.test(ua);
    const isIOS     = /iphone|ipad|ipod/i.test(ua);
  
    if (!isAndroid && !isIOS) {
      hideSpinner();
      showFallback();
      return;
    }
  
    const a = document.createElement("a");
    a.href = isIOS ? iosStore : androidStore;
    document.body.appendChild(a);
    a.click();
  
    setTimeout(() => {
      hideSpinner();
      showFallback();
    }, 2000);
  }
  
  function hideSpinner() {
    const r = document.getElementById("redirect-state");
    if (r) r.style.display = "none";
  }
  function showFallback() {
    const f = document.getElementById("fallback-ui");
    if (f) f.style.display = "flex";
  }
  
  window.onload = redirectToAppOrStore;
