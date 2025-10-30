# 夸克网盘文件夹名称快捷复制脚本

一个 Tampermonkey 用户脚本，为夸克网盘添加文件夹名称快捷复制功能。

## 功能特性

- ✅ **智能识别**：自动识别夸克网盘中的文件夹
- ✅ **一键复制**：点击按钮快速复制文件夹名称到剪贴板
- ✅ **美观提示**：复制成功后会显示友好的提示消息
- ✅ **响应式设计**：按钮样式与网盘界面协调
- ✅ **自动适配**：监听页面变化，自动为新加载的文件夹添加复制按钮
- ✅ **多重兼容**：支持多种夸克网盘页面布局

## 安装方法

### 1. 安装 Tampermonkey 扩展

- **Chrome**: 从 [Chrome 网上应用店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) 安装
- **Firefox**: 从 [Firefox 附加组件站](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) 安装
- **Edge**: 从 [Microsoft Store](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) 安装

### 2. 安装脚本

1. 复制 `quark-netdisk-copy-name.user.js` 文件内容
2. 打开 Tampermonkey 管理面板
3. 点击"创建新脚本"
4. 删除默认内容，粘贴复制的脚本代码
5. 按 `Ctrl+S` (Windows/Linux) 或 `Cmd+S` (Mac) 保存

### 3. 使用脚本

1. 访问 [夸克网盘](https://pan.quark.cn)
2. 打开任意文件夹列表页面
3. 在每个文件夹名称右侧会显示一个 📋 图标
4. 点击图标即可复制文件夹名称

## 使用说明

### 按钮位置
复制按钮位于每个文件夹名称的右侧，显示为 📋 图标。

### 操作步骤
1. 浏览夸克网盘文件夹列表
2. 找到需要复制名称的文件夹
3. 点击文件夹名称右侧的 📋 按钮
4. 看到"已复制：[文件夹名称]"的提示消息

### 提示消息
复制成功后，屏幕右上角会显示提示消息，2秒后自动消失。

## 技术细节

### 兼容性
- ✅ Chrome/Edge (Chromium 内核)
- ✅ Firefox
- ✅ Safari (需要 Tampermonkey for Safari)

### 脚本特性
- **无权限要求**：无需额外的 GM_* 权限
- **轻量级**：仅 10KB 左右
- **高性能**：使用 MutationObserver 监听 DOM 变化
- **容错性**：支持多种页面布局和 DOM 结构

### 核心功能实现

#### 1. 文件夹识别
```javascript
checkIfFolder(element)
```
通过多种方式判断元素是否为文件夹：
- 检查 `data-type="folder"` 属性
- 检查类名中是否包含 "folder"
- 检查图标元素
- 启发式分析

#### 2. 名称提取
```javascript
getFolderName(element)
```
智能提取文件夹名称：
- 优先查找名称相关元素
- 过滤无关文本
- 支持多种文本结构

#### 3. 剪贴板操作
```javascript
copyToClipboard(text)
```
支持多种复制方式：
- 现代 Clipboard API
- 传统 execCommand 降级方案
- 错误处理和用户提示

## 常见问题

### Q: 按钮没有出现？
A: 请检查：
1. 确认脚本已正确安装并启用
2. 刷新页面重试
3. 查看浏览器控制台是否有错误信息
4. 确认当前页面是夸克网盘的文件列表页

### Q: 复制失败怎么办？
A: 脚本会自动尝试降级方案。如果仍然失败：
1. 检查浏览器是否支持剪贴板 API
2. 手动选中文件夹名称复制

### Q: 可以为文件也添加复制按钮吗？
A: 当前脚本专为文件夹设计。如需支持文件，可修改 `checkIfFolder()` 函数调整识别逻辑。

## 开发者信息

### 脚本版本
- **当前版本**: 1.0.0
- **更新日期**: 2025-10-30

### 自定义修改

#### 修改按钮样式
在 `createCopyButton()` 函数中修改 CSS 样式：

```javascript
button.style.cssText = `
    margin-left: 8px;
    padding: 2px 6px;
    /* 添加你的自定义样式 */
`;
```

#### 修改提示持续时间
在 `showToast()` 函数中修改超时时间：

```javascript
setTimeout(() => {
    // 修改这里的 2000 为其他值（毫秒）
}, 2000);
```

#### 添加新的文件夹识别规则
在 `checkIfFolder()` 函数中添加新的判断逻辑：

```javascript
// 添加新的识别条件
if (element.getAttribute('your-custom-attr') === 'folder') {
    return true;
}
```

## 许可证

本脚本基于 MIT 许可证开源。

## 反馈与贡献

如遇到问题或有改进建议，欢迎通过以下方式反馈：
1. 提交 Issue 到项目仓库
2. 发送邮件至开发者邮箱

## 更新日志

### v1.0.0 (2025-10-30)
- ✅ 初始版本发布
- ✅ 实现文件夹名称识别
- ✅ 添加一键复制功能
- ✅ 支持多种页面布局
- ✅ 添加友好提示消息
- ✅ 实现 DOM 变化监听