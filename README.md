# clasher
A tool for managing network routing rules

# 配置文件维护工具

这是一个基于Chrome浏览器的插件，用于维护和更新网络分流软件的配置文件。它可以记录您访问的域名，并根据预设规则将其转换为相应的配置格式。

## 主要功能

1. **域名记录**
   - 自动记录当前页面涉及的所有域名
   - 支持记录页面跳转前后的域名
   - 仅记录当前标签页的域名

2. **规则转换**
   - 支持 DOMAIN-SUFFIX 格式（适用于顶级域名）
   - 支持 DOMAIN 格式（适用于特定子域名）
   - 支持 IP-CIDR 格式（适用于 IP 地址，自动添加 /32 和 no-resolve）
   - 智能合并相似域名规则

3. **白名单机制**
   - 支持特定域名的白名单保护
   - 保护白名单域名的原有配置规则
   - 支持关键词匹配的白名单规则

4. **配置文件管理**
   - 支持导入现有配置文件
   - 自动保存配置修改
   - 支持导出更新后的配置
   - 配置持久化存储

## 安装方法

1. 下载本仓库的所有文件
2. 打开Chrome浏览器，进入扩展程序页面（chrome://extensions/）
3. 开启开发者模式
4. 点击"加载已解压的扩展程序"
5. 选择包含本插件文件的文件夹

## 使用说明

1. **初始设置**
   - 点击插件图标
   - 上传初始配置文件模板
![上传自己的配置文件](https://github.com/user-attachments/assets/07315ce5-fdfc-4e54-82da-f7f4754499e1)

2. **记录域名**
   - 正常浏览网页，插件会自动记录域名
   - 每个标签页独立记录
![转换格式](https://github.com/user-attachments/assets/dedcbd15-7f05-4b81-89f8-5b65b84dea0a)

3. **转换规则**
   - 点击"Convert"按钮转换记录的域名
   - 选择相应的分流标签
   - 点击"Add to Configuration"添加到配置文件
![选择标签并更改配置文件](https://github.com/user-attachments/assets/3605fe9c-ee66-4ca2-910d-08d050931703)

4. **导出配置**
   - 点击"Export"按钮导出更新后的配置文件

## 文件说明

- `manifest.json`: 插件配置文件
- `popup.html`: 弹出窗口界面
- `popup.js`: 主要功能实现
- `background.js`: 后台域名记录
- `images/`: 图标文件夹

## 特点说明

1. **智能规则转换**
   - 当同一顶级域名出现两次或以上时自动使用 DOMAIN-SUFFIX
   - IP地址自动转换为 IP-CIDR 格式

2. **白名单保护**
   - 预设的白名单域名不会被新规则覆盖
   - 支持子域名保护

3. **配置保护**
   - 自动检测并跳过重复规则
   - 保护原有配置结构

## 注意事项

1. 请确保上传的配置文件格式正确
2. 建议定期导出并备份配置文件
3. 白名单域名可以在代码中修改

## 配置文件格式要求

配置文件应为YAML格式，包含以下主要部分：
```yaml
proxy-groups:
  - name: tag1
  - name: tag2

rules:
  - DOMAIN-SUFFIX,example.com,tag1
  - DOMAIN,sub.example.com,tag2
```

## 许可证

[MIT License](LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。
