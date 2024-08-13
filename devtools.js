
chrome.devtools.inspectedWindow.eval(
  `
    let _debug__undebugs = [];
  `
);
function getListeners(node, unAddBreakPoint, isElementNode) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(
      `
        var _debug__node;
        var _debug__listeners;
        var _debug__keys;
        var _debug__unAddBreakPoint;
        console.log('dom debugger node', '${node}');
        _debug__node = ${isElementNode} ? ${node} : document.getElementById('${node}');
        _debug__listeners = getEventListeners(_debug__node);
        _debug__keys = _debug__listeners ? Object.keys(_debug__listeners) : [];
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
        console.log('dom debugger _debug__keys', _debug__keys, _debug__node);
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
      const node = request.node;
      const unAddBreakPoint = request.unAddBreakPoint;
      const isElementNode = request.isElementNode;
      getListeners(node, unAddBreakPoint, isElementNode)
        .then((listeners) => {
          sendResponse(listeners ?? []);
        })
        .catch(err => {
          sendResponse(err);
        });
      break;
    case 'removeBreakPoint':
      chrome.devtools.inspectedWindow.eval(
        `
          var _debug__keys = new Array(_debug__undebugs.length);
          console.log('dom debugger _debug__keys', _debug__keys, _debug__undebugs);
          _debug__undebugs.forEach(cancel => cancel());
          _debug__undebugs = [];
          _debug__keys ?? []
        `,
        sendResponse,
      );
  }
  return true;
});
