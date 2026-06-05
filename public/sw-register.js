if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(reg) { console.log('Klasmeyt SW registered:', reg.scope); })
      .catch(function(err) { console.log('Klasmeyt SW failed:', err); });
  });
}
