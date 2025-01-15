// 存储每个标签页的域名记录
let tabDomains = new Map();
let activeTabId = null;

// 监听标签页切换
chrome.tabs.onActivated.addListener((activeInfo) => {
  activeTabId = activeInfo.tabId;
});

// 监听标签页关闭
chrome.tabs.onRemoved.addListener((tabId) => {
  tabDomains.delete(tabId);
});

// 监听网络请求记录域名
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId !== -1) {  // 确保请求来自标签页
      if (!tabDomains.has(details.tabId)) {
        tabDomains.set(details.tabId, new Set());
      }
      if (details.url) {
        const url = new URL(details.url);
        tabDomains.get(details.tabId).add(url.hostname);
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// 清理指定标签页的域名列表
function clearDomains(tabId) {
  if (tabDomains.has(tabId)) {
    tabDomains.set(tabId, new Set());
  }
}

// 获取当前活动标签页的域名列表
async function getActiveTabDomains() {
  const activeTabs = await chrome.tabs.query({active: true, currentWindow: true});
  if (activeTabs.length > 0) {
    const activeTabId = activeTabs[0].id;
    return Array.from(tabDomains.get(activeTabId) || new Set());
  }
  return [];
}

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getDomains':
      getActiveTabDomains().then(domains => sendResponse(domains));
      return true;
    case 'clearDomains':
      if (activeTabId) {
        clearDomains(activeTabId);
      }
      sendResponse({success: true});
      break;
  }
});