const generateId = () => Math.floor(Math.random() * 0xffffff).toString(16);
const getListeners = (node, unAddBreakPoint) => {
  return new Promise((resolve) => {
    let nodeId = node.id;
    const hasId = !!nodeId;
    if (!hasId) {
      nodeId = node.id = `_debug__${generateId()}`;
    }

    chrome.runtime.sendMessage(
      { action: 'getNodeListeners', nodeId, unAddBreakPoint },
      function (response) {
        !hasId && node.removeAttribute('id');
        resolve(response);
      }
    );
  });
};

const logStyle = 'background-color: green; color: #fff; border-radius: 3px; padding: 2px 4px;';
const findListeners = async (node, unAddBreakPoint) => {
  if (!node || node.nodeName === 'BODY') {
    console.log(
      `%c0 listener found`,
      logStyle
    );
    return;
  }

  const listeners = await getListeners(node, unAddBreakPoint);
  // 在body内（不含）逐层往上查找
  if (!listeners?.length) {
    return findListeners(node.parentNode, unAddBreakPoint);
  } else if (listeners.length) {
    console.log(
      `%c${listeners.length} listener found on ${node.nodeName}`,
      logStyle,
      listeners.map((l) => l.type).join(","),
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
      findListeners(lastTarget);
      break;
    case 'viewListeners':
      findListeners(lastTarget, true);
  }
});
