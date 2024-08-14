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
    title: '右键Dom: 开启断点',
    id: 'addBreakPoint',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    title: '右键Dom: 检测事件',
    id: 'viewListeners',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    type: 'separator',
    id: 'separator1',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    title: '选中Dom: 开启断点',
    id: 'addBreakPointOnElement',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    title: '选中Dom: 检测事件',
    id: 'viewListenersOnElement',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    type: 'separator',
    id: 'separator2',
    parentId,
    contexts,
  });
  chrome.contextMenus.create({
    title: '取消Dom断点',
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
