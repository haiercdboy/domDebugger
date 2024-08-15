const log = function (msg) {
  chrome.devtools.inspectedWindow.eval(
    `
      console.log('${msg}');
    `
  );
}

let curTabId;
chrome.runtime.sendMessage({ type: "GET_TAB_ID" }, function(response) {
  curTabId = response.tabId;
});

// eval scripts;
const evalScript = function (node, addBreakPoint, isElementNode) {
  let undebugs = window._debug__undebugs ?? [];
  // console.log('dom debugger params', node, addBreakPoint, isElementNode);
  // 仅对以下事件加断点
  const listenerSchedule = [
    'click',
    'dblclick',
    // 'mousedown',
    // 'mouseup',
    // 'mousemove',
    // 'mouseover',
    // 'mouseout',
    // 'mouseenter',
    // 'mouseleave',
    'keydown',
    'keyup',
    'keypress',
    'submit',
    'reset',
    'focus',
    'blur',
    'change',
    'select',
    'contextmenu',
    // 'drag',
    'dragstart',
    'dragend',
    'dragover',
    'drop',
    'transitionend',
    'animationend',
  ];
  node = isElementNode ? (new Function(`return ${node}`))() : document.getElementById(node);
  if (!node) {
    return [];
  }
  
  let listeners = getEventListeners(node);
  let keys = listeners ? Object.keys(listeners) : [];
  if (addBreakPoint && keys.length) {
    listenerSchedule.forEach(evt => {
      listeners[evt]?.forEach(l => {
        let h = l.listener.value || l.listener.listener?.listener || l.listener;
        debug(h);
        undebugs.push(() => undebug(h));
      });
    });
  }
  window._debug__undebugs = undebugs;
  // console.log('dom debugger', keys, listeners, undebugs);
  return keys;
}

// eval scripts;
const removeBreaks = function () {
  let undebugs = window._debug__undebugs ?? [];
  let keys = new Array(undebugs.length);
  // console.log('dom debugger keys', keys, undebugs);
  undebugs.forEach(cancel => cancel());
  undebugs.length = 0;
  window._debug__undebugs = undebugs;
  return keys ?? [];
}

const getListeners = function (node, addBreakPoint, isElementNode) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(
      `
        (${evalScript.toString()})('${node}', ${addBreakPoint}, ${isElementNode})
      `,
      (result, isException) => {
        isException ? reject(isException) : resolve(result);
      }
    );
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  const tabId = sender.tab?.id;
  if (tabId && curTabId !== tabId) {
    return;
  }
  switch (request.action) {
    case 'getNodeListeners':
      const node = request.node;
      const addBreakPoint = request.addBreakPoint;
      const isElementNode = request.isElementNode;
      getListeners(node, addBreakPoint, isElementNode, tabId)
        .then((listeners) => {
          sendResponse(listeners ?? []);
        })
        .catch(err => {
          sendResponse(err);
        });
      break;
    case 'removeBreakPoint':
      chrome.devtools.inspectedWindow.eval(
        `(${removeBreaks.toString()})()`,
        sendResponse
      );
  }
  return true;
});
