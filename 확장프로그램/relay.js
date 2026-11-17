window.addEventListener('message', function (e) {
  if (e.source !== window || !e.data || !e.data.__shExtResult) { return; }
  try { chrome.runtime.sendMessage({ type: 'result', payload: e.data.payload }); } catch (err) { }
});
