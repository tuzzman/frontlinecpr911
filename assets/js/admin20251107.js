/* Versioned build alias for admin.v3.js to bust caches */
(function(){
  const s = document.createElement('script');
  s.src = '/assets/js/admin.v3.js?v=20251107';
  s.defer = true;
  (document.currentScript||document.body).appendChild(s);
})();
