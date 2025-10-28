# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个油猴(Tampermonkey)用户脚本项目，名为"Linux.do 文章助手"。该脚本为Linux.do网站提供智能文章匹配、批量打开、自动滚动等功能。

## 代码架构

### 核心模块结构

脚本采用模块化设计，主要包含以下核心模块：

- **AppState**: 应用状态管理，负责配置持久化存储和历史记录管理
- **PageDetector**: 页面类型检测器，识别当前页面类型（帖子详情页、列表页等）
- **TopicScroller**: 滚动控制器，实现状态机驱动的智能滚动系统
- **DataFetcher**: 数据获取器，从DOM中解析文章信息
- **KeywordMatcher**: 关键词匹配器，支持包含匹配和精确匹配
- **TabManager**: 标签页管理器，控制文章打开并发和历史记录
- **KeyboardManager**: 快捷键管理器，处理键盘事件和快捷键绑定
- **ControlPanel**: 控制面板管理器，负责UI生成和交互

### 状态机设计

TopicScroller模块实现了复杂的状态机系统，包含以下状态：
- IDLE: 空闲状态
- SCROLLING: 滚动状态
- PAUSED: 暂停状态
- STOPPED: 停止状态
- ERROR: 错误状态

状态转换通过严格的验证机制确保系统的稳定性。

### 数据存储

使用油猴API进行数据持久化：
- 配置信息：GM_setValue/GM_getValue
- 历史记录：独立的存储键值
- 防重复打开：维护已打开文章URL列表

## 开发工作流

### 文件结构
```
c_scripts/
├── README.md                    # 项目说明文档
├── linux-do-article-helper-simple.user.js  # 主要脚本文件
└── CLAUDE.md                   # 本文件
```

### 脚本开发指南

1. **修改脚本前**：先阅读完整的脚本文件，理解各模块间的依赖关系
2. **测试修改**：在油猴扩展中导入修改后的脚本进行测试
3. **版本管理**：更新脚本头部的@version字段
4. **文档更新**：重要功能变更需同步更新README.md

### 常用开发任务

#### 添加新功能模块
```javascript
const NewModule = {
    // 模块属性和方法
};
```

#### 修改快捷键配置
在KeyboardManager.shortcuts中定义新的快捷键组合。

#### 扩展数据存储
在AppState.keys中添加新的存储键，使用GM_setValue/GM_getValue进行操作。

## 技术特性

- **模块化架构**：清晰的职责分离，便于维护
- **状态机驱动**：稳定的滚动控制系统
- **降级机制**：API失败时的DOM解析备份
- **防抖处理**：避免频繁操作影响性能
- **响应式UI**：自适应不同页面类型

## 兼容性

- 浏览器：Chrome、Firefox、Edge（通过油猴扩展）
- 目标网站：https://linux.do/*
- API权限：GM_openInTab, GM_setValue, GM_getValue等

## 调试方法

1. 打开浏览器开发者工具（F12）
2. 查看Console标签页的错误和日志信息
3. 检查Network标签页的请求状态
4. 在油猴管理面板中查看脚本运行状态