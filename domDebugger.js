let debuggerDefer;
function sendCommand(tabId, cmd, params) {
    return new Promise((resolve) => {
      chrome.debugger.sendCommand({tabId}, cmd, params, resolve);
    });
}
function attachDebugger(tabId) {
  return (debuggerDefer ??= new Promise((reolve) => {
    Promise.all([
      new Promise((reslv) => chrome.debugger.attach({tabId}, '1.3', reslv)),
      sendCommand(tabId, 'Runtime.enable'),
      sendCommand(tabId, 'Debugger.enable'),
    ]).finally(reolve);
  }));
}
async function detachDebugger(tabId) {
  if (!debuggerDefer) {
    return;
  }
  debuggerDefer = undefined;
  await removeBreakpoints(tabId);
  chrome.debugger.detach({ tabId });
}
chrome.debugger.onDetach.addListener(() => {
  debuggerDefer = undefined;
  breakpoints.length = 0;
});

const breakpoints = [];
function removeBreakpoints(tabId) {
  let de = [];
  breakpoints.forEach((bp) => {
    de.push(
      sendCommand(tabId, 'Debugger.removeBreakpoint', {
        breakpointId: bp,
      })
    );
  });
  breakpoints.length = 0;
  return Promise.all(de);
}
async function addBreakPointTo(listeners = [], tabId) {
  await removeBreakpoints(tabId);
  listeners.forEach((listener) => {
    sendCommand(
      tabId,
      'Debugger.setBreakpoint',
      {
        location: {
          scriptId: listener.scriptId,
          lineNumber: listener.lineNumber,
          columnNumber: listener.columnNumber,
        },
      }
    ).then(response => {
      let bp = response?.breakpointId;
      bp && breakpoints.push(bp);
    });
  });
}

const contexts = [
  'page',
  'selection',
  'link',
  'editable',
  'image',
  'video',
  'audio'
];
chrome.runtime.onInstalled.addListener(function () {
  const parentId = chrome.contextMenus.create({
    title: '在当前Dom节点调试',
    id: 'BreakPoint',
    contexts,
  });
  chrome.contextMenus.create({
    title: '开启断点',
    id: 'addBreakPoint',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    title: '取消断点',
    id: 'removeBreakPoint',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    title: '检测事件',
    id: 'viewListeners',
    parentId,
    contexts,
  });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'removeBreakPoint':
      detachDebugger(tab.id);
      break;
    case 'addBreakPoint':
    case 'viewListeners':
      chrome.tabs.sendMessage(tab.id, {
        action: info.menuItemId,
      });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  const tabId = sender.tab.id;
  if (request.action === 'getNodeListeners') {
    const nodeId = request.nodeId;
    const unAddBreakPoint = request.unAddBreakPoint;
    attachDebugger(tabId).then(() => {
      sendCommand(
        tabId,
        'Runtime.evaluate',
        {
          expression: `(function() { return document.getElementById('${nodeId}'); })()`,
        }
      ).then(response => {
        const objectId = response.result?.objectId;
        if (objectId) {
          return sendCommand(
            tabId,
            'DOMDebugger.getEventListeners',
            { objectId }
          );
        }
        else {
          throw new Error('Failed to get objectId');
        }
      }).then(({ listeners }) => {
        if (listeners.length && !unAddBreakPoint) {
          addBreakPointTo(listeners, tabId);
        }
        sendResponse(listeners);
      })
      .catch(() => {
        sendResponse([]);
      });
    });

    // 返回true表示异步响应
    return true;
  }
});

chrome.webNavigation.onDOMContentLoaded.addListener(async ({ tabId }) => {
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['findDomListeners.js'],
  });
});
