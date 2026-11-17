(function () {
  var ready = false, ports = {};
  function post(m) { window.postMessage(Object.assign({ __shExt: true }, m), '*'); }
  function isDash() { return !!document.querySelector('meta[name="sh-dashboard"]'); }
  async function flush() {
    try {
      var items = await chrome.runtime.sendMessage({ type: 'takeOutbox' });
      (items || []).forEach(post);
    } catch (e) { }
  }
  function init() {
    if (!isDash()) { return; }
    ready = true;
    chrome.runtime.sendMessage({ type: 'hello' }).catch(function () { });
    post({ type: 'ready' });
    flush();
  }
  window.addEventListener('message', function (e) {
    if (!ready || e.source !== window || !e.data || !e.data.__shDash) { return; }
    if (e.data.cmd === 'hello') { post({ type: 'ready' }); flush(); return; }
    var cmd = e.data.cmd, pl = e.data.payload || {};
    if (cmd === 'ai-tags') {
      chrome.runtime.sendMessage({ type: 'ai-tags', host: pl.host }).then(function (r) { post({ type: 'ai-tags', id: pl.id, data: r }); }).catch(function (er) { post({ type: 'ai-tags', id: pl.id, data: { error: String((er && er.message) || er) } }); });
      return;
    }
    if (cmd === 'ai-chat') {
      var port = chrome.runtime.connect({ name: 'ai' });
      ports[pl.id] = port;
      port.onMessage.addListener(function (m) { post({ type: m.t, id: pl.id, data: m.d }); if (m.t === 'ai-done' || m.t === 'ai-error') { delete ports[pl.id]; try { port.disconnect(); } catch (x) { } } });
      port.onDisconnect.addListener(function () { if (ports[pl.id]) { delete ports[pl.id]; post({ type: 'ai-error', id: pl.id, data: '확장 프로그램과 연결이 끊겼어요' }); } });
      port.postMessage({ op: 'chat', host: pl.host, body: pl.body });
      return;
    }
    if (cmd === 'ai-abort') { var pp = ports[pl.id]; if (pp) { delete ports[pl.id]; try { pp.disconnect(); } catch (x) { } } return; }
    chrome.runtime.sendMessage({ type: 'dash', cmd: e.data.cmd, auto: !!e.data.auto, payload: e.data.payload }).catch(function () { });
  });
  chrome.runtime.onMessage.addListener(function (m) {
    if (!ready) { return; }
    if (m.type === 'flush') { flush(); }
    if (m.type === 'status') { post({ type: 'status', text: m.text }); }
  });
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
