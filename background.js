chrome.browserAction.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "extractXPaths" });
});

// 添加右键菜单
chrome.contextMenus.create({
    id: "removeHighlights",
    title: "移除高亮",
    contexts: ["page"]
});

chrome.contextMenus.create({
    id: "extractForms",
    title: "识别页面表单",
    contexts: ["page"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "removeHighlights") {
        chrome.tabs.sendMessage(tab.id, { action: "removeHighlights" });
    } else if (info.menuItemId === "extractForms") {
        chrome.tabs.sendMessage(tab.id, { action: "extractXPaths" });
    }
});

// 处理安装和更新事件
chrome.runtime.onInstalled.addListener(function(details) {
    // 设置默认配置
    const defaultConfig = {
        type: 'ollama',
        url: 'http://localhost:11434',
        model: 'llama3'
    };
    
    // 通义千问默认配置
    const qianwenDefaultConfig = {
        type: 'qianwen',
        apiKey: '',  // 用户需要填写自己的API Key
        model: 'qwen-turbo'
    };
    
    chrome.storage.sync.get('modelConfig', function(data) {
        if (!data.modelConfig) {
            chrome.storage.sync.set({modelConfig: defaultConfig});
        }
    });
    
    // 添加右键菜单项：切换模型
    chrome.contextMenus.create({
        id: "switchToOllama",
        title: "切换到Ollama模型",
        contexts: ["browser_action"]
    });
    
    chrome.contextMenus.create({
        id: "switchToQianwen",
        title: "切换到通义千问模型",
        contexts: ["browser_action"]
    });
    
    // 处理模型切换
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === "switchToOllama") {
            chrome.storage.sync.set({modelConfig: defaultConfig});
        } else if (info.menuItemId === "switchToQianwen") {
            chrome.storage.sync.set({modelConfig: qianwenDefaultConfig});
        }
    });
});