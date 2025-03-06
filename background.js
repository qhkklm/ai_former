// 注册侧边栏
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// 添加右键菜单
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "openSidePanel",
    title: "打开表单填充助手",
    contexts: ["page"]
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openSidePanel") {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});