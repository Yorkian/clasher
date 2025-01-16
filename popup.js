let currentConfig = null;
let selectedTag = '';
let whitelist = new Set();

// 初始化白名单
async function initWhitelist() {
  const result = await chrome.storage.local.get('whitelist');
  whitelist = new Set(result.whitelist || [
    'google.com',
    'googleapis.com',
    'gstatic.com',
    'challenges.cloudflare.com',
    'hm.baidu.com',
    'doubleclick.net'
  ]);
  updateWhitelistDisplay();
}

// 更新白名单显示
function updateWhitelistDisplay() {
  const container = document.getElementById('whitelistContainer');
  container.innerHTML = '';
  
  whitelist.forEach(domain => {
    const item = document.createElement('div');
    item.className = 'whitelist-item';
    item.innerHTML = `
      ${domain}
      <span class="remove" data-domain="${domain}">×</span>
    `;
    container.appendChild(item);
  });
}

// 保存白名单到存储
async function saveWhitelist() {
  await chrome.storage.local.set({
    whitelist: Array.from(whitelist)
  });
}

// 添加白名单域名
async function addWhitelistDomain(domain) {
  domain = domain.trim().toLowerCase();
  if (!domain) return;
  
  whitelist.add(domain);
  await saveWhitelist();
  updateWhitelistDisplay();
}

// 移除白名单域名
async function removeWhitelistDomain(domain) {
  whitelist.delete(domain);
  await saveWhitelist();
  updateWhitelistDisplay();
}

// 检查域名是否在白名单中
function isInWhitelist(domain, ruleType = '') {
  // 如果是DOMAIN-KEYWORD类型的规则
  if (ruleType === 'DOMAIN-KEYWORD') {
    return Array.from(whitelist).some(whitelistedDomain => {
      // 检查关键词是否是白名单域名的一部分
      return whitelistedDomain.includes(domain);
    });
  }
  
  // 对于其他类型的规则，使用原有的匹配逻辑
  return Array.from(whitelist).some(whitelistedDomain => {
    return domain === whitelistedDomain || domain.endsWith('.' + whitelistedDomain);
  });
}

// 从规则中提取域名和类型
function extractDomainFromRule(rule) {
  const parts = rule.replace(/^\s*-\s*/, '').split(',');
  if (parts.length < 2) return null;
  
  const type = parts[0];
  const domain = parts[1];
  
  if (type === 'DOMAIN-SUFFIX' || type === 'DOMAIN' || type === 'DOMAIN-KEYWORD') {
    return { type, domain };
  }
  return null;
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 从 storage 加载配置
    const result = await chrome.storage.local.get(['configFile', 'configFileName']);
    if (result.configFile) {
      currentConfig = result.configFile;
      updateConfigFileInfo(result.configFileName);
      updateTagButtons();
    }

    // 获取并显示记录的域名
    updateDomainList();

    // 初始化白名单
    await initWhitelist();

    // 设置事件监听器
    document.getElementById('configFileInput').addEventListener('change', handleConfigFileUpload);
    document.getElementById('deleteConfigBtn').addEventListener('click', deleteConfig);
    document.getElementById('exportConfigBtn').addEventListener('click', exportConfig);
    document.getElementById('convertBtn').addEventListener('click', convertDomains);
    document.getElementById('addToConfigBtn').addEventListener('click', addToConfig);

    // 白名单显示/隐藏切换
    document.getElementById('toggleWhitelist').addEventListener('click', () => {
      const content = document.getElementById('whitelistContent');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });

    // 添加白名单域名
    document.getElementById('addWhitelistDomain').addEventListener('click', async () => {
      const input = document.getElementById('newWhitelistDomain');
      await addWhitelistDomain(input.value);
      input.value = '';
    });

    // 删除白名单域名
    document.getElementById('whitelistContainer').addEventListener('click', async (e) => {
      if (e.target.classList.contains('remove')) {
        const domain = e.target.dataset.domain;
        await removeWhitelistDomain(domain);
      }
    });

    // 添加回车键添加域名功能
    document.getElementById('newWhitelistDomain').addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const input = e.target;
        await addWhitelistDomain(input.value);
        input.value = '';
      }
    });
  } catch (error) {
    console.error('Initialization error:', error);
  }
});

// 更新域名列表
async function updateDomainList() {
  const domains = await chrome.runtime.sendMessage({action: 'getDomains'});
  document.getElementById('domainTextArea').value = domains.join('\n');
}

