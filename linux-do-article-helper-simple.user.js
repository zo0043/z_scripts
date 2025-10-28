// ==UserScript==
// @name         Linux.do 文章助手 (简化版)
// @namespace    http://tampermonkey.net/
// @version      2.6.0
// @description  简化版Linux.do文章助手 - 关键词匹配、批量打开功能和即时响应的帖子页面自动滚动
// @author       AI Assistant
// @match        https://linux.do/*
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @connect      linux.do
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 核心样式定义 ====================
    GM_addStyle(`
        .linux-do-helper {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .linux-do-helper-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: white;
            border: 2px solid #2196F3;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            display: none;
        }

        .linux-do-helper-header {
            background: #2196F3;
            color: white;
            padding: 12px 16px;
            border-radius: 6px 6px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
        }

        .linux-do-helper-body {
            padding: 16px;
            max-height: 400px;
            overflow-y: auto;
        }

        .linux-do-helper-toggle {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 9999;
            transition: all 0.3s ease;
        }

        .linux-do-helper-toggle:hover {
            background: #1976D2;
            transform: scale(1.1);
        }

        .linux-do-helper-form-group {
            margin-bottom: 16px;
        }

        .linux-do-helper-label {
            display: block;
            margin-bottom: 6px;
            font-weight: 600;
            color: #333;
            font-size: 14px;
        }

        .linux-do-helper-textarea {
            width: 100%;
            height: 80px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            resize: vertical;
            font-size: 13px;
            box-sizing: border-box;
        }

        .linux-do-helper-select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
            box-sizing: border-box;
        }

        .linux-do-helper-button {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            transition: all 0.2s ease;
        }

        .linux-do-helper-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .linux-do-helper-button-primary {
            background: #2196F3;
            color: white;
        }

        .linux-do-helper-button-success {
            background: #4CAF50;
            color: white;
        }

        .linux-do-helper-button-warning {
            background: #FF9800;
            color: white;
        }

        .linux-do-helper-button-danger {
            background: #f44336;
            color: white;
        }

        .linux-do-helper-status {
            padding: 12px;
            background: #f5f5f5;
            border-radius: 4px;
            font-size: 12px;
            color: #666;
            line-height: 1.4;
        }

        .linux-do-helper-highlight {
            background-color: #fffbdd !important;
            border-left: 3px solid #FF9800 !important;
        }

        .linux-do-helper-notification {
            position: fixed;
            top: 80px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10001;
            font-size: 14px;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        }

        .linux-do-helper-notification.scroll-pause {
            background: #FF9800;
        }

        .linux-do-helper-notification.scroll-resume {
            background: #4CAF50;
        }
    `);

    // ==================== 统一状态管理 ====================
    const AppState = {
        // 配置
        config: {
            keywords: ['AI', 'JavaScript', 'Python', '编程', '开发'],
            matchMode: 'contains',
            maxTabs: 10,
            enableHighlight: true,
            enableNotification: true,
            // 帖子滚动配置
            topicAutoScroll: false,
            topicScrollStep: 300    // 每次滚动距离（像素）
        },

        // 运行时状态
        openedArticles: new Set(),
        windowCount: 0,
        isAutoScrolling: false,
        isTopicScrolling: false,
        topicScrollTimer: null,

        // 持久化键名
        keys: {
            config: 'linuxDoHelperConfig',
            openedArticles: 'linuxDoOpenedArticles',
            windowCount: 'linuxDoWindowCount',
            history: 'linuxDoHelperHistory'
        },

        // 初始化状态
        init() {
            this.loadConfig();
            this.loadOpenedArticles();
            this.loadWindowCount();
        },

        // 配置管理
        loadConfig() {
            const saved = GM_getValue(this.keys.config, null);
            if (saved) {
                this.config = { ...this.config, ...saved };
            }
        },

        saveConfig() {
            GM_setValue(this.keys.config, this.config);
        },

        resetConfig() {
            this.config = {
                keywords: ['AI', 'JavaScript', 'Python', '编程', '开发'],
                matchMode: 'contains',
                maxTabs: 10,
                enableHighlight: true,
                enableNotification: true,
                // 帖子滚动配置
                topicAutoScroll: false,
                topicScrollStep: 300
            };
            this.saveConfig();
        },

        // 已打开文章管理
        loadOpenedArticles() {
            const articles = GM_getValue(this.keys.openedArticles, []);
            this.openedArticles = new Set(articles);
        },

        saveOpenedArticles() {
            GM_setValue(this.keys.openedArticles, Array.from(this.openedArticles));
        },

        isArticleOpened(url) {
            return this.openedArticles.has(url);
        },

        markArticleOpened(url) {
            this.openedArticles.add(url);
            this.saveOpenedArticles();
        },

        clearOpenedArticles() {
            this.openedArticles.clear();
            GM_deleteValue(this.keys.openedArticles);
        },

        // 窗口计数管理
        loadWindowCount() {
            this.windowCount = GM_getValue(this.keys.windowCount, 0);
        },

        saveWindowCount() {
            GM_setValue(this.keys.windowCount, this.windowCount);
        },

        incrementWindowCount() {
            this.windowCount++;
            this.saveWindowCount();
        },

        resetWindowCount() {
            this.windowCount = 0;
            GM_deleteValue(this.keys.windowCount);
        },

        isWindowLimitReached() {
            return this.windowCount >= this.config.maxTabs;
        },

        // 历史记录管理（简化版）
        addHistory(topic, source = 'manual') {
            const history = GM_getValue(this.keys.history, []);
            const record = {
                id: Date.now(),
                title: topic.title,
                url: topic.url,
                source: source,
                time: new Date().toISOString()
            };

            history.unshift(record);
            // 只保留最近50条记录
            if (history.length > 50) {
                history.splice(50);
            }

            GM_setValue(this.keys.history, history);
        },

        getHistory() {
            return GM_getValue(this.keys.history, []);
        },

        clearHistory() {
            GM_deleteValue(this.keys.history);
        }
    };

    // ==================== 页面检测工具 ====================
    const PageDetector = {
        // 检测当前页面类型
        getPageType() {
            const url = window.location.href;

            // 帖子页面：/t/topic/数字 或 /t/标题/数字
            if (url.includes('/t/') && /\d+/.test(url)) {
                return 'topic';
            }

            // 列表页面：/latest, /categories, /top 等
            if (url.includes('/latest') || url.includes('/categories') ||
                url.includes('/top') || url.includes('/new') ||
                url.match(/\/c\/.+/) || url.match(/\/tags\/.+/)) {
                return 'list';
            }

            // 其他页面
            return 'other';
        },

        // 检测是否为帖子页面
        isTopicPage() {
            return this.getPageType() === 'topic';
        },

        // 检测是否为列表页面
        isListPage() {
            return this.getPageType() === 'list';
        }
    };

    // ==================== 帖子滚动管理器 ====================
    const TopicScroller = {
        // 用户滚动行为检测相关变量
        lastScrollTop: 0,
        isPausedByUser: false,
        userScrollBound: false,

        // 防抖相关变量
        scrollDebounceTimer: null,
        statusUpdateTimer: null,

        // 计算随机滚动间隔 (100ms - 1000ms)
        getRandomDelay() {
            // 固定随机范围：100ms - 1000ms
            const minDelay = 100;
            const maxDelay = 1000;
            return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        },

        // 开始自动滚动
        startAutoScroll() {
            if (AppState.isTopicScrolling) return;

            const config = AppState.config;
            AppState.isTopicScrolling = true;

            // 添加用户滚动事件监听
            this.bindUserScrollEvents();

            // 使用递归setTimeout实现随机间隔滚动
            const scheduleNextScroll = () => {
                if (!AppState.isTopicScrolling) return;

                const delay = this.getRandomDelay();
                AppState.topicScrollTimer = setTimeout(() => {
                    if (AppState.isTopicScrolling) {
                        this.scrollStep();
                        scheduleNextScroll(); // 递归调度下一次滚动
                    }
                }, delay);
            };

            // 开始第一次滚动
            this.scrollStep();
            scheduleNextScroll();

            TabManager.showNotification('帖子自动滚动已启动');
        },

        // 停止自动滚动
        stopAutoScroll() {
            if (!AppState.isTopicScrolling) return;

            AppState.isTopicScrolling = false;

            // 清理定时器
            if (AppState.topicScrollTimer) {
                clearTimeout(AppState.topicScrollTimer);
                AppState.topicScrollTimer = null;
            }

            // 移除用户滚动事件监听
            this.unbindUserScrollEvents();

            // 清理防抖定时器
            if (this.scrollDebounceTimer) {
                clearTimeout(this.scrollDebounceTimer);
                this.scrollDebounceTimer = null;
            }

            // 清理状态更新定时器
            if (this.statusUpdateTimer) {
                clearTimeout(this.statusUpdateTimer);
                this.statusUpdateTimer = null;
            }

            // 重置用户滚动状态
            this.isPausedByUser = false;
            this.lastScrollTop = 0;

            TabManager.showNotification('帖子自动滚动已停止');
        },

        // 滚动一步
        scrollStep() {
            const config = AppState.config;

            // 检查用户是否暂停了滚动 - 如果暂停，直接返回，不继续调度
            if (this.isPausedByUser) {
                return; // 简化：暂停时直接返回，由外部事件触发恢复
            }

            // 更精确的底部检测
            const isAtBottom = this.isAtBottom();

            if (isAtBottom) {
                // 到达底部，停止滚动
                this.stopAutoScroll();
                TabManager.showNotification('已滚动到底部，自动停止');

                // 可选：回到顶部继续滚动
                if (confirm('已到达帖子底部，是否回到顶部继续滚动？')) {
                    window.scrollTo(0, 0);
                    setTimeout(() => {
                        this.startAutoScroll();
                    }, 1000);
                }
            } else {
                // 正常向下滚动
                window.scrollBy({
                    top: config.topicScrollStep,
                    behavior: 'smooth'
                });

                // 节流更新状态显示
                this.updateTopicScrollStatusThrottled();
            }
        },

        // 精确的底部检测方法
        isAtBottom() {
            // 获取准确的滚动信息
            const scrollHeight = Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight
            );
            const clientHeight = Math.max(
                document.documentElement.clientHeight,
                window.innerHeight
            );
            const scrollTop = Math.max(
                document.documentElement.scrollTop,
                window.pageYOffset || document.body.scrollTop
            );

            // 计算距离底部的距离
            const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

            // 简化的检测条件（移除冗余的动态内容检测）
            const isNearBottom = distanceFromBottom <= 150; // 150px容差
            const hasScrolledEnough = scrollTop > 300; // 至少滚动过300px
            const isPageLongEnough = scrollHeight > clientHeight * 1.5; // 页面至少是视窗高度的1.5倍

            // 检查是否有加载更多内容的指示器
            const hasLoadingIndicator = this.checkForLoadingIndicator();

            // 综合判断是否到达底部（简化逻辑）
            return isNearBottom && hasScrolledEnough && isPageLongEnough && !hasLoadingIndicator;
        },

        // 检查是否有加载指示器
        checkForLoadingIndicator() {
            const loadingSelectors = [
                '.loading',
                '.spinner',
                '.loading-indicator',
                '[class*="loading"]',
                '[class*="spinner"]',
                '.topic-list-bottom .spinner',
                '.more-topics-loader'
            ];

            return loadingSelectors.some(selector => {
                const element = document.querySelector(selector);
                return element && element.offsetParent !== null; // 检查元素是否可见
            });
        },

        // 绑定用户滚动事件监听
        bindUserScrollEvents() {
            // 避免重复绑定（双重检查）
            if (this.userScrollBound) return;

            // 清理可能存在的旧绑定
            this.unbindUserScrollEvents();

            // 初始化当前滚动位置
            this.lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;

            try {
                // 绑定滚动事件
                this.handleUserScroll = (e) => this.onUserScroll(e);
                window.addEventListener('scroll', this.handleUserScroll, { passive: true });

                // 绑定鼠标滚轮事件（更精确的检测）
                this.handleWheel = (e) => this.onUserWheel(e);
                window.addEventListener('wheel', this.handleWheel, { passive: true });

                this.userScrollBound = true;
            } catch (error) {
                console.error('Linux.do助手: 滚动事件绑定失败', error);
                this.userScrollBound = false;
            }
        },

        // 移除用户滚动事件监听
        unbindUserScrollEvents() {
            if (!this.userScrollBound) return;

            try {
                // 安全移除事件监听器
                if (this.handleUserScroll) {
                    window.removeEventListener('scroll', this.handleUserScroll);
                    this.handleUserScroll = null;
                }

                if (this.handleWheel) {
                    window.removeEventListener('wheel', this.handleWheel);
                    this.handleWheel = null;
                }

                this.userScrollBound = false;
            } catch (error) {
                console.error('Linux.do助手: 滚动事件解绑失败', error);
            }
        },

        // 统一的滚动方向处理逻辑（带防抖）
        handleScrollDirection(scrollDirection) {
            let stateChanged = false;
            let notificationMessage = '';
            let notificationType = 'default';

            if (scrollDirection === 'up' && !this.isPausedByUser) {
                this.isPausedByUser = true;
                stateChanged = true;
                notificationMessage = '向上滚动，自动滚动已暂停';
                notificationType = 'pause';
            } else if (scrollDirection === 'down' && this.isPausedByUser) {
                this.isPausedByUser = false;
                stateChanged = true;
                notificationMessage = '向下滚动，自动滚动已恢复';
                notificationType = 'resume';

                // 恢复滚动时，立即触发一次滚动检查
                setTimeout(() => {
                    if (AppState.isTopicScrolling && !this.isPausedByUser) {
                        this.scrollStep();
                    }
                }, 100);
            }

            // 显示通知（仅在状态改变时）
            if (stateChanged) {
                TabManager.showNotification(notificationMessage, notificationType);
            }

            // 节流更新UI状态显示
            this.updateTopicScrollStatusThrottled();
        },

        // 处理用户滚动事件（带防抖）
        onUserScroll(e) {
            // 防抖处理
            if (this.scrollDebounceTimer) {
                clearTimeout(this.scrollDebounceTimer);
            }

            this.scrollDebounceTimer = setTimeout(() => {
                const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollDirection = currentScrollTop > this.lastScrollTop ? 'down' : 'up';

                this.handleScrollDirection(scrollDirection);

                // 更新上次滚动位置
                this.lastScrollTop = currentScrollTop;
            }, 50); // 50ms防抖
        },

        // 处理用户鼠标滚轮事件（直接处理，无防抖）
        onUserWheel(e) {
            const wheelDirection = e.deltaY > 0 ? 'down' : 'up';
            this.handleScrollDirection(wheelDirection);
        },

        // 节流的状态更新方法
        updateTopicScrollStatusThrottled() {
            if (this.statusUpdateTimer) return;

            this.statusUpdateTimer = setTimeout(() => {
                if (typeof ControlPanel !== 'undefined' && ControlPanel.updateTopicScrollStatus) {
                    ControlPanel.updateTopicScrollStatus();
                }
                this.statusUpdateTimer = null;
            }, 100);
        },

        // 切换滚动状态
        toggleAutoScroll() {
            if (AppState.isTopicScrolling) {
                this.stopAutoScroll();
            } else {
                this.startAutoScroll();
            }
        },

        // 检查是否应该自动开始滚动（根据配置）
        checkAutoStart() {
            return AppState.config.topicAutoScroll && PageDetector.isTopicPage();
        }
    };

    // ==================== 数据获取器（简化版） ====================
    const DataFetcher = {
        // 获取当前页面的文章
        fetchTopics() {
            const topics = [];

            // 使用更简洁的选择器策略
            const selectors = [
                '.topic-list tr.topic-item',
                '.topic-item',
                'tr.topic-list-item'
            ];

            let topicElements = null;
            for (const selector of selectors) {
                topicElements = document.querySelectorAll(selector);
                if (topicElements.length > 0) break;
            }

            if (!topicElements || topicElements.length === 0) {
                return topics;
            }

            topicElements.forEach((element, index) => {
                const titleElement = element.querySelector('.title a, a.title, a[data-topic-title]');
                if (!titleElement) return;

                const title = titleElement.textContent.trim();
                const url = titleElement.href;

                if (!title || !url) return;

                const repliesElement = element.querySelector('.posts, .post-count');
                const viewsElement = element.querySelector('.views, .view-count');
                const authorElement = element.querySelector('.poster-info a, .author a, .username');

                topics.push({
                    id: element.dataset.topicId || `dom-${index}`,
                    title: title,
                    url: url,
                    replies: repliesElement ? parseInt(repliesElement.textContent) || 0 : 0,
                    views: viewsElement ? parseInt(viewsElement.textContent) || 0 : 0,
                    author: authorElement ? authorElement.textContent.trim() : '未知',
                    element: element
                });
            });

            return topics;
        }
    };

    // ==================== 关键词匹配器（简化版） ====================
    const KeywordMatcher = {
        matchKeywords(title, keywords, matchMode = 'contains') {
            if (!title || !keywords || keywords.length === 0) return false;

            const normalizedTitle = title.toLowerCase();

            return keywords.some(keyword => {
                if (!keyword || typeof keyword !== 'string') return false;

                const normalizedKeyword = keyword.toLowerCase().trim();
                if (!normalizedKeyword) return false;

                return matchMode === 'exact'
                    ? normalizedTitle === normalizedKeyword
                    : normalizedTitle.includes(normalizedKeyword);
            });
        },

        getMatchedKeywords(title, keywords, matchMode = 'contains') {
            if (!title || !keywords) return [];

            const normalizedTitle = title.toLowerCase();
            const matched = [];

            keywords.forEach(keyword => {
                if (keyword && typeof keyword === 'string') {
                    const normalizedKeyword = keyword.toLowerCase().trim();
                    if (normalizedKeyword &&
                        (matchMode === 'exact'
                            ? normalizedTitle === normalizedKeyword
                            : normalizedTitle.includes(normalizedKeyword))) {
                        matched.push(keyword);
                    }
                }
            });

            return matched;
        },

        filterTopics(topics, keywords, matchMode = 'contains') {
            if (!topics || !Array.isArray(topics)) return [];
            if (!keywords || keywords.length === 0) return topics;

            return topics.filter(topic => {
                const isMatch = this.matchKeywords(topic.title, keywords, matchMode);
                if (isMatch) {
                    topic.matchedKeywords = this.getMatchedKeywords(topic.title, keywords, matchMode);
                }
                return isMatch;
            });
        }
    };

    // ==================== 标签页管理器（简化版） ====================
    const TabManager = {
        openTab(url, topic = null, source = 'manual') {
            return new Promise((resolve, reject) => {
                // 检查是否已打开
                if (AppState.isArticleOpened(url)) {
                    reject(new Error('文章已经打开过了'));
                    return;
                }

                // 检查窗口限制
                if (AppState.isWindowLimitReached()) {
                    reject(new Error(`已达到窗口打开上限 (${AppState.config.maxTabs}个)`));
                    return;
                }

                try {
                    GM_openInTab(url, {
                        active: source === 'manual',
                        insert: true,
                        setParent: true
                    });

                    // 更新状态
                    AppState.markArticleOpened(url);
                    AppState.incrementWindowCount();

                    // 添加历史记录
                    if (topic) {
                        AppState.addHistory(topic, source);
                    }

                    // 显示通知
                    if (source === 'manual') {
                        this.showNotification(`已打开: ${topic?.title || '文章'}`);
                    }

                    resolve(true);

                } catch (error) {
                    reject(error);
                }
            });
        },

        async openMultipleTabs(urls, topics = null, source = 'manual') {
            const results = [];

            for (let i = 0; i < urls.length; i++) {
                try {
                    const topic = topics && topics[i] ? topics[i] : null;
                    await this.openTab(urls[i], topic, source);
                    results.push({ url: urls[i], success: true });

                    // 添加延迟避免浏览器阻止
                    if (i < urls.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                } catch (error) {
                    results.push({ url: urls[i], success: false, error: error.message });

                    // 如果是限制错误，停止继续
                    if (error.message.includes('上限') || error.message.includes('已经打开')) {
                        break;
                    }
                }
            }

            return results;
        },

        showNotification(message, type = 'default') {
            if (!AppState.config.enableNotification) return;

            const notification = document.createElement('div');
            notification.className = 'linux-do-helper-notification';

            // 根据类型添加样式
            if (type === 'pause') {
                notification.classList.add('scroll-pause');
            } else if (type === 'resume') {
                notification.classList.add('scroll-resume');
            }

            notification.textContent = message;

            document.body.appendChild(notification);

            // 显示动画
            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(0)';
            }, 100);

            // 自动隐藏
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 2000);
        }
    };

    // ==================== UI控制面板（简化版） ====================
    const ControlPanel = {
        panel: null,
        isVisible: false,
        autoScrollTimer: null,

        init() {
            this.createPanel();
            this.bindEvents();
            AppState.init();

            // 根据页面类型执行不同的初始化
            if (this.currentPageType === 'list') {
                this.loadConfigToUI();
                this.refreshTopics();
            }
            // 帖子页面的配置加载在 bindEvents 中的 loadTopicConfig 里处理
        },

        createPanel() {
            const pageType = PageDetector.getPageType();
            const isTopicPage = pageType === 'topic';
            const isListPage = pageType === 'list';

            // 根据页面类型生成不同的面板内容
            let panelBody = '';

            if (isTopicPage) {
                // 帖子页面配置
                panelBody = `
                    <div class="linux-do-helper-body">
                        <div class="linux-do-helper-form-group">
                            <label class="linux-do-helper-label">📖 当前页面：帖子详情页</label>
                            <div style="padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px; color: #1976d2;">
                                此页面可使用自动滚动功能
                            </div>
                        </div>

                        <div class="linux-do-helper-form-group">
                            <label class="linux-do-helper-label">⚙️ 滚动配置：</label>
                            <div style="margin-bottom: 8px;">
                                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #555;">
                                    <input type="checkbox" id="topic-auto-scroll" style="margin: 0;">
                                    进入帖子页面时自动开始滚动
                                </label>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <label style="display: block; margin-bottom: 6px; font-size: 12px; color: #555;">
                                    📏 每次滚动距离（像素）：
                                </label>
                                <input type="number" id="scroll-step-input" min="100" max="1000" value="300" placeholder="滚动距离(像素)" style="
                                    width: 100%;
                                    padding: 8px;
                                    border: 1px solid #ddd;
                                    border-radius: 4px;
                                    font-size: 13px;
                                    box-sizing: border-box;
                                ">
                            </div>
                            <div style="font-size: 11px; color: #888; margin-top: 4px;">
                                💡 滚动间隔自动随机：100ms-1000ms（无需配置）
                            </div>
                            <div style="font-size: 11px; color: #888; margin-top: 2px;">
                                📏 滚动距离控制每次向下滚动多少像素
                            </div>
                            <div style="font-size: 11px; color: #888; margin-top: 2px;">
                                🎯 向上滚动暂停，向下滚动恢复
                            </div>
                        </div>

                        <div class="linux-do-helper-form-group">
                            <button id="topic-scroll-toggle-btn" class="linux-do-helper-button linux-do-helper-button-success">
                                ▶️ 开始自动滚动
                            </button>
                            <button id="scroll-to-top-btn" class="linux-do-helper-button linux-do-helper-button-primary">
                                ⬆️ 回到顶部
                            </button>
                            <button id="scroll-to-bottom-btn" class="linux-do-helper-button linux-do-helper-button-primary">
                                ⬇️ 滚动到底部
                            </button>
                        </div>

                        <div class="linux-do-helper-form-group">
                            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <button id="reset-window-btn" class="linux-do-helper-button"
                                    style="flex: 1; background: #FF5722; color: white; font-size: 12px; padding: 8px;">
                                    🔄 重置窗口计数
                                </button>
                                <button id="clear-opened-btn" class="linux-do-helper-button"
                                    style="flex: 1; background: #9E9E9E; color: white; font-size: 12px; padding: 8px;">
                                    🗑️ 清空打开记录
                                </button>
                            </div>
                        </div>

                        <div class="linux-do-helper-status" id="status-display">
                            <div>📊 状态：就绪</div>
                            <div>📖 页面类型：帖子详情</div>
                            <div>🪟 窗口：${AppState.windowCount}/${AppState.config.maxTabs}</div>
                            <div>📚 已打开：${AppState.openedArticles.size} 篇</div>
                            <div>🔄 滚动状态：已停止</div>
                            <div>👆 用户滚动：未检测</div>
                        </div>
                    </div>
                `;
            } else if (isListPage) {
                // 列表页面配置（保持原有功能）
                panelBody = `
                    <div class="linux-do-helper-body">
                        <div class="linux-do-helper-form-group">
                            <label class="linux-do-helper-label">🎯 关键词（每行一个）：</label>
                            <textarea id="keywords-input" class="linux-do-helper-textarea"
                                placeholder="输入关键词，每行一个..."></textarea>
                        </div>

                        <div class="linux-do-helper-form-group">
                            <label class="linux-do-helper-label">🔍 匹配模式：</label>
                            <select id="match-mode-select" class="linux-do-helper-select">
                                <option value="contains">包含匹配</option>
                                <option value="exact">精确匹配</option>
                            </select>
                        </div>

                        <div class="linux-do-helper-form-group">
                            <button id="refresh-btn" class="linux-do-helper-button linux-do-helper-button-primary">
                                🔄 刷新文章列表
                            </button>
                            <button id="open-matched-btn" class="linux-do-helper-button linux-do-helper-button-warning">
                                🔓 打开匹配文章
                            </button>
                            <button id="start-scroll-btn" class="linux-do-helper-button linux-do-helper-button-success">
                                ▶️ 开始自动滚动
                            </button>
                            <button id="stop-scroll-btn" class="linux-do-helper-button linux-do-helper-button-danger"
                                style="display: none;">
                                ⏹️ 停止滚动
                            </button>
                        </div>

                        <div class="linux-do-helper-form-group">
                            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <button id="reset-window-btn" class="linux-do-helper-button"
                                    style="flex: 1; background: #FF5722; color: white; font-size: 12px; padding: 8px;">
                                    🔄 重置窗口计数
                                </button>
                                <button id="clear-opened-btn" class="linux-do-helper-button"
                                    style="flex: 1; background: #9E9E9E; color: white; font-size: 12px; padding: 8px;">
                                    🗑️ 清空打开记录
                                </button>
                            </div>
                        </div>

                        <div class="linux-do-helper-status" id="status-display">
                            <div>📊 状态：就绪</div>
                            <div>📄 文章数：0</div>
                            <div>🎯 匹配数：0</div>
                            <div>🪟 窗口：${AppState.windowCount}/${AppState.config.maxTabs}</div>
                            <div>📚 已打开：${AppState.openedArticles.size} 篇</div>
                        </div>
                    </div>
                `;
            } else {
                // 其他页面
                panelBody = `
                    <div class="linux-do-helper-body">
                        <div class="linux-do-helper-form-group">
                            <label class="linux-do-helper-label">📄 当前页面：其他页面</label>
                            <div style="padding: 8px; background: #fff3e0; border-radius: 4px; font-size: 12px; color: #f57c00;">
                                此页面不支持文章助手功能
                            </div>
                        </div>

                        <div class="linux-do-helper-form-group">
                            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <button id="reset-window-btn" class="linux-do-helper-button"
                                    style="flex: 1; background: #FF5722; color: white; font-size: 12px; padding: 8px;">
                                    🔄 重置窗口计数
                                </button>
                                <button id="clear-opened-btn" class="linux-do-helper-button"
                                    style="flex: 1; background: #9E9E9E; color: white; font-size: 12px; padding: 8px;">
                                    🗑️ 清空打开记录
                                </button>
                            </div>
                        </div>

                        <div class="linux-do-helper-status" id="status-display">
                            <div>📊 状态：就绪</div>
                            <div>🪟 窗口：${AppState.windowCount}/${AppState.config.maxTabs}</div>
                            <div>📚 已打开：${AppState.openedArticles.size} 篇</div>
                        </div>
                    </div>
                `;
            }

            const panelHTML = `
                <div class="linux-do-helper-panel" id="linux-do-helper-panel">
                    <div class="linux-do-helper-header">
                        <h3 style="margin: 0; font-size: 16px;">🐧 Linux.do 助手</h3>
                        <button id="close-panel-btn" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 20px;
                            cursor: pointer;
                            padding: 0;
                            width: 24px;
                            height: 24px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">×</button>
                    </div>
                    ${panelBody}
                </div>

                <button class="linux-do-helper-toggle" id="linux-do-helper-toggle" title="Linux.do 文章助手">
                    🐧
                </button>
            `;

            document.body.insertAdjacentHTML('beforeend', panelHTML);
            this.panel = document.getElementById('linux-do-helper-panel');
            this.currentPageType = pageType;
        },

        bindEvents() {
            // 切换按钮
            document.getElementById('linux-do-helper-toggle')?.addEventListener('click', () => this.toggle());

            // 关闭按钮
            document.getElementById('close-panel-btn')?.addEventListener('click', () => this.hide());

            // 根据页面类型绑定不同的事件
            if (this.currentPageType === 'topic') {
                // 帖子页面的事件绑定
                document.getElementById('topic-scroll-toggle-btn')?.addEventListener('click', () => this.toggleTopicScroll());
                document.getElementById('scroll-to-top-btn')?.addEventListener('click', () => this.scrollToTop());
                document.getElementById('scroll-to-bottom-btn')?.addEventListener('click', () => this.scrollToBottom());

                // 帖子滚动配置变更
                document.getElementById('topic-auto-scroll')?.addEventListener('change', () => this.saveTopicConfig());
                document.getElementById('scroll-step-input')?.addEventListener('change', () => this.saveTopicConfig());

                // 加载帖子页面配置
                this.loadTopicConfig();

            } else if (this.currentPageType === 'list') {
                // 列表页面的事件绑定
                document.getElementById('refresh-btn')?.addEventListener('click', () => this.refreshTopics());
                document.getElementById('open-matched-btn')?.addEventListener('click', () => this.openMatchedTopics());
                document.getElementById('start-scroll-btn')?.addEventListener('click', () => this.startAutoScroll());
                document.getElementById('stop-scroll-btn')?.addEventListener('click', () => this.stopAutoScroll());

                // 配置变更
                document.getElementById('keywords-input')?.addEventListener('change', () => this.saveConfig());
                document.getElementById('match-mode-select')?.addEventListener('change', () => this.saveConfig());

                // 加载列表页面配置
                this.loadConfigToUI();
            }

            // 通用按钮（所有页面都有）
            document.getElementById('reset-window-btn')?.addEventListener('click', () => this.resetWindowCount());
            document.getElementById('clear-opened-btn')?.addEventListener('click', () => this.clearOpenedArticles());

            // 面板拖拽（简化版）
            this.makeDraggable();
        },

        makeDraggable() {
            const header = this.panel?.querySelector('.linux-do-helper-header');
            if (!header) return;

            let isDragging = false;
            let startX, startY, initialX, initialY;

            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialX = this.panel.offsetLeft;
                initialY = this.panel.offsetTop;
                header.style.cursor = 'grabbing';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                this.panel.style.left = (initialX + dx) + 'px';
                this.panel.style.top = (initialY + dy) + 'px';
                this.panel.style.right = 'auto';
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
                if (header) header.style.cursor = 'move';
            });
        },

        show() {
            if (this.panel) {
                this.panel.style.display = 'block';
                this.isVisible = true;
                document.getElementById('linux-do-helper-toggle').style.display = 'none';
            }
        },

        hide() {
            if (this.panel) {
                this.panel.style.display = 'none';
                this.isVisible = false;
                document.getElementById('linux-do-helper-toggle').style.display = 'block';
            }
        },

        toggle() {
            if (this.isVisible) {
                this.hide();
            } else {
                this.show();
            }
        },

        loadConfigToUI() {
            const keywordsInput = document.getElementById('keywords-input');
            const matchModeSelect = document.getElementById('match-mode-select');

            if (keywordsInput) keywordsInput.value = AppState.config.keywords.join('\n');
            if (matchModeSelect) matchModeSelect.value = AppState.config.matchMode;
        },

        // 帖子页面配置相关方法
        loadTopicConfig() {
            const autoScrollCheckbox = document.getElementById('topic-auto-scroll');
            const scrollStepInput = document.getElementById('scroll-step-input');

            if (autoScrollCheckbox) autoScrollCheckbox.checked = AppState.config.topicAutoScroll;
            if (scrollStepInput) scrollStepInput.value = AppState.config.topicScrollStep;

            // 更新滚动状态显示
            this.updateTopicScrollStatus();

            // 检查是否需要自动开始滚动
            if (TopicScroller.checkAutoStart()) {
                setTimeout(() => {
                    TopicScroller.startAutoScroll();
                    this.updateTopicScrollButton();
                }, 1000); // 延迟1秒开始，确保页面完全加载
            }
        },

        saveTopicConfig() {
            const autoScrollCheckbox = document.getElementById('topic-auto-scroll');
            const scrollStepInput = document.getElementById('scroll-step-input');

            if (autoScrollCheckbox) AppState.config.topicAutoScroll = autoScrollCheckbox.checked;
            if (scrollStepInput) AppState.config.topicScrollStep = parseInt(scrollStepInput.value) || 300;

            AppState.saveConfig();
            this.updateStatus('配置已保存');
        },

        toggleTopicScroll() {
            TopicScroller.toggleAutoScroll();
            this.updateTopicScrollButton();
            this.updateTopicScrollStatus();
        },

        updateTopicScrollButton() {
            const toggleBtn = document.getElementById('topic-scroll-toggle-btn');
            if (!toggleBtn) return;

            if (AppState.isTopicScrolling) {
                toggleBtn.textContent = '⏹️ 停止自动滚动';
                toggleBtn.className = 'linux-do-helper-button linux-do-helper-button-danger';
            } else {
                toggleBtn.textContent = '▶️ 开始自动滚动';
                toggleBtn.className = 'linux-do-helper-button linux-do-helper-button-success';
            }
        },

        updateTopicScrollStatus() {
            const statusDiv = document.getElementById('status-display');
            if (!statusDiv) return;

            // 更新滚动状态显示
            const scrollStatusText = AppState.isTopicScrolling ?
                (TopicScroller.isPausedByUser ? '已暂停' : '滚动中') : '已停止';

            const scrollStatusDiv = statusDiv.querySelector('div:nth-child(5)');
            if (scrollStatusDiv) {
                scrollStatusDiv.textContent = `🔄 滚动状态：${scrollStatusText}`;
            }

            // 更新用户滚动状态显示
            const userScrollStatusDiv = statusDiv.querySelector('div:nth-child(6)');
            if (userScrollStatusDiv) {
                const pauseStatus = TopicScroller.isPausedByUser ? '用户暂停⏸️' : '未检测';
                userScrollStatusDiv.textContent = `👆 用户滚动：${pauseStatus}`;
            }
        },

        scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            TabManager.showNotification('已回到顶部');
        },

        scrollToBottom() {
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            const targetY = scrollHeight - clientHeight;

            window.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });
            TabManager.showNotification('已滚动到底部');
        },

        saveConfig() {
            const keywordsInput = document.getElementById('keywords-input');
            const matchModeSelect = document.getElementById('match-mode-select');

            if (keywordsInput) {
                AppState.config.keywords = keywordsInput.value.split('\n')
                    .map(k => k.trim())
                    .filter(k => k.length > 0);
            }

            if (matchModeSelect) AppState.config.matchMode = matchModeSelect.value;

            AppState.saveConfig();
            this.updateStatus('配置已保存');
        },

        updateStatus(message = '', stats = {}) {
            const statusDiv = document.getElementById('status-display');
            if (!statusDiv) return;

            statusDiv.innerHTML = `
                <div>📊 状态：${message || '就绪'}</div>
                <div>📄 文章数：${stats.total || 0}</div>
                <div>🎯 匹配数：${stats.matched || 0}</div>
                <div>🪟 窗口：${AppState.windowCount}/${AppState.config.maxTabs}</div>
                <div>📚 已打开：${AppState.openedArticles.size} 篇</div>
            `;
        },

        async refreshTopics() {
            try {
                this.updateStatus('正在获取文章列表...');
                const topics = DataFetcher.fetchTopics();
                const matchedTopics = KeywordMatcher.filterTopics(
                    topics,
                    AppState.config.keywords,
                    AppState.config.matchMode
                );

                this.updateStatus('获取完成', { total: topics.length, matched: matchedTopics.length });

                // 高亮匹配的文章
                if (AppState.config.enableHighlight) {
                    this.highlightTopics(matchedTopics);
                }

                // 发送通知
                if (matchedTopics.length > 0) {
                    TabManager.showNotification(`找到 ${matchedTopics.length} 篇匹配文章`);
                }

            } catch (error) {
                this.updateStatus('获取失败: ' + error.message);
            }
        },

        async openMatchedTopics() {
            try {
                const topics = DataFetcher.fetchTopics();
                const matchedTopics = KeywordMatcher.filterTopics(
                    topics,
                    AppState.config.keywords,
                    AppState.config.matchMode
                );

                if (matchedTopics.length === 0) {
                    this.updateStatus('没有匹配的文章');
                    return;
                }

                this.updateStatus(`正在打开 ${matchedTopics.length} 篇文章...`);

                const urls = matchedTopics.map(topic => topic.url);
                const results = await TabManager.openMultipleTabs(urls, matchedTopics, 'manual');

                const successCount = results.filter(r => r.success).length;
                const failCount = results.length - successCount;

                this.updateStatus(`已打开 ${successCount} 篇文章${failCount > 0 ? `，失败 ${failCount} 篇` : ''}`);

            } catch (error) {
                this.updateStatus('打开失败: ' + error.message);
            }
        },

        highlightTopics(matchedTopics) {
            // 清除之前的高亮
            document.querySelectorAll('.linux-do-helper-highlight').forEach(el => {
                el.classList.remove('linux-do-helper-highlight');
            });

            // 高亮匹配的文章
            matchedTopics.forEach(topic => {
                if (topic.element) {
                    topic.element.classList.add('linux-do-helper-highlight');
                }
            });
        },

        startAutoScroll() {
            if (this.autoScrollTimer) return;

            const startBtn = document.getElementById('start-scroll-btn');
            const stopBtn = document.getElementById('stop-scroll-btn');

            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'block';

            this.autoScrollTimer = setInterval(() => {
                this.autoScrollStep();
            }, 3000);

            this.updateStatus('自动滚动已启动');
        },

        stopAutoScroll() {
            if (this.autoScrollTimer) {
                clearInterval(this.autoScrollTimer);
                this.autoScrollTimer = null;
            }

            const startBtn = document.getElementById('start-scroll-btn');
            const stopBtn = document.getElementById('stop-scroll-btn');

            if (startBtn) startBtn.style.display = 'block';
            if (stopBtn) stopBtn.style.display = 'none';

            this.updateStatus('自动滚动已停止');
        },

        autoScrollStep() {
            // 滚动页面
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            const scrollTop = document.documentElement.scrollTop;

            if (scrollTop + clientHeight >= scrollHeight - 100) {
                window.scrollTo(0, 0); // 回到顶部
            } else {
                window.scrollBy(0, 500); // 向下滚动
            }

            // 检查新文章并自动打开
            this.checkAndAutoOpen();
        },

        async checkAndAutoOpen() {
            try {
                const topics = DataFetcher.fetchTopics();
                const matchedTopics = KeywordMatcher.filterTopics(
                    topics,
                    AppState.config.keywords,
                    AppState.config.matchMode
                );

                // 过滤未打开的文章
                const unopenedTopics = matchedTopics.filter(topic => !AppState.isArticleOpened(topic.url));

                if (unopenedTopics.length > 0 && !AppState.isWindowLimitReached()) {
                    // 只打开第一个匹配的文章
                    const topic = unopenedTopics[0];
                    await TabManager.openTab(topic.url, topic, 'auto-scroll');

                    this.updateStatus(`自动打开: ${topic.title}`);

                    // 如果达到上限，停止滚动
                    if (AppState.isWindowLimitReached()) {
                        this.stopAutoScroll();
                        this.updateStatus('已达到窗口上限，停止自动滚动');
                    }
                }

            } catch (error) {
                console.error('自动打开失败:', error);
            }
        },

        resetWindowCount() {
            if (confirm('确定要重置窗口计数器吗？')) {
                AppState.resetWindowCount();
                this.updateStatus('窗口计数器已重置');
            }
        },

        clearOpenedArticles() {
            if (confirm('确定要清空已打开文章记录吗？')) {
                AppState.clearOpenedArticles();
                this.updateStatus('已清空打开记录');
            }
        }
    };

    // ==================== 主程序初始化 ====================
    async function init() {
        try {
            ControlPanel.init();

            // 页面卸载时清理
            window.addEventListener('beforeunload', () => {
                ControlPanel.stopAutoScroll();
                TopicScroller.stopAutoScroll(); // 停止帖子滚动
            });

        } catch (error) {
            console.error('Linux.do助手初始化失败:', error);
        }
    }

    // 等待页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();