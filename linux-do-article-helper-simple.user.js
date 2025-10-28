// ==UserScript==
// @name         Linux.do 文章助手 (简化版)
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  简化版Linux.do文章助手 - 关键词匹配和批量打开功能
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
    `);

    // ==================== 统一状态管理 ====================
    const AppState = {
        // 配置
        config: {
            keywords: ['AI', 'JavaScript', 'Python', '编程', '开发'],
            matchMode: 'contains',
            maxTabs: 10,
            enableHighlight: true,
            enableNotification: true
        },

        // 运行时状态
        openedArticles: new Set(),
        windowCount: 0,
        isAutoScrolling: false,

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
                enableNotification: true
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

        showNotification(message) {
            if (!AppState.config.enableNotification) return;

            const notification = document.createElement('div');
            notification.className = 'linux-do-helper-notification';
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
            this.loadConfigToUI();
            this.refreshTopics();
        },

        createPanel() {
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
                            <div>🪟 窗口：0/${AppState.config.maxTabs}</div>
                            <div>📚 已打开：0 篇</div>
                        </div>
                    </div>
                </div>

                <button class="linux-do-helper-toggle" id="linux-do-helper-toggle" title="Linux.do 文章助手">
                    🐧
                </button>
            `;

            document.body.insertAdjacentHTML('beforeend', panelHTML);
            this.panel = document.getElementById('linux-do-helper-panel');
        },

        bindEvents() {
            // 切换按钮
            document.getElementById('linux-do-helper-toggle')?.addEventListener('click', () => this.toggle());

            // 关闭按钮
            document.getElementById('close-panel-btn')?.addEventListener('click', () => this.hide());

            // 功能按钮
            document.getElementById('refresh-btn')?.addEventListener('click', () => this.refreshTopics());
            document.getElementById('open-matched-btn')?.addEventListener('click', () => this.openMatchedTopics());
            document.getElementById('start-scroll-btn')?.addEventListener('click', () => this.startAutoScroll());
            document.getElementById('stop-scroll-btn')?.addEventListener('click', () => this.stopAutoScroll());
            document.getElementById('reset-window-btn')?.addEventListener('click', () => this.resetWindowCount());
            document.getElementById('clear-opened-btn')?.addEventListener('click', () => this.clearOpenedArticles());

            // 配置变更
            document.getElementById('keywords-input')?.addEventListener('change', () => this.saveConfig());
            document.getElementById('match-mode-select')?.addEventListener('change', () => this.saveConfig());

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