// 处理配置文件上传
async function handleConfigFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      currentConfig = e.target.result;
      
      // 保存到 storage
      await chrome.storage.local.set({
        configFile: currentConfig,
        configFileName: file.name
      });
      
      // 更新界面
      updateConfigFileInfo(file.name);
      updateTagButtons();
    };
    reader.readAsText(file);
  } catch (error) {
    console.error('File upload error:', error);
  }
}

// 更新配置文件信息显示
function updateConfigFileInfo(fileName = '') {
  try {
    const info = document.getElementById('configFileInfo');
    const deleteBtn = document.getElementById('deleteConfigBtn');
    const exportBtn = document.getElementById('exportConfigBtn');
    const selectFileLabel = document.getElementById('selectFileLabel');

    if (currentConfig) {
      info.textContent = `正在编辑配置文件：${fileName}`;
      info.className = 'config-info has-file';
      // 显示删除和导出按钮，隐藏文件选择按钮
      deleteBtn.style.display = 'inline-block';
      exportBtn.style.display = 'inline-block';
      selectFileLabel.style.display = 'none';
    } else {
      info.textContent = '请上传配置文件';
      info.className = 'config-info no-file';
      // 隐藏删除和导出按钮，显示文件选择按钮
      deleteBtn.style.display = 'none';
      exportBtn.style.display = 'none';
      selectFileLabel.style.display = 'inline-block';
    }
  } catch (error) {
    console.error('Update config info error:', error);
  }
}

// 更新Tag按钮
function updateTagButtons() {
  try {
    if (!currentConfig) return;
    
    const tagContainer = document.getElementById('tagContainer');
    tagContainer.innerHTML = '';

    const proxyGroups = parseProxyGroups(currentConfig);

    proxyGroups.forEach(tag => {
      const button = document.createElement('button');
      button.textContent = tag;
      button.className = 'tag-button';
      button.onclick = () => selectTag(tag);
      tagContainer.appendChild(button);
    });
  } catch (error) {
    console.error('Update tag buttons error:', error);
  }
}

// 从配置中解析代理组
function parseProxyGroups(config) {
  const groups = [];
  const lines = config.split('\n');
  let inProxyGroups = false;

  for (const line of lines) {
    if (line.trim() === 'proxy-groups:') {
      inProxyGroups = true;
      continue;
    }
    if (inProxyGroups && line.includes('name:')) {
      const match = line.match(/name:\s*(.+)/);
      if (match) {
        groups.push(match[1].trim());
      }
    }
    if (inProxyGroups && !line.startsWith(' ')) {
      inProxyGroups = false;
    }
  }

  return groups;
}

// 删除配置
async function deleteConfig() {
  try {
    currentConfig = null;
    // 清除存储的配置
    await chrome.storage.local.remove(['configFile', 'configFileName']);
    updateConfigFileInfo();
    document.getElementById('tagContainer').innerHTML = '';
  } catch (error) {
    console.error('Delete config error:', error);
  }
}

