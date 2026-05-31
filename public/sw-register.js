if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(reg) { console.log('Konek SW registered:', reg.scope); })
      .catch(function(err) { console.log('Konek SW failed:', err); });
  });
}
