// ==UserScript==
// @name         Linux.do 文章助手
// @namespace    http://tampermonkey.net/
// @version      1.4.0
// @description  自动获取Linux.do文章列表，根据关键词匹配并依次打开文章，支持配置界面和滚动控制
// @author       AI Assistant
// @match        https://linux.do/latest
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

    // ==================== 已打开文章管理模块 ====================
    const OpenedArticlesManager = {
        // 存储键名
        storageKey: 'linuxDoOpenedArticles',

        // 获取已打开文章列表
        getOpenedArticles() {
            return GM_getValue(this.storageKey, []);
        },

        // 保存已打开文章列表
        saveOpenedArticles(articles) {
            GM_setValue(this.storageKey, articles);
        },

        // 检查文章是否已打开
        isArticleOpened(url) {
            const openedArticles = this.getOpenedArticles();
            return openedArticles.includes(url);
        },

        // 标记文章为已打开
        markAsOpened(url) {
            const openedArticles = this.getOpenedArticles();
            if (!openedArticles.includes(url)) {
                openedArticles.push(url);
                this.saveOpenedArticles(openedArticles);
                console.log('Linux.do助手: 标记文章为已打开:', url);
            }
        },

        // 获取已打开文章数量
        getOpenedCount() {
            return this.getOpenedArticles().length;
        },

        // 清空已打开文章记录
        clearOpenedArticles() {
            GM_deleteValue(this.storageKey);
            console.log('Linux.do助手: 已清空打开文章记录');
        },

        // 清理无效的URL记录（可选）
        cleanInvalidRecords() {
            const openedArticles = this.getOpenedArticles();
            const validArticles = openedArticles.filter(url => {
                try {
                    new URL(url);
                    return true;
                } catch (e) {
                    return false;
                }
            });

            if (validArticles.length !== openedArticles.length) {
                this.saveOpenedArticles(validArticles);
                console.log('Linux.do助手: 清理了', openedArticles.length - validArticles.length, '个无效记录');
            }
        },

        // 获取统计信息
        getStats() {
            const openedArticles = this.getOpenedArticles();
            return {
                total: openedArticles.length,
                storageKey: this.storageKey,
                lastUpdated: new Date().toISOString()
            };
        }
    };

    // ==================== 窗口计数管理模块 ====================
    const WindowCounter = {
        // 最大打开窗口数量
        maxWindows: 10,
        currentOpenCount: 0,

        // 获取当前计数
        getCount() {
            return this.currentOpenCount;
        },

        // 重置计数器
        reset() {
            this.currentOpenCount = 0;
            GM_deleteValue('linuxDoWindowCounter');
            console.log('Linux.do助手: 窗口计数器已重置');
        },

        // 加载计数器
        load() {
            this.currentOpenCount = GM_getValue('linuxDoWindowCounter', 0);
            console.log('Linux.do助手: 加载窗口计数器:', this.currentOpenCount);
        },

        // 增加计数
        increment() {
            this.currentOpenCount++;
            GM_setValue('linuxDoWindowCounter', this.currentOpenCount);
            console.log('Linux.do助手: 窗口计数器增加:', this.currentOpenCount);
            return this.currentOpenCount;
        },

        // 检查是否达到上限
        isLimitReached() {
            return this.currentOpenCount >= this.maxWindows;
        },

        // 获取剩余可打开数量
        getRemainingCount() {
            return Math.max(0, this.maxWindows - this.currentOpenCount);
        },

        // 获取状态信息
        getStatus() {
            return {
                current: this.currentOpenCount,
                max: this.maxWindows,
                remaining: this.getRemainingCount(),
                isLimitReached: this.isLimitReached()
            };
        }
    };

    // ==================== 历史记录管理模块 ====================
    const HistoryManager = {
        // 历史记录最大数量
        maxHistorySize: 100,

        // 获取历史记录
        getHistory() {
            return GM_getValue('linuxDoHelperHistory', []);
        },

        // 保存历史记录
        saveHistory(history) {
            // 限制历史记录数量
            if (history.length > this.maxHistorySize) {
                history = history.slice(-this.maxHistorySize);
            }
            GM_setValue('linuxDoHelperHistory', history);
        },

        // 添加打开记录
        addRecord(topic, source = 'manual') {
            const history = this.getHistory();
            const record = {
                id: Date.now() + Math.random(), // 唯一ID
                title: topic.title,
                url: topic.url,
                keywords: topic.matchedKeywords || [],
                source: source, // 'manual' | 'auto-scroll'
                openTime: new Date().toISOString(),
                author: topic.author || '未知',
                replies: topic.replies || 0,
                views: topic.views || 0
            };

            history.unshift(record); // 添加到开头
            this.saveHistory(history);

            return record;
        },

        // 清空历史记录
        clearHistory() {
            GM_deleteValue('linuxDoHelperHistory');
        },

        // 删除特定记录
        deleteRecord(recordId) {
            const history = this.getHistory();
            const filteredHistory = history.filter(record => record.id !== recordId);
            this.saveHistory(filteredHistory);
        },

        // 获取统计信息
        getStats() {
            const history = this.getHistory();
            const today = new Date().toDateString();

            return {
                total: history.length,
                today: history.filter(record =>
                    new Date(record.openTime).toDateString() === today
                ).length,
                bySource: {
                    manual: history.filter(r => r.source === 'manual').length,
                    autoScroll: history.filter(r => r.source === 'auto-scroll').length
                }
            };
        }
    };

    // ==================== 配置管理模块 ====================
    const ConfigManager = {
        // 默认配置
        defaultConfig: {
            keywords: ['AI', 'JavaScript', 'Python', '编程', '开发'],
            autoScroll: false,
            scrollSpeed: 1000, // 毫秒
            scrollInterval: 3000, // 毫秒
            matchMode: 'contains', // 'contains' | 'exact'
            enableNotification: true,
            enableHighlight: true,
            autoOpenInScroll: false // 滚动时自动打开匹配文章
        },

        // 获取配置
        getConfig() {
            const saved = GM_getValue('linuxDoHelperConfig', null);
            if (saved) {
                return { ...this.defaultConfig, ...saved };
            }
            return this.defaultConfig;
        },

        // 保存配置
        saveConfig(config) {
            GM_setValue('linuxDoHelperConfig', config);
        },

        // 重置配置
        resetConfig() {
            GM_deleteValue('linuxDoHelperConfig');
            return this.defaultConfig;
        }
    };

    // ==================== 数据获取模块 ====================
    const DataFetcher = {
        // Discourse API 端点
        apiEndpoints: {
            latest: '/latest.json?no_definitions=true',
            topics: '/latest.json'
        },

        // 通过API获取文章数据
        async fetchViaAPI() {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: `https://linux.do${this.apiEndpoints.latest}`,
                    onload: (response) => {
                        try {
                            if (response.status === 200) {
                                const data = JSON.parse(response.responseText);
                                const topics = this.extractTopicsFromAPI(data);
                                resolve(topics);
                            } else {
                                reject(new Error(`API请求失败: ${response.status}`));
                            }
                        } catch (error) {
                            reject(error);
                        }
                    },
                    onerror: (error) => {
                        reject(error);
                    }
                });
            });
        },

        // 从API响应中提取文章信息
        extractTopicsFromAPI(data) {
            const topics = [];
            if (data.users && data.topic_list && data.topic_list.topics) {
                data.topic_list.topics.forEach(topic => {
                    const user = data.users.find(u => u.id === topic.last_poster_id) || {};
                    topics.push({
                        id: topic.id,
                        title: topic.title,
                        url: `https://linux.do/t/${topic.slug}/${topic.id}`,
                        replies: topic.reply_count,
                        views: topic.views,
                        lastActivity: new Date(topic.last_posted_at),
                        author: user.username || '未知',
                        tags: topic.tags || []
                    });
                });
            }
            return topics;
        },

        // 通过DOM解析获取文章数据
        fetchViaDOM() {
            const topics = [];

            // 尝试多种选择器以适应不同的页面结构
            let topicElements = document.querySelectorAll('.topic-list tr.topic-item');

            // 如果没有找到，尝试其他可能的选择器
            if (topicElements.length === 0) {
                topicElements = document.querySelectorAll('.topic-item');
                console.log('Linux.do助手: 使用备用选择器 .topic-item');
            }

            if (topicElements.length === 0) {
                topicElements = document.querySelectorAll('tr.topic-list-item');
                console.log('Linux.do助手: 使用备用选择器 tr.topic-list-item');
            }

            console.log('Linux.do助手: DOM解析找到', topicElements.length, '个文章元素');

            topicElements.forEach((element, index) => {
                // 尝试多种方式获取标题元素
                let titleElement = element.querySelector('.main-link a.title');
                if (!titleElement) {
                    titleElement = element.querySelector('.title a');
                }
                if (!titleElement) {
                    titleElement = element.querySelector('a.title');
                }
                if (!titleElement) {
                    titleElement = element.querySelector('a[data-topic-title]');
                }

                // 尝试多种方式获取其他元素
                const repliesElement = element.querySelector('.posts') || element.querySelector('.post-count');
                const viewsElement = element.querySelector('.views') || element.querySelector('.view-count');
                const activityElement = element.querySelector('.activity .age') || element.querySelector('.relative-date');
                const authorElement = element.querySelector('.poster-info a') || element.querySelector('.author a') || element.querySelector('.username');
                const tagsElements = element.querySelectorAll('.discourse-tags .discourse-tag') || element.querySelectorAll('.tag');

                if (titleElement) {
                    const title = titleElement.textContent.trim();
                    const url = titleElement.href;

                    // 验证获取到的数据
                    if (title && url) {
                        topics.push({
                            id: element.dataset.topicId || titleElement.dataset.topicId || `dom-${index}`,
                            title: title,
                            url: url,
                            replies: repliesElement ? parseInt(repliesElement.textContent) || 0 : 0,
                            views: viewsElement ? parseInt(viewsElement.textContent) || 0 : 0,
                            lastActivity: activityElement ? new Date(activityElement.dataset.time || activityElement.textContent) : new Date(),
                            author: authorElement ? authorElement.textContent.trim() : '未知',
                            tags: Array.from(tagsElements).map(tag => tag.textContent.trim()).filter(tag => tag),
                            element: element
                        });
                    } else {
                        console.warn('Linux.do助手: 跳过无效的文章元素 - 标题:', title, 'URL:', url);
                    }
                } else {
                    console.warn('Linux.do助手: 找不到标题元素，跳过元素:', element);
                }
            });

            console.log('Linux.do助手: DOM解析成功提取', topics.length, '篇文章');

            // 打印前几篇文章的标题用于调试
            topics.slice(0, 3).forEach((topic, index) => {
                console.log(`Linux.do助手: DOM文章${index + 1}: "${topic.title}" (URL: ${topic.url})`);
            });

            return topics;
        },

        // 获取文章列表（API优先，降级到DOM）
        async fetchTopics() {
            try {
                // 优先尝试API获取
                const apiTopics = await this.fetchViaAPI();
                console.log('Linux.do助手: 通过API获取到', apiTopics.length, '篇文章');
                return apiTopics;
            } catch (error) {
                console.warn('Linux.do助手: API获取失败，降级到DOM解析', error);
                // 降级到DOM解析
                const domTopics = this.fetchViaDOM();
                console.log('Linux.do助手: 通过DOM解析获取到', domTopics.length, '篇文章');
                return domTopics;
            }
        }
    };

    // ==================== 关键词匹配引擎 ====================
    const KeywordMatcher = {
        // 检查标题是否匹配关键词
        matchKeywords(title, keywords, matchMode = 'contains') {
            if (!title || !keywords || keywords.length === 0) {
                console.log('Linux.do助手: 匹配检查失败 - 标题:', title, '关键词:', keywords);
                return false;
            }

            const normalizedTitle = title.toLowerCase().trim();
            console.log('Linux.do助手: 检查标题:', `"${title}"` , '(标准化后:', `"${normalizedTitle}"`, ')');

            return keywords.some(keyword => {
                if (!keyword || typeof keyword !== 'string') {
                    console.log('Linux.do助手: 跳过无效关键词:', keyword);
                    return false;
                }

                const normalizedKeyword = keyword.toLowerCase().trim();
                if (!normalizedKeyword) {
                    console.log('Linux.do助手: 跳过空关键词:', keyword);
                    return false;
                }

                console.log('Linux.do助手: 检查关键词:', `"${keyword}"` , '(标准化后:', `"${normalizedKeyword}"`, ')');

                let isMatch = false;
                switch (matchMode) {
                    case 'exact':
                        isMatch = normalizedTitle === normalizedKeyword;
                        break;
                    case 'contains':
                    default:
                        isMatch = normalizedTitle.includes(normalizedKeyword);
                        break;
                }

                console.log('Linux.do助手: 匹配结果:', `"${normalizedKeyword}"` , 'vs', `"${normalizedTitle}"` , '=>', isMatch);

                return isMatch;
            });
        },

        // 获取匹配的关键词
        getMatchedKeywords(title, keywords, matchMode = 'contains') {
            const matched = [];
            if (!title || !keywords) {
                return matched;
            }

            const normalizedTitle = title.toLowerCase().trim();

            keywords.forEach(keyword => {
                if (keyword && typeof keyword === 'string') {
                    const normalizedKeyword = keyword.toLowerCase().trim();
                    if (normalizedKeyword) {
                        switch (matchMode) {
                            case 'exact':
                                if (normalizedTitle === normalizedKeyword) {
                                    matched.push(keyword);
                                }
                                break;
                            case 'contains':
                            default:
                                if (normalizedTitle.includes(normalizedKeyword)) {
                                    matched.push(keyword);
                                }
                                break;
                        }
                    }
                }
            });

            return matched;
        },

        // 过滤匹配的文章
        filterTopics(topics, keywords, matchMode = 'contains') {
            if (!topics || !Array.isArray(topics)) {
                return [];
            }

            if (!keywords || keywords.length === 0) {
                return topics;
            }

            return topics.filter(topic => {
                const isMatch = this.matchKeywords(topic.title, keywords, matchMode);
                if (isMatch) {
                    topic.matchedKeywords = this.getMatchedKeywords(topic.title, keywords, matchMode);
                }
                return isMatch;
            });
        }
    };

    // ==================== 标签页管理模块 ====================
    const TabManager = {
        // 打开新标签页
        openTab(url, active = false, silent = false, topic = null, source = 'manual') {
            return new Promise((resolve, reject) => {
                // 检查文章是否已经打开过
                if (OpenedArticlesManager.isArticleOpened(url)) {
                    console.log(`Linux.do助手: 文章已打开，跳过: ${url}`);
                    reject(new Error('文章已经打开过了'));
                    return;
                }

                // 检查窗口数量限制
                if (WindowCounter.isLimitReached()) {
                    reject(new Error(`已达到窗口打开上限 (${WindowCounter.maxWindows}个)，请重置计数器后继续`));
                    return;
                }

                try {
                    const tabId = GM_openInTab(url, {
                        active: active,
                        insert: true,
                        setParent: true
                    });

                    // 标记文章为已打开
                    OpenedArticlesManager.markAsOpened(url);

                    // 增加窗口计数器
                    WindowCounter.increment();

                    console.log(`Linux.do助手: 打开标签页 ${url} (窗口计数: ${WindowCounter.getCount()}/${WindowCounter.maxWindows})`);

                    // 添加历史记录
                    if (topic) {
                        HistoryManager.addRecord(topic, source);
                    }

                    // 如果不是静默模式，显示提示
                    if (!silent) {
                        this.showOpenNotification(url);
                    }

                    resolve(tabId);

                } catch (error) {
                    reject(error);
                }
            });
        },

        // 显示打开文章的提示
        showOpenNotification(url) {
            // 提取文章标题
            const title = this.extractTitleFromUrl(url);

            // 创建提示元素
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10001;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 14px;
                max-width: 300px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
            `;
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">🔗</span>
                    <div>
                        <div style="font-weight: 600; margin-bottom: 2px;">已打开文章</div>
                        <div style="font-size: 12px; opacity: 0.9;">${title}</div>
                    </div>
                </div>
            `;

            document.body.appendChild(notification);

            // 显示动画
            setTimeout(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateX(0)';
            }, 100);

            // 1秒后自动关闭
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 1000);
        },

        // 从URL提取文章标题
        extractTitleFromUrl(url) {
            try {
                const match = url.match(/\/t\/([^\/]+)\/\d+/);
                if (match && match[1]) {
                    // 将URL编码的标题解码并格式化
                    return decodeURIComponent(match[1]).replace(/-/g, ' ');
                }
                return '未知文章';
            } catch (error) {
                return '未知文章';
            }
        },

        // 依次打开多个标签页
        async openMultipleTabs(urls, delay = 3000, topics = null, source = 'manual') {
            const results = [];
            for (let i = 0; i < urls.length; i++) {
                try {
                    const topic = topics && topics[i] ? topics[i] : null;
                    const tabId = await this.openTab(urls[i], i === 0, false, topic, source);
                    results.push({ url: urls[i], success: true, tabId });

                    // 依次打开，使用更长延迟时间避免浏览器阻止
                    if (i < urls.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                } catch (error) {
                    results.push({ url: urls[i], success: false, error: error.message });

                    // 如果是窗口上限错误，停止打开后续文章
                    if (error.message.includes('窗口打开上限')) {
                        break;
                    }
                }
            }
            return results;
        }
    };

    // ==================== UI控制面板模块 ====================
    const ControlPanel = {
        isVisible: false,
        panel: null,
        scrollTimer: null,

        // 创建控制面板HTML
        createPanelHTML() {
            return `
                <div id="linux-do-helper-panel" style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 320px;
                    max-height: 600px;
                    background: #ffffff;
                    border: 2px solid #2196F3;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    z-index: 10000;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 14px;
                    display: none;
                ">
                    <div style="
                        background: linear-gradient(135deg, #2196F3, #1976D2);
                        color: white;
                        padding: 12px 16px;
                        border-radius: 6px 6px 0 0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: move;
                    ">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">🐧 Linux.do 文章助手</h3>
                        <button id="close-panel-btn" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: white;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            cursor: pointer;
                            font-size: 16px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">×</button>
                    </div>

                    <div style="padding: 16px; max-height: 520px; overflow-y: auto;">
                        <!-- 关键词设置 -->
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333;">
                                🎯 关键词列表（每行一个）：
                            </label>
                            <textarea id="keywords-input" style="
                                width: 100%;
                                height: 80px;
                                padding: 8px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                resize: vertical;
                                font-size: 13px;
                            " placeholder="输入关键词，每行一个..."></textarea>
                        </div>

                        <!-- 匹配模式 -->
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333;">
                                🔍 匹配模式：
                            </label>
                            <select id="match-mode-select" style="
                                width: 100%;
                                padding: 8px;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                font-size: 13px;
                            ">
                                <option value="contains">包含匹配</option>
                                <option value="exact">精确匹配</option>
                            </select>
                        </div>

                        <!-- 滚动控制 -->
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #333;">
                                📜 滚动控制：
                            </label>
                            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <button id="start-scroll-btn" style="
                                    flex: 1;
                                    padding: 8px 12px;
                                    background: #4CAF50;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 13px;
                                ">▶️ 开始滚动</button>
                                <button id="stop-scroll-btn" style="
                                    flex: 1;
                                    padding: 8px 12px;
                                    background: #f44336;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 13px;
                                ">⏹️ 停止滚动</button>
                            </div>
                            <div style="margin-bottom: 8px;">
                                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #555;">
                                    <input type="checkbox" id="auto-open-in-scroll" style="margin: 0;">
                                    滚动时自动打开匹配文章
                                </label>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <input type="number" id="scroll-speed-input" min="100" max="5000" value="1000" placeholder="滚动间隔(ms)" style="
                                    flex: 1;
                                    padding: 6px;
                                    border: 1px solid #ddd;
                                    border-radius: 4px;
                                    font-size: 12px;
                                ">
                                <input type="number" id="scroll-interval-input" min="1000" max="10000" value="3000" placeholder="滚动延时(ms)" style="
                                    flex: 1;
                                    padding: 6px;
                                    border: 1px solid #ddd;
                                    border-radius: 4px;
                                    font-size: 12px;
                                ">
                            </div>
                        </div>

                        <!-- 操作按钮 -->
                        <div style="margin-bottom: 16px;">
                            <button id="refresh-btn" style="
                                width: 100%;
                                padding: 10px;
                                background: #2196F3;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: 600;
                                margin-bottom: 8px;
                            ">🔄 刷新文章列表</button>

                            <button id="open-matched-btn" style="
                                width: 100%;
                                padding: 10px;
                                background: #FF9800;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: 600;
                                margin-bottom: 8px;
                            ">🔓 打开匹配文章</button>

                            <button id="show-history-btn" style="
                                width: 100%;
                                padding: 10px;
                                background: #9C27B0;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: 600;
                                margin-bottom: 8px;
                            ">📚 历史记录</button>

                            <button id="reset-config-btn" style="
                                width: 100%;
                                padding: 8px;
                                background: #9E9E9E;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 13px;
                            ">🔧 重置配置</button>
                        </div>

                        <!-- 状态显示 -->
                        <div id="status-display" style="
                            padding: 12px;
                            background: #f5f5f5;
                            border-radius: 4px;
                            font-size: 12px;
                            color: #666;
                            line-height: 1.4;
                        ">
                            <div>📊 状态：就绪</div>
                            <div>📄 文章数：0</div>
                            <div>🎯 匹配数：0</div>
                            <div>📑 标签页：0/3</div>
                            <div id="window-counter-display">🪟 窗口：0/10</div>
                            <button id="reset-window-counter-btn" style="
                                margin-top: 8px;
                                padding: 6px 12px;
                                background: #FF5722;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 11px;
                                width: 100%;
                            ">🔄 重置窗口计数</button>
                        </div>
                    </div>
                </div>

                <!-- 浮动按钮 -->
                <button id="linux-do-helper-toggle" style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #2196F3, #1976D2);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    z-index: 9999;
                    transition: all 0.3s ease;
                " title="Linux.do 文章助手">🐧</button>

                <!-- 历史记录弹窗 -->
                <div id="history-modal" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 10002;
                    display: none;
                    align-items: center;
                    justify-content: center;
                ">
                    <div style="
                        background: white;
                        border-radius: 12px;
                        width: 90%;
                        max-width: 800px;
                        max-height: 80vh;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    ">
                        <!-- 头部 -->
                        <div style="
                            background: linear-gradient(135deg, #9C27B0, #7B1FA2);
                            color: white;
                            padding: 16px 20px;
                            border-radius: 12px 12px 0 0;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">📚 打开历史记录</h3>
                            <div style="display: flex; gap: 12px; align-items: center;">
                                <span id="history-stats" style="font-size: 14px; opacity: 0.9;">总计: 0 篇</span>
                                <button id="close-history-btn" style="
                                    background: rgba(255,255,255,0.2);
                                    border: none;
                                    color: white;
                                    width: 28px;
                                    height: 28px;
                                    border-radius: 50%;
                                    cursor: pointer;
                                    font-size: 18px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                ">×</button>
                            </div>
                        </div>

                        <!-- 工具栏 -->
                        <div style="
                            padding: 12px 20px;
                            border-bottom: 1px solid #eee;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 12px;
                        ">
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <label style="font-size: 14px; color: #666;">筛选来源:</label>
                                <select id="history-filter" style="
                                    padding: 6px 12px;
                                    border: 1px solid #ddd;
                                    border-radius: 4px;
                                    font-size: 13px;
                                ">
                                    <option value="all">全部</option>
                                    <option value="manual">手动打开</option>
                                    <option value="auto-scroll">滚动自动</option>
                                </select>
                            </div>
                            <button id="clear-history-btn" style="
                                padding: 6px 12px;
                                background: #f44336;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 13px;
                            ">🗑️ 清空记录</button>
                        </div>

                        <!-- 列表内容 -->
                        <div id="history-list" style="
                            flex: 1;
                            overflow-y: auto;
                            padding: 16px 20px;
                        ">
                            <div style="
                                text-align: center;
                                color: #999;
                                padding: 40px;
                                font-size: 14px;
                            ">暂无历史记录</div>
                        </div>
                    </div>
                </div>
            `;
        },

        // 初始化控制面板
        init() {
            const panelHTML = this.createPanelHTML();
            document.body.insertAdjacentHTML('beforeend', panelHTML);

            this.panel = document.getElementById('linux-do-helper-panel');
            this.bindEvents();
            this.loadConfig();
        },

        // 绑定事件
        bindEvents() {
            // 切换按钮
            const toggleBtn = document.getElementById('linux-do-helper-toggle');
            toggleBtn?.addEventListener('click', () => this.toggle());

            // 关闭按钮
            const closeBtn = document.getElementById('close-panel-btn');
            closeBtn?.addEventListener('click', () => this.hide());

            // 面板拖拽
            this.makePanelDraggable();

            // 功能按钮
            document.getElementById('refresh-btn')?.addEventListener('click', () => this.refreshTopics());
            document.getElementById('open-matched-btn')?.addEventListener('click', () => this.openMatchedTopics());
            document.getElementById('show-history-btn')?.addEventListener('click', () => this.showHistoryModal());
            document.getElementById('reset-config-btn')?.addEventListener('click', () => this.resetConfig());
            document.getElementById('reset-window-counter-btn')?.addEventListener('click', () => this.resetWindowCounter());

            // 历史记录弹窗事件
            document.getElementById('close-history-btn')?.addEventListener('click', () => this.hideHistoryModal());
            document.getElementById('clear-history-btn')?.addEventListener('click', () => this.clearHistory());
            document.getElementById('history-filter')?.addEventListener('change', () => this.refreshHistoryList());

            // 点击弹窗背景关闭
            document.getElementById('history-modal')?.addEventListener('click', (e) => {
                if (e.target.id === 'history-modal') {
                    this.hideHistoryModal();
                }
            });

            // 滚动控制
            document.getElementById('start-scroll-btn')?.addEventListener('click', () => this.startAutoScroll());
            document.getElementById('stop-scroll-btn')?.addEventListener('click', () => this.stopAutoScroll());

            // 配置变更
            document.getElementById('keywords-input')?.addEventListener('change', () => this.saveConfig());
            document.getElementById('match-mode-select')?.addEventListener('change', () => this.saveConfig());
            document.getElementById('scroll-speed-input')?.addEventListener('change', () => this.saveConfig());
            document.getElementById('scroll-interval-input')?.addEventListener('change', () => this.saveConfig());
            document.getElementById('auto-open-in-scroll')?.addEventListener('change', () => this.saveConfig());
        },

        // 使面板可拖拽
        makePanelDraggable() {
            const header = this.panel?.querySelector('div[style*="cursor: move"]');
            if (!header) return;

            let isDragging = false;
            let currentX;
            let currentY;
            let initialX;
            let initialY;

            header.addEventListener('mousedown', (e) => {
                isDragging = true;
                initialX = e.clientX - this.panel.offsetLeft;
                initialY = e.clientY - this.panel.offsetTop;
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                this.panel.style.left = currentX + 'px';
                this.panel.style.top = currentY + 'px';
                this.panel.style.right = 'auto';
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        },

        // 显示面板
        show() {
            if (this.panel) {
                this.panel.style.display = 'block';
                this.isVisible = true;
                document.getElementById('linux-do-helper-toggle').style.display = 'none';
            }
        },

        // 隐藏面板
        hide() {
            if (this.panel) {
                this.panel.style.display = 'none';
                this.isVisible = false;
                document.getElementById('linux-do-helper-toggle').style.display = 'block';
            }
        },

        // 切换显示状态
        toggle() {
            if (this.isVisible) {
                this.hide();
            } else {
                this.show();
            }
        },

        // 加载配置到界面
        loadConfig() {
            const config = ConfigManager.getConfig();

            const keywordsInput = document.getElementById('keywords-input');
            const matchModeSelect = document.getElementById('match-mode-select');
            const scrollSpeedInput = document.getElementById('scroll-speed-input');
            const scrollIntervalInput = document.getElementById('scroll-interval-input');
            const autoOpenCheckbox = document.getElementById('auto-open-in-scroll');

            if (keywordsInput) keywordsInput.value = config.keywords.join('\n');
            if (matchModeSelect) matchModeSelect.value = config.matchMode;
            if (scrollSpeedInput) scrollSpeedInput.value = config.scrollSpeed;
            if (scrollIntervalInput) scrollIntervalInput.value = config.scrollInterval;
            if (autoOpenCheckbox) autoOpenCheckbox.checked = config.autoOpenInScroll;
        },

        // 保存界面配置
        saveConfig() {
            const keywordsInput = document.getElementById('keywords-input');
            const matchModeSelect = document.getElementById('match-mode-select');
            const scrollSpeedInput = document.getElementById('scroll-speed-input');
            const scrollIntervalInput = document.getElementById('scroll-interval-input');
            const autoOpenCheckbox = document.getElementById('auto-open-in-scroll');

            const config = ConfigManager.getConfig();

            if (keywordsInput) {
                config.keywords = keywordsInput.value.split('\n')
                    .map(k => k.trim())
                    .filter(k => k.length > 0);
            }

            if (matchModeSelect) config.matchMode = matchModeSelect.value;
            if (scrollSpeedInput) config.scrollSpeed = parseInt(scrollSpeedInput.value) || 1000;
            if (scrollIntervalInput) config.scrollInterval = parseInt(scrollIntervalInput.value) || 3000;
            if (autoOpenCheckbox) config.autoOpenInScroll = autoOpenCheckbox.checked;

            ConfigManager.saveConfig(config);
            //TabManager.init(); // 已简化，不再需要初始化并发数

            this.updateStatus('配置已保存');
        },

        // 重置配置
        resetConfig() {
            const config = ConfigManager.resetConfig();
            this.loadConfig();
            //TabManager.init(); // 已简化，不再需要初始化并发数
            this.updateStatus('配置已重置');
        },

        // 更新状态显示
        updateStatus(message = '', stats = {}) {
            const statusDiv = document.getElementById('status-display');
            if (!statusDiv) return;

            const tabStatus = TabManager.getStatus();
            const windowStatus = WindowCounter.getStatus();

            statusDiv.innerHTML = `
                <div>📊 状态：${message || '就绪'}</div>
                <div>📄 文章数：${stats.total || 0}</div>
                <div>🎯 匹配数：${stats.matched || 0}</div>
                <div>📚 已打开：${openedCount} 篇</div>
                <div>🪟 窗口：${windowStatus.current}/${windowStatus.max}</div>
                <div style="display: flex; gap: 4px; margin-top: 8px;">
                    <button id="reset-window-counter-btn" style="
                        flex: 1;
                        padding: 6px 8px;
                        background: ${windowStatus.isLimitReached ? '#f44336' : '#FF5722'};
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">🔄 重置窗口计数</button>
                    <button id="clear-opened-articles-btn" style="
                        flex: 1;
                        padding: 6px 8px;
                        background: #9E9E9E;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 11px;
                    ">🗑️ 清空打开记录</button>
                </div>
            `;

            // 重新绑定重置按钮事件
            document.getElementById('reset-window-counter-btn')?.addEventListener('click', () => this.resetWindowCounter());
            document.getElementById('clear-opened-articles-btn')?.addEventListener('click', () => this.clearOpenedArticles());
        },

        // 重置窗口计数器
        resetWindowCounter() {
            if (confirm('确定要重置窗口计数器吗？重置后可以继续打开新窗口。')) {
                WindowCounter.reset();
                this.updateStatus('窗口计数器已重置');
                console.log('Linux.do助手: 用户手动重置窗口计数器');
            }
        },

        // 清空已打开文章记录
        clearOpenedArticles() {
            const openedCount = OpenedArticlesManager.getOpenedCount();
            if (confirm(`确定要清空已打开文章记录吗？当前已记录 ${openedCount} 篇文章。清空后可以重新打开这些文章。`)) {
                OpenedArticlesManager.clearOpenedArticles();
                this.updateStatus(`已清空 ${openedCount} 篇文章的打开记录`);
                console.log('Linux.do助手: 用户手动清空已打开文章记录');
            }
        },

        // 刷新文章列表
        async refreshTopics() {
            try {
                this.updateStatus('正在获取文章列表...');
                const topics = await DataFetcher.fetchTopics();

                const config = ConfigManager.getConfig();
                const matchedTopics = KeywordMatcher.filterTopics(topics, config.keywords, config.matchMode);

                this.updateStatus(`获取完成`, { total: topics.length, matched: matchedTopics.length });

                // 高亮匹配的文章
                if (config.enableHighlight) {
                    this.highlightMatchedTopics(matchedTopics);
                }

                // 发送通知
                if (config.enableNotification && matchedTopics.length > 0) {
                    GM_notification({
                        title: 'Linux.do 文章助手',
                        text: `找到 ${matchedTopics.length} 篇匹配文章`,
                        highlight: true,
                        timeout: 5000
                    });
                }

            } catch (error) {
                console.error('Linux.do助手: 刷新失败', error);
                this.updateStatus('刷新失败: ' + error.message);
            }
        },

        // 打开匹配的文章
        async openMatchedTopics() {
            try {
                const topics = await DataFetcher.fetchTopics();
                const config = ConfigManager.getConfig();
                const matchedTopics = KeywordMatcher.filterTopics(topics, config.keywords, config.matchMode);

                if (matchedTopics.length === 0) {
                    this.updateStatus('没有匹配的文章');
                    return;
                }

                this.updateStatus(`正在打开 ${matchedTopics.length} 篇文章...`);

                const urls = matchedTopics.map(topic => topic.url);
                const results = await TabManager.openMultipleTabs(urls, 3000, matchedTopics, 'manual');

                const successCount = results.filter(r => r.success).length;
                const failCount = results.length - successCount;

                this.updateStatus(`已打开 ${successCount} 篇文章${failCount > 0 ? `，失败 ${failCount} 篇` : ''}`);

            } catch (error) {
                console.error('Linux.do助手: 打开文章失败', error);
                this.updateStatus('打开失败: ' + error.message);
            }
        },

        // 高亮匹配的文章
        highlightMatchedTopics(matchedTopics) {
            // 清除之前的高亮
            document.querySelectorAll('.linux-do-highlight').forEach(el => {
                el.classList.remove('linux-do-highlight');
                el.style.backgroundColor = '';
            });

            // 高亮当前匹配的文章
            matchedTopics.forEach(topic => {
                if (topic.element) {
                    topic.element.classList.add('linux-do-highlight');
                    topic.element.style.backgroundColor = '#fffbdd';
                    topic.element.style.borderLeft = '3px solid #FF9800';
                }
            });
        },

        // 开始自动滚动
        startAutoScroll() {
            if (this.scrollTimer) {
                clearInterval(this.scrollTimer);
            }

            const config = ConfigManager.getConfig();
            const scrollSpeed = config.scrollSpeed;
            const scrollInterval = config.scrollInterval;

            this.scrollTimer = setInterval(() => {
                const scrollHeight = document.documentElement.scrollHeight;
                const clientHeight = document.documentElement.clientHeight;
                const scrollTop = document.documentElement.scrollTop;

                if (scrollTop + clientHeight >= scrollHeight - 100) {
                    // 到达底部，重新开始
                    window.scrollTo(0, 0);
                } else {
                    // 正常滚动
                    window.scrollBy(0, 300);
                }

                // 检查新加载的文章
                this.checkNewTopics();

            }, scrollInterval);

            this.updateStatus('自动滚动已启动');
        },

        // 停止自动滚动
        stopAutoScroll() {
            if (this.scrollTimer) {
                clearInterval(this.scrollTimer);
                this.scrollTimer = null;
                this.updateStatus('自动滚动已停止');
            }
        },

        // 检查新加载的文章
        async checkNewTopics() {
            try {
                const config = ConfigManager.getConfig();
                const topics = DataFetcher.fetchViaDOM(); // 使用DOM解析获取当前页面文章

                // 调试信息：打印获取到的文章数量和标题
                console.log('Linux.do助手: 当前关键词:', config.keywords);
                console.log('Linux.do助手: 匹配模式:', config.matchMode);
                console.log('Linux.do助手: 自动打开功能:', config.autoOpenInScroll);

                // 打印前几篇文章的标题用于调试
                topics.slice(0, 3).forEach((topic, index) => {
                    console.log(`Linux.do助手: 文章${index + 1}: "${topic.title}"`);
                });

                const matchedTopics = KeywordMatcher.filterTopics(topics, config.keywords, config.matchMode);

                // 调试信息：打印匹配结果
                console.log('Linux.do助手: 匹配到', matchedTopics.length, '篇文章');
                matchedTopics.forEach((topic, index) => {
                    console.log(`Linux.do助手: 匹配文章${index + 1}: "${topic.title}" (关键词: ${topic.matchedKeywords?.join(', ')})`);
                });

                // 检查窗口限制
                const windowStatus = WindowCounter.getStatus();
                console.log('Linux.do助手: 窗口状态:', windowStatus);

                // 如果启用自动打开功能，自动打开匹配的文章
                if (config.autoOpenInScroll && matchedTopics.length > 0) {
                    // 过滤掉已经打开过的文章
                    const unopenedTopics = matchedTopics.filter(topic => {
                        const isOpened = OpenedArticlesManager.isArticleOpened(topic.url);
                        if (!isOpened) {
                            console.log(`Linux.do助手: 文章未打开过: ${topic.title}`);
                        } else {
                            console.log(`Linux.do助手: 文章已打开，跳过: ${topic.title}`);
                        }
                        return !isOpened;
                    });

                    console.log('Linux.do助手: 过滤后发现', unopenedTopics.length, '篇未打开过的匹配文章');

                    if (unopenedTopics.length > 0 && !WindowCounter.isLimitReached()) {
                        // 限制可打开的文章数量
                        const remainingCount = WindowCounter.getRemainingCount();
                        const topicsToOpen = unopenedTopics.slice(0, remainingCount);

                        console.log('Linux.do助手: 计划打开', topicsToOpen.length, '篇文章 (剩余配额:', remainingCount, ')');

                        // 自动打开匹配的文章
                        for (const topic of topicsToOpen) {
                            try {
                                console.log('Linux.do助手: 正在打开文章:', topic.title);
                                // 保持当前窗口焦点，不在后台打开
                                await TabManager.openTab(topic.url, false, false, topic, 'auto-scroll');

                                // 增加延迟时间，降低打开速度
                                await new Promise(resolve => setTimeout(resolve, 2000));

                                // 检查是否达到上限
                                if (WindowCounter.isLimitReached()) {
                                    console.log('Linux.do助手: 达到窗口上限，停止打开');
                                    this.updateStatus(`已达到窗口上限 (${WindowCounter.maxWindows}个)，滚动已停止`);
                                    this.stopAutoScroll();
                                    break;
                                }
                            } catch (error) {
                                console.error('Linux.do助手: 自动打开文章失败', error);
                                // 如果是重复打开错误，继续处理下一个
                                if (error.message.includes('文章已经打开过了')) {
                                    console.log('Linux.do助手: 跳过重复文章');
                                    continue;
                                }
                                // 如果是窗口上限错误，停止打开
                                if (error.message.includes('窗口打开上限')) {
                                    this.updateStatus(error.message);
                                    this.stopAutoScroll();
                                    break;
                                }
                            }
                        }

                        // 如果达到上限，更新状态
                        if (WindowCounter.isLimitReached()) {
                            this.updateStatus(`已打开${WindowCounter.maxWindows}个窗口，达到上限`);
                        }
                    } else if (WindowCounter.isLimitReached()) {
                        console.log('Linux.do助手: 已达到窗口上限，跳过自动打开');
                        this.updateStatus(`已达到窗口上限 (${WindowCounter.maxWindows}个)，请重置计数器`);
                    } else {
                        console.log('Linux.do助手: 无新的匹配文章需要打开（可能都已打开过）');
                    }
                } else {
                    console.log('Linux.do助手: 自动打开功能未启用或无匹配文章');
                }

                // 如果有新的匹配文章，发送通知
                if (matchedTopics.length > 0 && config.enableNotification) {
                    const newTopics = matchedTopics.filter(topic => !topic.notified);
                    if (newTopics.length > 0) {
                        newTopics.forEach(topic => topic.notified = true);
                        GM_notification({
                            title: 'Linux.do 文章助手',
                            text: `发现 ${newTopics.length} 篇新匹配文章`,
                            highlight: false,
                            timeout: 3000
                        });
                    }
                }

                // 高亮匹配的文章
                if (config.enableHighlight) {
                    this.highlightMatchedTopics(matchedTopics);
                }

            } catch (error) {
                console.error('Linux.do助手: 检查新文章失败', error);
            }
        },

        // 显示历史记录弹窗
        showHistoryModal() {
            const modal = document.getElementById('history-modal');
            if (modal) {
                modal.style.display = 'flex';
                this.refreshHistoryList();
                this.updateHistoryStats();
            }
        },

        // 隐藏历史记录弹窗
        hideHistoryModal() {
            const modal = document.getElementById('history-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        },

        // 更新历史统计信息
        updateHistoryStats() {
            const stats = HistoryManager.getStats();
            const statsElement = document.getElementById('history-stats');
            if (statsElement) {
                statsElement.textContent = `总计: ${stats.total} 篇 | 今日: ${stats.today} 篇 | 手动: ${stats.bySource.manual} | 自动: ${stats.bySource.autoScroll}`;
            }
        },

        // 刷新历史记录列表
        refreshHistoryList() {
            const listElement = document.getElementById('history-list');
            const filter = document.getElementById('history-filter')?.value || 'all';

            if (!listElement) return;

            const history = HistoryManager.getHistory();
            let filteredHistory = history;

            // 应用筛选
            if (filter !== 'all') {
                filteredHistory = history.filter(record => record.source === filter);
            }

            if (filteredHistory.length === 0) {
                listElement.innerHTML = `
                    <div style="
                        text-align: center;
                        color: #999;
                        padding: 40px;
                        font-size: 14px;
                    ">暂无${filter === 'all' ? '' : filter === 'manual' ? '手动打开' : '滚动自动'}的历史记录</div>
                `;
                return;
            }

            // 生成列表HTML
            const historyHTML = filteredHistory.map(record => {
                const openTime = new Date(record.openTime);
                const timeStr = openTime.toLocaleString('zh-CN');
                const sourceIcon = record.source === 'manual' ? '👆' : '🤖';
                const sourceText = record.source === 'manual' ? '手动打开' : '滚动自动';

                return `
                    <div style="
                        background: #f9f9f9;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 8px;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='#f0f0f0'; this.style.borderColor='#d0d0d0';"
                       onmouseout="this.style.background='#f9f9f9'; this.style.borderColor='#e0e0e0';">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                            <div style="flex: 1; margin-right: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <span style="font-size: 14px;" title="${sourceText}">${sourceIcon}</span>
                                    <a href="${record.url}" target="_blank" style="
                                        color: #2196F3;
                                        text-decoration: none;
                                        font-weight: 500;
                                        font-size: 14px;
                                        line-height: 1.3;
                                    " onmouseover="this.style.textDecoration='underline';"
                                       onmouseout="this.style.textDecoration='none';">${record.title}</a>
                                </div>
                                <div style="font-size: 12px; color: #666; line-height: 1.4;">
                                    <span>作者: ${record.author}</span>
                                    <span style="margin-left: 12px;">回复: ${record.replies}</span>
                                    <span style="margin-left: 12px;">浏览: ${record.views}</span>
                                </div>
                            </div>
                            <button onclick="window.linuxDoHelper?.deleteHistoryRecord('${record.id}')" style="
                                background: #f44336;
                                color: white;
                                border: none;
                                border-radius: 4px;
                                padding: 4px 8px;
                                cursor: pointer;
                                font-size: 12px;
                                flex-shrink: 0;
                            ">删除</button>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #999;">
                            <div>
                                ${record.keywords.length > 0 ? `匹配关键词: ${record.keywords.join(', ')}` : '无关键词匹配'}
                            </div>
                            <div>${timeStr}</div>
                        </div>
                    </div>
                `;
            }).join('');

            listElement.innerHTML = historyHTML;
        },

        // 清空历史记录
        clearHistory() {
            if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
                HistoryManager.clearHistory();
                this.refreshHistoryList();
                this.updateHistoryStats();
                this.updateStatus('历史记录已清空');
            }
        },

        // 删除特定历史记录
        deleteHistoryRecord(recordId) {
            HistoryManager.deleteRecord(recordId);
            this.refreshHistoryList();
            this.updateHistoryStats();
        }
    };

    // ==================== 滚动控制模块 ====================
    const ScrollController = {
        isScrolling: false,
        scrollTimer: null,

        // 智能滚动到匹配的文章
        async scrollToMatchedTopics() {
            try {
                const topics = await DataFetcher.fetchTopics();
                const config = ConfigManager.getConfig();
                const matchedTopics = KeywordMatcher.filterTopics(topics, config.keywords, config.matchMode);

                if (matchedTopics.length === 0) {
                    return false;
                }

                // 滚动到第一个匹配的文章
                const firstMatch = matchedTopics[0];
                if (firstMatch.element) {
                    firstMatch.element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    return true;
                }

                return false;
            } catch (error) {
                console.error('Linux.do助手: 滚动失败', error);
                return false;
            }
        },

        // 分页滚动浏览
        startPagedScroll(interval = 5000) {
            if (this.scrollTimer) {
                clearInterval(this.scrollTimer);
            }

            this.scrollTimer = setInterval(async () => {
                const hasMatched = await this.scrollToMatchedTopics();
                if (!hasMatched) {
                    // 如果没有匹配的文章，继续向下滚动
                    window.scrollBy(0, 500);
                }
            }, interval);

            this.isScrolling = true;
        },

        // 停止分页滚动
        stopPagedScroll() {
            if (this.scrollTimer) {
                clearInterval(this.scrollTimer);
                this.scrollTimer = null;
            }
            this.isScrolling = false;
        }
    };

    // ==================== 主程序初始化 ====================
    async function init() {
        try {
            console.log('Linux.do助手: 开始初始化...');

            // 初始化配置
            const config = ConfigManager.getConfig();

            // 初始化已打开文章管理器
            OpenedArticlesManager.cleanInvalidRecords(); // 清理无效记录
            console.log('Linux.do助手: 已打开文章记录数量:', OpenedArticlesManager.getOpenedCount());

            // 初始化窗口计数器
            WindowCounter.load();

            // 初始化标签页管理器
            //TabManager.init(); // 已简化，不再需要初始化并发数

            // 初始化控制面板
            ControlPanel.init();

            // 自动获取文章列表
            await ControlPanel.refreshTopics();

            console.log('Linux.do助手: 初始化完成');

            // 添加全局引用，用于内联事件处理
            window.linuxDoHelper = {
                deleteHistoryRecord: (recordId) => ControlPanel.deleteHistoryRecord(recordId)
            };

            // 添加页面卸载时的清理
            window.addEventListener('beforeunload', () => {
                ControlPanel.stopAutoScroll();
                ScrollController.stopPagedScroll();
            });

        } catch (error) {
            console.error('Linux.do助手: 初始化失败', error);
        }
    }

    // 等待页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();