// 导出配置
function exportConfig() {
  try {
    if (!currentConfig) return;
    
    const blob = new Blob([currentConfig], {type: 'text/yaml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export config error:', error);
  }
}

// 检查是否是IP地址
function isIPAddress(str) {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(str)) return false;
  
  // 验证每个数字是否在0-255范围内
  const parts = str.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

// 转换域名为规则格式
function convertDomains() {
  const textarea = document.getElementById('domainTextArea');
  const domains = textarea.value.split('\n').filter(d => d.trim());
  
  // 用于存储顶级域名和其对应的完整域名列表
  const domainMap = new Map();
  const convertedRules = [];

  domains.forEach(domain => {
    // 检查是否是IP地址
    if (isIPAddress(domain)) {
      // IP地址使用 IP-CIDR 格式
      convertedRules.push(` - IP-CIDR,${domain}/32,no-resolve`);
      return;
    }

    const parts = domain.split('.');
    if (parts.length < 2) return;

    // 获取顶级域名 (例如: v2ex.com)
    const topDomain = parts.slice(-2).join('.');
    
    if (!domainMap.has(topDomain)) {
      domainMap.set(topDomain, new Set());
    }
    domainMap.get(topDomain).add(domain);
  });

  // 处理域名规则
  domainMap.forEach((fullDomains, topDomain) => {
    if (fullDomains.size >= 2) {
      // 如果同一顶级域名出现2次或以上，使用DOMAIN-SUFFIX加顶级域名
      convertedRules.push(` - DOMAIN-SUFFIX,${topDomain}`);
    } else {
      // 只出现一次的情况
      const fullDomain = Array.from(fullDomains)[0];
      if (fullDomain === topDomain) {
        // 如果完整域名就是顶级域名，使用DOMAIN-SUFFIX
        convertedRules.push(` - DOMAIN-SUFFIX,${topDomain}`);
      } else {
        // 如果完整域名包含子域名，使用DOMAIN
        convertedRules.push(` - DOMAIN,${fullDomain}`);
      }
    }
  });

  textarea.value = convertedRules.join('\n');
}

// 选择Tag
function selectTag(tag) {
  selectedTag = tag;
  const textarea = document.getElementById('domainTextArea');
  const rules = textarea.value.split('\n').filter(r => r.trim());
  
  textarea.value = rules.map(rule => {
    // 对于已经完整的规则，直接返回
    if (rule.includes(',', rule.indexOf(',') + 1)) return rule;
    
    // 处理IP-CIDR规则
    if (rule.startsWith(' - IP-CIDR,')) {
      // 如果规则末尾已经有no-resolve，直接在中间插入标签
      if (rule.endsWith(',no-resolve')) {
        return rule.replace(',no-resolve', `,${tag},no-resolve`);
      }
      // 否则在规则末尾添加标签和no-resolve
      return `${rule},${tag},no-resolve`;
    }
    
    // 处理其他规则
    if (!rule.includes(',')) return rule;
    return `${rule},${tag}`;
  }).join('\n');
}

// 添加到配置文件
async function addToConfig() {
  if (!currentConfig || !selectedTag) return;

  try {
    const textarea = document.getElementById('domainTextArea');
    const newRules = textarea.value.split('\n').filter(r => r.trim());
    
    // 处理现有配置
    const lines = currentConfig.split('\n');
    const updatedLines = [];
    let inRulesSection = false;
    let targetIndex = -1;

    // 用于存储需要保留的白名单规则
    const whitelistedRules = new Set();

    // 首先检查新规则中是否包含白名单域名
    newRules.forEach(newRule => {
      const extracted = extractDomainFromRule(newRule);
      if (extracted && isInWhitelist(extracted.domain, extracted.type)) {
        whitelistedRules.add(extracted.domain);
      }
    });

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查是否进入rules区域
      if (line.trim() === 'rules:') {
        inRulesSection = true;
      }
      
      // 在rules区域内寻找第一次出现的标签位置
      if (inRulesSection && line.includes(selectedTag) && targetIndex === -1) {
        targetIndex = updatedLines.length;
      }
      
      // 检查当前行是否是域名规则
      if (inRulesSection && (line.includes('DOMAIN-SUFFIX,') || 
          line.includes('DOMAIN-KEYWORD,') || 
          line.includes('DOMAIN,'))) {
        const extracted = extractDomainFromRule(line);
        
        // 如果当前规则涉及白名单域名，保留原规则
        if (extracted && isInWhitelist(extracted.domain, extracted.type)) {
          updatedLines.push(line);
          continue;
        }
        
        // 检查是否需要跳过现有规则（非白名单规则）
        const shouldSkip = newRules.some(newRule => haveSameEffect(line, newRule));
        if (shouldSkip) continue;
      }
      
      updatedLines.push(line);
    }

    // 插入新规则（排除白名单规则）
    if (targetIndex !== -1) {
      const rulesToAdd = newRules.filter(rule => {
        const extracted = extractDomainFromRule(rule);
        return !extracted || !isInWhitelist(extracted.domain, extracted.type);
      });
      updatedLines.splice(targetIndex, 0, ...rulesToAdd);
    }

    // 保存更新后的配置
    currentConfig = updatedLines.join('\n');
    await chrome.storage.local.set({
      configFile: currentConfig
    });

    // 提供视觉反馈
    const addButton = document.getElementById('addToConfigBtn');
    const originalText = addButton.textContent;
    addButton.textContent = '已添加！';
    setTimeout(() => {
      addButton.textContent = originalText;
    }, 1000);
  } catch (error) {
    console.error('Add to config error:', error);
  }
}
  // 检查两条规则是否有相同效果
  function haveSameEffect(rule1, rule2) {
    // 移除" - "前缀并分割规则
    const [type1, domain1] = rule1.replace(/^\s*-\s*/, '').split(',');
    const [type2, domain2] = rule2.replace(/^\s*-\s*/, '').split(',');
  
    if (type1 === type2) return domain1 === domain2;
  
    if (type1 === 'DOMAIN-KEYWORD' && type2 === 'DOMAIN-SUFFIX') {
      return domain2.includes(domain1);
    }
  
    if (type1 === 'DOMAIN-SUFFIX' && type2 === 'DOMAIN-KEYWORD') {
      return domain1.includes(domain2);
    }
  
    return false;
  }
