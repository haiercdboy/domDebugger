
chrome.devtools.inspectedWindow.eval(
  `
    let _debug__node;
    let _debug__listeners;
    let _debug__keys;
    let _debug__unAddBreakPoint;
    let _debug__undebugs = [];
  `
);
function getListeners(nodeId, unAddBreakPoint, isElementNode) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(
      `
        _debug__node = ${isElementNode} ? $0 : document.getElementById('${nodeId}');
        _debug__listeners = getEventListeners(_debug__node);
        _debug__keys = Object.keys(_debug__listeners);
        _debug__unAddBreakPoint = ${unAddBreakPoint};
        !_debug__unAddBreakPoint && _debug__keys.forEach(evt => {
          let fn;
          let last;
          _debug__listeners[evt].forEach(item => {
            fn = fn || item.listener.value || item.listener.listener?.listener;
            last = item;
          });
          fn = fn || last.listener;
          debug(fn);
          _debug__undebugs.push(() => undebug(fn));
        });
        _debug__keys
      `,
      (result, isException) => {
        isException ? reject(isException) : resolve(result);
      }
    );
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.action) {
    case 'getNodeListeners':
      const nodeId = request.nodeId;
      const unAddBreakPoint = request.unAddBreakPoint;
      const isElementNode = request.isElementNode;
      getListeners(nodeId, unAddBreakPoint, isElementNode)
        .then((listeners) => {
          sendResponse(listeners.length ? listeners : []);
        })
        .catch(() => {
          sendResponse([]);
        });
      break;
    case 'removeBreakPoint':
      chrome.devtools.inspectedWindow.eval(
        `
          _debug__keys = { length: _debug__undebugs.length };
          _debug__undebugs.forEach(cancel => cancel());
          _debug__undebugs = [];
          _debug__keys
        `,
        sendResponse,
      );
  }
  return true;
});
