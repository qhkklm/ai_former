import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    manifest_version: 3,
    name: "智能表单填充助手",
    version: "1.0",
    description: "使用大模型智能识别和填充网页表单",
    icons: {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
    permissions: ["activeTab", "contextMenus", "storage", "sidePanel", "scripting"],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "打开表单填充助手",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content.js"],
        all_frames: true,
      },
    ],
    web_accessible_resources: [
      {
        resources: ["qrcode.jpg"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
