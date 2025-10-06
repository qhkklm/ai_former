import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  // 注册侧边栏
  chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });

  // 添加右键菜单
  chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
      id: "openSidePanel",
      title: "打开表单填充助手",
      contexts: ["page"],
    });
  });

  // 处理右键菜单点击
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "openSidePanel") {
      if (tab?.id != null) chrome.sidePanel.open({ tabId: tab.id });
    }
  });

  // 监听来自侧边栏的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ollamaRequest") {
      console.log("发送请求到:", request.url);
      console.log("请求数据:", request.data);

      // 发送请求到 Ollama API
      fetch(request.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        mode: "cors",
        credentials: "omit",
        body: JSON.stringify(request.data),
      })
        .then(async (response) => {
          // 检查响应状态
          if (!response.ok) {
            const errorText = await response.text().catch(() => "无法获取错误详情");
            console.error("Ollama 响应错误:", {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              errorText: errorText,
            });
            throw new Error(`Ollama API 错误 (${response.status}): ${errorText}\n\n可能的原因：
1. Ollama 服务未启动
2. 服务地址不正确（请确保使用 http://127.0.0.1:11434）
3. Ollama 未正确配置 CORS，请使用以下命令启动：
   OLLAMA_ORIGINS="*" ollama serve
4. 防火墙阻止了连接
5. Ollama 服务配置问题`);
          }

          // 获取响应文本
          const text = await response.text();

          // 检查响应文本是否为空
          if (!text) {
            throw new Error("Ollama 返回了空响应");
          }

          try {
            // 尝试解析 JSON
            const data = JSON.parse(text);
            console.log("Ollama 响应成功:", data);
            sendResponse({ success: true, data: data });
          } catch (error) {
            console.error("JSON 解析错误:", error);
            console.error("原始响应:", text);
            throw new Error(`JSON 解析失败: ${error.message}\n原始响应: ${text.substring(0, 100)}...`);
          }
        })
        .catch((error) => {
          console.error("Ollama API 请求失败:", error);
          sendResponse({
            success: false,
            error: error.message,
            errorType: error.name,
            timestamp: new Date().toISOString(),
          });
        });

      // 返回 true 表示将异步发送响应
      return true;
    }
  });

  // 监听扩展安装或更新事件
  chrome.runtime.onInstalled.addListener(() => {
    // 注册侧边栏
    chrome.sidePanel?.setOptions?.({
      enabled: true,
      path: "sidepanel.html",
    });
  });
});
