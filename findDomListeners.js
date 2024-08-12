const generateId = () => Math.floor(Math.random() * 0xffffff).toString(16);
const getListeners = (node, unAddBreakPoint) => {
  return new Promise((resolve) => {
    let isElementNode = node === '$0';
    let nodeId;
    let hasId;
    if (!isElementNode) {
      nodeId = node.id;
      hasId = !!nodeId;
      if (!hasId) {
        nodeId = node.id = `_debug__${generateId()}`;
      }
    }

    chrome.runtime.sendMessage(
      { action: 'getNodeListeners', nodeId, unAddBreakPoint, isElementNode },
      (response) => {
        !isElementNode && !hasId && node.removeAttribute('id');
        resolve(response);
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
  let isElementNode = node === '$0';
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
    unAddBreakPoint
      ? log(
        `${listeners.length} ${listeners.length > 1 ? 'listeners' : 'listener'} found on ${node.nodeName}`,
        listeners,
        node,
      )
      : log(`Breakpoint added to '${isElementNode ? "$0" : node.nodeName}' on '${listeners}' event`);
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
