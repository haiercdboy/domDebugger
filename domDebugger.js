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
    title: 'Dom Debugger',
    id: 'BreakPoint',
    contexts,
  });
  chrome.contextMenus.create({
    title: '检测右键节点事件',
    id: 'viewListeners',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    title: '右键节点开启断点',
    id: 'addBreakPoint',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    title: '选中节点开启断点',
    id: 'addBreakPointOnElement',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    title: '取消所有节点断点',
    id: 'removeBreakPoint',
    parentId,
    contexts,
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.tabs.sendMessage(tab.id, {
    action: info.menuItemId,
  });
});
