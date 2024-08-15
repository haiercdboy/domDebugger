const generateId = () => Math.floor(Math.random() * 0xffffff).toString(16);
const getListeners = (node, addBreakPoint) => {
  return new Promise((resolve, reject) => {
    let isElementNode = typeof node === 'string';
    let nodeId;
    let genId;
    if (!isElementNode) {
      nodeId = node.id;
      if (!nodeId) {
        genId = nodeId = node.id = `_debug__${generateId()}`;
      }
    }

    chrome.runtime.sendMessage(
      { action: 'getNodeListeners', node: isElementNode ? node : nodeId, addBreakPoint, isElementNode },
      (response) => {
        genId && node.removeAttribute('id');
        response?.isException ? reject(response) : resolve(response);
      }
    );
  });
};

const logStyle = 'background-color: green; color: #fff; border-radius: 3px; padding: 2px 4px;';
const log = (msg, ...options) => {
  console.log(
    `%c${msg}`,
    logStyle,
    ...options,
  );
}
const findListeners = async (node, addBreakPoint) => {
  let isElementNode = typeof node === 'string';
  if (!node || node.nodeName === 'BODY' || node.nodeName === 'HTML') {
    log('0 listener found');
    return;
  }

  const listeners = await getListeners(node, addBreakPoint);
  // 在body内（不含）逐层往上查找
  if (!listeners?.length) {
    if (!isElementNode) {
      return findListeners(node.parentNode, addBreakPoint);
    }
    log('0 listener found');
  } else if (listeners.length) {
    let nodeName = isElementNode ? node : node.nodeName;
    addBreakPoint
      ? log(`Breakpoint added to '${nodeName}' on '${listeners}' event`)
      : log(
        `${listeners.length} ${listeners.length > 1 ? 'events' : 'event'} found on ${nodeName}`,
        listeners,
        node,
      );
  }
};

let lastTarget;
document.addEventListener("contextmenu", function (event) {
  lastTarget = event.target;
});

chrome.runtime.onMessage.addListener(function (request) {
  switch (request.action) {
    case 'addBreakPoint':
      findListeners(lastTarget, true);
      break;
    case 'viewListeners':
      findListeners(lastTarget);
      break;
    case 'addBreakPointOnElement':
      findListeners('$0', true);
      break;
    case 'viewListenersOnElement':
      findListeners('$0');
      break;
    case 'removeBreakPoint':
      chrome.runtime.sendMessage(
        { action: 'removeBreakPoint' },
        response => {
          let msg = response?.length > 1
            ? `${response.length} breakpoints have been removed`
            : `${response?.length ?? 0} breakpoint has been removed`;
          log(msg);
        }
      );
  }
});
