const generateId = () => Math.floor(Math.random() * 0xffffff).toString(16);
const getListeners = (node, unAddBreakPoint) => {
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
      { action: 'getNodeListeners', node: isElementNode ? node : nodeId, unAddBreakPoint, isElementNode },
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
const findListeners = async (node, unAddBreakPoint) => {
  let isElementNode = typeof node === 'string';
  if (!node || node.nodeName === 'BODY' || node.nodeName === 'HTML') {
    log('0 listener found');
    return;
  }

  const listeners = await getListeners(node, unAddBreakPoint);
  // 在body内（不含）逐层往上查找
  if (!listeners?.length) {
    if (!isElementNode) {
      return findListeners(node.parentNode, unAddBreakPoint);
    }
    log('0 listener found');
  } else if (listeners.length) {
    let nodeName = isElementNode ? node : node.nodeName;
    unAddBreakPoint
      ? log(
        `${listeners.length} ${listeners.length > 1 ? 'events' : 'event'} found on ${nodeName}`,
        listeners,
        node,
      )
      : log(`Breakpoint added to '${nodeName}' on '${listeners}' event`);
  }
};

let lastTarget;
document.addEventListener("contextmenu", function (event) {
  lastTarget = event.target;
});

chrome.runtime.onMessage.addListener(function (request) {
  switch (request.action) {
    case 'addBreakPoint':
      findListeners(lastTarget);
      break;
    case 'viewListeners':
      findListeners(lastTarget, true);
      break;
    case 'addBreakPointOnElement':
      findListeners('$0');
      break;
    case 'viewListenersOnElement':
      findListeners('$0', true);
      break;
    case 'removeBreakPoint':
      chrome.runtime.sendMessage(
        { action: 'removeBreakPoint' },
        response => {
          let msg = response.length > 1
            ? `${response.length} breakpoints have removed`
            : `${response.length} breakpoint has removed`; 
          log(msg);
        }
      );
  }
});
