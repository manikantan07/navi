(function () {
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var apiKey = script.getAttribute('data-key');
  if (!apiKey) return;

  var base = 'https://navi-ebon.vercel.app';

  // Inject styles
  var style = document.createElement('style');
  style.textContent = [
    '#navi-widget-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#6366f1;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:99998;display:flex;align-items:center;justify-content:center;}',
    '#navi-widget-btn svg{width:28px;height:28px;fill:white;}',
    '#navi-widget-frame{position:fixed;bottom:92px;right:24px;width:380px;height:600px;border:none;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:99999;display:none;background:#fff;}',
    '@media(max-width:480px){#navi-widget-frame{width:100vw;height:100dvh;bottom:0;right:0;border-radius:0;}}'
  ].join('');
  document.head.appendChild(style);

  // Button
  var btn = document.createElement('button');
  btn.id = 'navi-widget-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>';
  btn.setAttribute('aria-label', 'Open chat');
  document.body.appendChild(btn);

  // Iframe
  var frame = document.createElement('iframe');
  frame.id = 'navi-widget-frame';
  frame.src = base + '/widget?key=' + encodeURIComponent(apiKey);
  frame.allow = 'autoplay';
  document.body.appendChild(frame);

  var open = false;
  btn.addEventListener('click', function () {
    open = !open;
    frame.style.display = open ? 'block' : 'none';
    btn.innerHTML = open
      ? '<svg viewBox="0 0 24 24"><path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>';
  });
})();
