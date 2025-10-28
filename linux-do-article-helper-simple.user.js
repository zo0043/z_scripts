// ==UserScript==
// @name         Linux.do 文章助手
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Linux.do文章助手 - 关键词匹配、批量打开功能、智能自动滚动和快捷键控制
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
        // 滚动状态枚举（实用版）
        ScrollState: {
            STOPPED: 'stopped',           // 停止状态
            SCROLLING: 'scrolling',       // 自动滚动中
            PAUSED: 'paused',             // 用户暂停
            ERROR: 'error'                // 错误状态
        },

        // 状态机相关变量
        currentScrollState: 'stopped',   // 当前滚动状态
        lastScrollDirection: null,       // 上次滚动方向
        stateTransitionLocked: false,    // 状态转换锁定（防止快速重复转换）
        lastStateTransitionTime: 0,      // 上次状态转换时间
        pendingTransition: null,         // 待处理的状态转换
        transitionLockTimer: null,       // 转换锁定定时器
        stateHistory: [],                // 状态转换历史记录（用于调试）
        lastProcessTime: 0,             // 上次处理滚动事件的时间（用于节流）

        // 用户滚动行为检测相关变量
        lastScrollTop: 0,
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

        // ===== 状态机核心方法 =====

        // 检查是否可以转换到目标状态
        canTransitionTo(newState) {
            const currentState = this.currentScrollState;
            const now = Date.now();
            const timeSinceLastTransition = now - this.lastStateTransitionTime;

            // 防止快速重复转换（至少间隔100ms）
            if (timeSinceLastTransition < 100 && this.stateTransitionLocked) {
                return false;
            }

            // 定义允许的状态转换规则（实用版）
            const allowedTransitions = {
                [this.ScrollState.STOPPED]: [this.ScrollState.SCROLLING, this.ScrollState.ERROR],
                [this.ScrollState.SCROLLING]: [this.ScrollState.PAUSED, this.ScrollState.STOPPED, this.ScrollState.ERROR],
                [this.ScrollState.PAUSED]: [this.ScrollState.SCROLLING, this.ScrollState.STOPPED, this.ScrollState.ERROR],
                [this.ScrollState.ERROR]: [this.ScrollState.STOPPED, this.ScrollState.SCROLLING] // 允许从错误状态恢复
            };

            return allowedTransitions[currentState]?.includes(newState) || false;
        },

        // 队列化状态转换请求（解决竞态条件）
        queueTransition(newState, context) {
            this.pendingTransition = { newState, context, timestamp: Date.now() };
            console.log('状态转换已排队:', this.pendingTransition);
            return false;
        },

        // 处理待处理的转换请求
        processPendingTransition() {
            if (this.pendingTransition && !this.stateTransitionLocked) {
                const { newState, context } = this.pendingTransition;
                this.pendingTransition = null;
                return this.executeTransition(newState, context);
            }
            return false;
        },

        // 执行状态转换的核心逻辑
        executeTransition(newState, context = {}) {
            const oldState = this.currentScrollState;

            try {
                // 记录状态转换历史
                this.recordStateTransition(oldState, newState, context);

                // 执行状态转换
                this.currentScrollState = newState;
                this.lastStateTransitionTime = Date.now();

                // 设置转换锁定
                this.setStateTransitionLocked(true);

                // 异步触发状态进入时的副作用（避免阻塞）
                this.onStateEnterAsync(newState, oldState, context)
                    .catch(error => {
                        console.error('状态进入副作用执行失败:', error);
                        this.handleStateError(error, newState, oldState);
                    });

                console.log(`滚动状态转换: ${oldState} -> ${newState}`, context);
                return true;

            } catch (error) {
                console.error('状态转换执行失败:', error);
                this.handleStateError(error, newState, oldState);
                return false;
            }
        },

        // 改进的状态转换核心方法
        transitionScrollState(newState, context = {}) {
            // 验证输入
            if (!newState || typeof newState !== 'string') {
                console.error('无效的状态转换目标:', newState);
                return false;
            }

            // 检查是否可以转换
            if (!this.canTransitionTo(newState)) {
                // 如果当前锁定，将转换请求排队
                if (this.stateTransitionLocked) {
                    return this.queueTransition(newState, context);
                }
                console.warn(`不允许的状态转换: ${this.currentScrollState} -> ${newState}`);
                return false;
            }

            return this.executeTransition(newState, context);
        },

        // 设置状态转换锁定
        setStateTransitionLocked(locked) {
            this.stateTransitionLocked = locked;

            if (locked) {
                // 清理之前的定时器
                if (this.transitionLockTimer) {
                    clearTimeout(this.transitionLockTimer);
                }

                // 设置新的锁定定时器
                this.transitionLockTimer = setTimeout(() => {
                    this.stateTransitionLocked = false;
                    this.transitionLockTimer = null;

                    // 处理待处理的转换请求
                    this.processPendingTransition();
                }, 150);
            } else {
                // 如果手动解锁，清理定时器
                if (this.transitionLockTimer) {
                    clearTimeout(this.transitionLockTimer);
                    this.transitionLockTimer = null;
                }
            }
        },

        // 记录状态转换历史
        recordStateTransition(from, to, context) {
            const record = {
                from,
                to,
                context: { ...context },
                timestamp: Date.now()
            };

            this.stateHistory.push(record);

            // 保持最近50条记录
            if (this.stateHistory.length > 50) {
                this.stateHistory.shift();
            }
        },

        // 异步状态进入时的副作用处理（带异常保护）
        async onStateEnterAsync(newState, oldState, context = {}) {
            try {
                await this.onStateEnter(newState, oldState, context);
            } catch (error) {
                console.error('状态进入副作用异步执行失败:', error);
                throw error; // 重新抛出，让上层处理
            }
        },

        // 状态进入时的副作用处理（优化异步操作）
        onStateEnter(newState, oldState, context = {}) {
            const { reason, direction } = context;

            try {
                switch (newState) {
                    case this.ScrollState.SCROLLING:
                        if (oldState === this.ScrollState.PAUSED && direction === 'down') {
                            TabManager.showNotification('向下滚动，自动滚动已恢复', 'resume');

                            // 恢复滚动时，重新启动递归调度机制
                            setTimeout(() => {
                                // 双重检查：确保状态仍然有效
                                if (this.currentScrollState === this.ScrollState.SCROLLING &&
                                    AppState.isTopicScrolling) {

                                    // 重新启动递归调度
                                    this.restartScrolling();
                                }
                            }, 150); // 增加延迟确保状态稳定
                        }
                        break;

                    case this.ScrollState.PAUSED:
                        if (direction === 'up') {
                            TabManager.showNotification('向上滚动，自动滚动已暂停', 'pause');

                            // 确保AppState状态正确（暂停时仍然应该为true）
                            if (!AppState.isTopicScrolling) {
                                console.warn('修复AppState状态：暂停时isTopicScrolling应该为true');
                                AppState.isTopicScrolling = true;
                            }
                        }
                        break;

                    case this.ScrollState.STOPPED:
                        // 停止状态的副作用已在外部处理
                        break;

                    case this.ScrollState.ERROR:
                        TabManager.showNotification('自动滚动遇到错误，已重置', 'error');
                        break;
                }

                // 更新UI状态显示（带异常保护）
                try {
                    this.updateTopicScrollStatusThrottled();
                } catch (uiError) {
                    console.warn('UI状态更新失败:', uiError);
                }

            } catch (error) {
                console.error('状态进入副作用执行失败:', error);
                throw error; // 重新抛出，让异步处理器捕获
            }
        },

        // 状态错误处理机制
        handleStateError(error, newState, oldState) {
            console.error('状态机错误:', {
                error: error.message,
                newState,
                oldState,
                currentState: this.currentScrollState,
                timestamp: Date.now()
            });

            // 尝试恢复到安全状态
            try {
                // 如果错误发生在状态转换过程中，尝试回滚到之前的状态
                if (this.currentScrollState === newState) {
                    this.currentScrollState = oldState;
                    console.log('已回滚到安全状态:', oldState);
                }

                // 重置锁定状态
                this.setStateTransitionLocked(false);

                // 清理待处理的转换
                this.pendingTransition = null;

                // 通知用户（如果需要）
                TabManager.showNotification('自动滚动遇到错误，已重置', 'error');

            } catch (recoveryError) {
                console.error('错误恢复失败:', recoveryError);
                // 最后的安全措施：强制重置所有状态
                this.forceReset();
            }
        },

        // 强制重置状态机（最后的安全措施）
        forceReset() {
            console.warn('强制重置状态机');

            try {
                // 使用统一的清理方法
                this.clearAllTimers();

                // 清理AppState定时器
                if (AppState.topicScrollTimer) {
                    clearTimeout(AppState.topicScrollTimer);
                    AppState.topicScrollTimer = null;
                }

                // 重置所有状态变量
                this.currentScrollState = this.ScrollState.STOPPED;
                this.lastScrollDirection = null;
                this.stateTransitionLocked = false;
                this.lastStateTransitionTime = Date.now();
                this.pendingTransition = null;
                this.lastProcessTime = 0;

                // 强制同步AppState状态
                AppState.isTopicScrolling = false;

                // 移除事件监听器
                this.unbindUserScrollEvents();

                // 记录强制重置事件
                this.recordStateTransition('UNKNOWN', this.ScrollState.STOPPED, {
                    reason: 'force_reset',
                    error: '状态机强制重置',
                    timestamp: Date.now()
                });

                console.log('状态机已强制重置到安全状态');

            } catch (error) {
                console.error('强制重置失败:', error);
                // 最后的最后：直接设置状态变量，不依赖任何方法
                try {
                    this.currentScrollState = this.ScrollState.STOPPED;
                    AppState.isTopicScrolling = false;
                } catch (fatalError) {
                    console.error('致命错误：无法重置状态:', fatalError);
                }
            }
        },

        // 状态验证方法
        validateState() {
            const validStates = Object.values(this.ScrollState);

            if (!validStates.includes(this.currentScrollState)) {
                throw new Error(`无效的当前状态: ${this.currentScrollState}`);
            }

            // 检查AppState和状态机的一致性（以状态机为权威）
            const shouldBeScrolling = this.currentScrollState === this.ScrollState.SCROLLING;

            if (AppState.isTopicScrolling !== shouldBeScrolling) {
                console.warn(`状态不一致: AppState.isTopicScrolling=${AppState.isTopicScrolling} 但状态机=${this.currentScrollState}`);
                // 以状态机为准，自动修复AppState
                AppState.isTopicScrolling = shouldBeScrolling;
                console.log(`已自动修复AppState状态为: ${shouldBeScrolling}`);
            }

            // 检查定时器状态一致性（仅在应该滚动时检查）
            if (shouldBeScrolling && !AppState.topicScrollTimer) {
                console.warn('警告: 应该滚动但没有topicScrollTimer');
            }

            if (!shouldBeScrolling && AppState.topicScrollTimer) {
                console.warn('警告: 不应该滚动但存在topicScrollTimer，正在清理');
                clearTimeout(AppState.topicScrollTimer);
                AppState.topicScrollTimer = null;
            }

            return true;
        },

        // 统一的滚动事件处理方法（完善的状态转换逻辑）
        handleUserScrollEvent(direction) {
            // 更新上次滚动方向
            if (this.lastScrollDirection !== direction) {
                this.lastScrollDirection = direction;
            }

            const currentState = this.currentScrollState;

            // 状态转换逻辑矩阵
            switch (currentState) {
                case this.ScrollState.SCROLLING:
                    if (direction === 'up') {
                        // 向上滚动：从滚动状态转到暂停状态
                        this.transitionScrollState(this.ScrollState.PAUSED, {
                            reason: 'user_scroll_up',
                            direction: 'up'
                        });
                    }
                    // direction === 'down' 时保持滚动状态，无需转换
                    break;

                case this.ScrollState.PAUSED:
                    if (direction === 'down') {
                        // 向下滚动：从暂停状态恢复到滚动状态
                        this.transitionScrollState(this.ScrollState.SCROLLING, {
                            reason: 'user_scroll_down',
                            direction: 'down'
                        });
                    }
                    // direction === 'up' 时保持暂停状态，无需转换
                    break;

                case this.ScrollState.STOPPED:
                    // 停止状态下，任何用户滚动都不应该触发状态转换
                    console.log('当前状态为STOPPED，忽略用户滚动事件');
                    break;

                case this.ScrollState.ERROR:
                    // 错误状态下，尝试恢复到正常状态
                    console.log('当前状态为ERROR，尝试恢复');
                    this.transitionScrollState(this.ScrollState.STOPPED, {
                        reason: 'error_recovery',
                        direction: direction
                    });
                    break;

                default:
                    console.warn(`未知状态: ${currentState}`);
                    break;
            }
        },

        // 开始自动滚动（重构为单一状态源）
        startAutoScroll() {
            // 直接使用状态机状态作为唯一状态源
            if (this.currentScrollState === this.ScrollState.SCROLLING) {
                console.warn('自动滚动已在运行中');
                return;
            }

            try {
                const config = AppState.config;

                // 先进行状态转换
                const transitionSuccess = this.transitionScrollState(this.ScrollState.SCROLLING, {
                    reason: 'user_start'
                });

                if (!transitionSuccess) {
                    console.error('启动自动滚动失败：状态转换失败');
                    return;
                }

                // 状态转换成功后，同步更新AppState（作为备份状态）
                AppState.isTopicScrolling = true;
                console.log('自动滚动已启动');

                // 添加用户滚动事件监听
                this.bindUserScrollEvents();

                              // 使用优化的递归调度实现随机间隔滚动（防止内存泄漏）
                const scheduleNextScroll = (iterationCount = 0) => {
                    // 防止无限递归的安全措施
                    if (iterationCount > 10000) { // 限制最大迭代次数
                        console.warn('递归调度次数过多，停止自动滚动');
                        this.stopAutoScroll();
                        return;
                    }

                    // 使用状态机状态作为唯一判断标准
                    if (this.currentScrollState !== this.ScrollState.SCROLLING) {
                        console.log(`递归调度停止，当前状态: ${this.currentScrollState}`);
                        return;
                    }

                    const delay = this.getRandomDelay();
                    AppState.topicScrollTimer = setTimeout(() => {
                        // 再次检查状态机状态
                        if (this.currentScrollState === this.ScrollState.SCROLLING) {
                            try {
                                this.scrollStep();
                                scheduleNextScroll(iterationCount + 1); // 递归调度下一次滚动
                            } catch (error) {
                                console.error('滚动步骤执行失败:', error);
                                // 出错时停止自动滚动，防止无限错误循环
                                this.stopAutoScroll();
                            }
                        } else {
                            console.log(`setTimeout回调停止，当前状态: ${this.currentScrollState}`);
                        }
                    }, delay);
                };

                // 开始第一次滚动
                this.scrollStep();
                scheduleNextScroll();

                TabManager.showNotification('帖子自动滚动已启动');

            } catch (error) {
                console.error('启动自动滚动时发生错误:', error);
                // 确保状态一致性
                AppState.isTopicScrolling = false;
                this.currentScrollState = this.ScrollState.STOPPED;
            }
        },

        // 停止自动滚动（重构为单一状态源）
        stopAutoScroll() {
            // 直接使用状态机状态作为唯一状态源
            if (this.currentScrollState === this.ScrollState.STOPPED) {
                console.warn('自动滚动未在运行中');
                return;
            }

            try {
                // 先进行状态转换
                const transitionSuccess = this.transitionScrollState(this.ScrollState.STOPPED, {
                    reason: 'user_stop'
                });

                if (!transitionSuccess) {
                    console.error('停止自动滚动失败：状态转换失败');
                    return;
                }

                // 状态转换成功后，同步更新AppState
                AppState.isTopicScrolling = false;
                console.log('自动滚动已停止');

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

                // 重置其他状态
                this.lastScrollTop = 0;

                TabManager.showNotification('帖子自动滚动已停止');

            } catch (error) {
                console.error('停止自动滚动时发生错误:', error);
                // 强制确保状态一致性
                AppState.isTopicScrolling = false;
                this.currentScrollState = this.ScrollState.STOPPED;
                this.forceReset();
            }
        },

        // 滚动一步
        scrollStep() {
            const config = AppState.config;

            // 使用状态机状态作为唯一判断标准
            const currentState = this.currentScrollState;

            // 只有在SCROLLING状态才继续执行
            if (currentState !== this.ScrollState.SCROLLING) {
                console.log(`滚动步骤被跳过，当前状态: ${currentState}`);
                return;
            }

            // 更精确的底部检测
            const isAtBottom = this.isAtBottom();

            if (isAtBottom) {
                // 到达底部，先转换状态再停止滚动
                const transitionSuccess = this.transitionScrollState(this.ScrollState.STOPPED, {
                    reason: 'reached_bottom'
                });

                if (transitionSuccess) {
                    // 只有状态转换成功才更新AppState
                    AppState.isTopicScrolling = false;
                    if (AppState.topicScrollTimer) {
                        clearTimeout(AppState.topicScrollTimer);
                        AppState.topicScrollTimer = null;
                    }
                } else {
                    console.error('到底部停止失败：状态转换失败');
                    return;
                }

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

        // 绑定用户滚动事件监听（重构为统一事件处理）
        bindUserScrollEvents() {
            // 避免重复绑定（双重检查）
            if (this.userScrollBound) return;

            // 清理可能存在的旧绑定
            this.unbindUserScrollEvents();

            // 初始化当前滚动位置
            this.lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            this.lastProcessTime = 0; // 初始化事件处理时间戳

            try {
                // 统一的滚动事件处理器
                this.handleUnifiedScroll = (e) => this.onUnifiedScroll(e);

                // 只绑定scroll事件，wheel事件通过scroll事件统一处理
                window.addEventListener('scroll', this.handleUnifiedScroll, { passive: true });

                this.userScrollBound = true;
                console.log('滚动事件监听已绑定');
            } catch (error) {
                console.error('Linux.do助手: 滚动事件绑定失败', error);
                this.userScrollBound = false;
            }
        },

        // 移除用户滚动事件监听（重构为统一事件处理）
        unbindUserScrollEvents() {
            if (!this.userScrollBound) return;

            try {
                // 安全移除统一事件监听器
                if (this.handleUnifiedScroll) {
                    window.removeEventListener('scroll', this.handleUnifiedScroll);
                    this.handleUnifiedScroll = null;
                }

                this.userScrollBound = false;
                console.log('滚动事件监听已解绑');
            } catch (error) {
                console.error('Linux.do助手: 滚动事件解绑失败', error);
            }
        },

        // 已废弃：使用新的状态机方法 handleUserScrollEvent 替代
        // 保留此方法以防其他地方有引用
        handleScrollDirection(scrollDirection) {
            console.warn('handleScrollDirection 方法已废弃，请使用 handleUserScrollEvent');
            this.handleUserScrollEvent(scrollDirection);
        },

        // 统一的滚动事件处理器（防抖+节流）
        onUnifiedScroll(e) {
            const now = Date.now();

            // 节流处理：限制处理频率（50ms内只处理一次）
            if (this.lastProcessTime && (now - this.lastProcessTime < 50)) {
                return;
            }

            // 清理之前的防抖定时器
            if (this.scrollDebounceTimer) {
                clearTimeout(this.scrollDebounceTimer);
            }

            this.scrollDebounceTimer = setTimeout(() => {
                const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;

                // 检测滚动方向（设置最小阈值避免微小滚动）
                const scrollDelta = Math.abs(currentScrollTop - this.lastScrollTop);
                if (scrollDelta < 20) { // 提高阈值到20px，减少触发频率
                    return;
                }

                const scrollDirection = currentScrollTop > this.lastScrollTop ? 'down' : 'up';

                // 更新处理时间戳
                this.lastProcessTime = Date.now();

                // 使用状态机方法处理
                this.handleUserScrollEvent(scrollDirection);

                // 更新上次滚动位置
                this.lastScrollTop = currentScrollTop;

            }, 30); // 减少防抖时间到30ms，配合节流使用
        },

        // 节流的状态更新方法（优化版）
        updateTopicScrollStatusThrottled() {
            if (this.statusUpdateTimer) return;

            this.statusUpdateTimer = setTimeout(() => {
                if (typeof ControlPanel !== 'undefined' && ControlPanel.updateTopicScrollStatus) {
                    ControlPanel.updateTopicScrollStatus();
                }
                this.statusUpdateTimer = null;
            }, 50); // 减少到50ms，提高响应速度
        },

        // 获取当前状态的描述文本
        getStateDescription() {
            switch (this.currentScrollState) {
                case this.ScrollState.STOPPED:
                    return '已停止';
                case this.ScrollState.SCROLLING:
                    return '滚动中';
                case this.ScrollState.PAUSED:
                    return '已暂停';
                case this.ScrollState.ERROR:
                    return '错误状态';
                default:
                    return '未知状态';
            }
        },

        // 检查当前是否为暂停状态
        isPaused() {
            return this.currentScrollState === this.ScrollState.PAUSED;
        },

        // 检查当前是否为滚动状态
        isActive() {
            return this.currentScrollState === this.ScrollState.SCROLLING;
        },

        // 初始化状态机（修复状态依赖问题）
        initializeStateMachine() {
            try {
                // 清理所有可能存在的定时器
                this.clearAllTimers();

                // 重置所有状态变量
                this.lastScrollDirection = null;
                this.stateTransitionLocked = false;
                this.lastStateTransitionTime = Date.now();
                this.pendingTransition = null;
                this.stateHistory = [];
                this.lastProcessTime = 0;

                // 设置状态机初始状态 - 不依赖AppState状态
                this.currentScrollState = this.ScrollState.STOPPED;

                // 强制同步AppState状态（避免依赖问题）
                AppState.isTopicScrolling = false;
                if (AppState.topicScrollTimer) {
                    clearTimeout(AppState.topicScrollTimer);
                    AppState.topicScrollTimer = null;
                }

                // 记录初始化事件
                this.recordStateTransition('INIT', this.currentScrollState, {
                    reason: 'initialization',
                    note: '强制重置到STOPPED状态'
                });

                console.log('状态机初始化完成，当前状态:', this.currentScrollState);

            } catch (error) {
                console.error('状态机初始化失败:', error);
                // 最后的安全措施
                this.forceReset();
            }
        },

        // 清理所有定时器
        clearAllTimers() {
            if (this.transitionLockTimer) {
                clearTimeout(this.transitionLockTimer);
                this.transitionLockTimer = null;
            }
            if (this.scrollDebounceTimer) {
                clearTimeout(this.scrollDebounceTimer);
                this.scrollDebounceTimer = null;
            }
            if (this.statusUpdateTimer) {
                clearTimeout(this.statusUpdateTimer);
                this.statusUpdateTimer = null;
            }
        },

        // 重新启动滚动调度（用于从暂停状态恢复）
        restartScrolling() {
            try {
                console.log('重新启动滚动调度');

                // 确保没有旧的定时器残留
                if (AppState.topicScrollTimer) {
                    clearTimeout(AppState.topicScrollTimer);
                    AppState.topicScrollTimer = null;
                }

                // 使用与startAutoScroll相同的递归调度逻辑
                const scheduleNextScroll = (iterationCount = 0) => {
                    // 防止无限递归的安全措施
                    if (iterationCount > 10000) {
                        console.warn('递归调度次数过多，停止自动滚动');
                        this.stopAutoScroll();
                        return;
                    }

                    // 使用状态机状态作为唯一判断标准
                    if (this.currentScrollState !== this.ScrollState.SCROLLING) {
                        console.log(`重启调度停止，当前状态: ${this.currentScrollState}`);
                        return;
                    }

                    const delay = this.getRandomDelay();
                    AppState.topicScrollTimer = setTimeout(() => {
                        // 再次检查状态机状态
                        if (this.currentScrollState === this.ScrollState.SCROLLING) {
                            try {
                                this.scrollStep();
                                scheduleNextScroll(iterationCount + 1); // 递归调度下一次滚动
                            } catch (error) {
                                console.error('重启滚动步骤执行失败:', error);
                                this.stopAutoScroll();
                            }
                        } else {
                            console.log(`重启setTimeout回调停止，当前状态: ${this.currentScrollState}`);
                        }
                    }, delay);
                };

                // 立即执行一次滚动，然后开始递归调度
                this.scrollStep();
                scheduleNextScroll();

                console.log('滚动调度已重新启动');

            } catch (error) {
                console.error('重新启动滚动调度失败:', error);
                this.stopAutoScroll();
            }
        },

        // 调试方法：获取当前状态信息（开发时使用）
        getDebugInfo() {
            return {
                currentState: this.currentScrollState,
                lastDirection: this.lastScrollDirection,
                isLocked: this.stateTransitionLocked,
                timeSinceLastTransition: Date.now() - this.lastStateTransitionTime,
                isTopicScrolling: AppState.isTopicScrolling,
                hasPendingTransition: !!this.pendingTransition,
                stateHistoryCount: this.stateHistory.length,
                lastStateTransition: this.stateHistory[this.stateHistory.length - 1],
                stateConsistency: this.checkStateConsistency()
            };
        },

        // 检查状态一致性
        checkStateConsistency() {
            const issues = [];

            // 检查AppState和状态机的一致性
            if (AppState.isTopicScrolling && this.currentScrollState === this.ScrollState.STOPPED) {
                issues.push('AppState.isTopicScrolling为true但状态机为STOPPED');
            }

            if (!AppState.isTopicScrolling && this.currentScrollState !== this.ScrollState.STOPPED) {
                issues.push('AppState.isTopicScrolling为false但状态机不为STOPPED');
            }

            // 检查定时器状态一致性
            if (AppState.isTopicScrolling && !AppState.topicScrollTimer) {
                issues.push('AppState.isTopicScrolling为true但没有topicScrollTimer');
            }

            if (!AppState.isTopicScrolling && AppState.topicScrollTimer) {
                issues.push('AppState.isTopicScrolling为false但存在topicScrollTimer');
            }

            return {
                isConsistent: issues.length === 0,
                issues
            };
        },

        // 切换滚动状态
        toggleAutoScroll() {
            if (AppState.isTopicScrolling) {
                this.stopAutoScroll();
            } else {
                this.startAutoScroll();
            }
        },

        // 暂停/恢复自动滚动（快捷键专用）
        togglePause() {
            if (!AppState.isTopicScrolling) {
                // 如果未开始滚动，先开始滚动
                this.startAutoScroll();
                TabManager.showNotification('快捷键：开启自动滚动', 'info');
            } else if (this.currentScrollState === this.ScrollState.PAUSED) {
                // 如果已暂停，恢复滚动
                this.transitionScrollState(this.ScrollState.SCROLLING, {
                    reason: 'shortcut_resume',
                    direction: 'down'
                });
                TabManager.showNotification('快捷键：恢复自动滚动', 'info');
            } else if (this.currentScrollState === this.ScrollState.SCROLLING) {
                // 如果正在滚动，暂停
                this.transitionScrollState(this.ScrollState.PAUSED, {
                    reason: 'shortcut_pause',
                    direction: 'up'
                });
                TabManager.showNotification('快捷键：暂停自动滚动', 'info');
            }
        },

        // 回到顶部（快捷键专用）
        scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            TabManager.showNotification('快捷键：回到顶部', 'info');
        },

        // 滚动到底部（快捷键专用）
        scrollToBottom() {
            const scrollHeight = document.documentElement.scrollHeight;
            const clientHeight = document.documentElement.clientHeight;
            const targetY = scrollHeight - clientHeight;

            window.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });
            TabManager.showNotification('快捷键：滚动到底部', 'info');
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

    // ==================== 快捷键管理器 ====================
    const KeyboardManager = {
        // 快捷键配置
        shortcuts: {
            'toggleScroll': {
                key: 'e',
                ctrl: true,
                shift: true,
                description: '开启/关闭自动滚动',
                action: () => TopicScroller.toggleAutoScroll()
            },
            'pauseResume': {
                key: 's',
                ctrl: true,
                shift: true,
                description: '暂停/恢复自动滚动',
                action: () => TopicScroller.togglePause()
            },
            'scrollToTop': {
                key: 'r',
                ctrl: true,
                shift: true,
                description: '回到顶部',
                action: () => TopicScroller.scrollToTop()
            },
            'scrollToBottom': {
                key: 'b',
                ctrl: true,
                shift: true,
                description: '滚动到底部',
                action: () => TopicScroller.scrollToBottom()
            }
        },

        // 快捷键状态
        isEnabled: true,
        lastKeyTime: 0,
        keyPressCount: 0,

        // 初始化快捷键监听
        init() {
            document.addEventListener('keydown', (e) => this.handleKeyDown(e));
            console.log('快捷键管理器已初始化');
        },

        // 处理按键事件
        handleKeyDown(e) {
            if (!this.isEnabled) return;

            // 防止在输入框中触发快捷键
            const activeElement = document.activeElement;
            if (this.isInputElement(activeElement)) {
                return;
            }

            // 检查是否匹配快捷键
            for (const [name, config] of Object.entries(this.shortcuts)) {
                if (this.matchesShortcut(e, config)) {
                    e.preventDefault();
                    e.stopPropagation();

                    // 防止快速重复触发
                    const now = Date.now();
                    if (now - this.lastKeyTime < 200) return;
                    this.lastKeyTime = now;

                    // 执行动作
                    config.action();

                    // 显示反馈
                    this.showFeedback(config.description);
                    return;
                }
            }
        },

        // 检查是否为输入元素
        isInputElement(element) {
            const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
            const inputTypes = ['text', 'password', 'email', 'search', 'url'];

            return inputTags.includes(element.tagName) ||
                   (element.tagName === 'INPUT' && inputTypes.includes(element.type)) ||
                   element.contentEditable === 'true';
        },

        // 检查是否匹配快捷键
        matchesShortcut(e, config) {
            return e.key.toLowerCase() === config.key &&
                   e.ctrlKey === !!config.ctrl &&
                   e.shiftKey === !!config.shift &&
                   e.altKey === !!config.alt &&
                   e.metaKey === !!config.meta;
        },

        // 显示快捷键反馈
        showFeedback(action) {
            TabManager.showNotification(`快捷键：${action}`, 'info');
        },

        // 启用/禁用快捷键
        setEnabled(enabled) {
            this.isEnabled = enabled;
            console.log(`快捷键已${enabled ? '启用' : '禁用'}`);
        },

        // 获取快捷键列表
        getShortcutList() {
            return Object.entries(this.shortcuts).map(([name, config]) => {
                const keys = [];
                if (config.ctrl) keys.push('Ctrl');
                if (config.shift) keys.push('Shift');
                if (config.alt) keys.push('Alt');
                keys.push(config.key.toUpperCase());

                return {
                    keys: keys.join(' + '),
                    description: config.description
                };
            });
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

                        <div class="linux-do-helper-form-group">
                            <label class="linux-do-helper-label">⌨️ 快捷键：</label>
                            <div style="font-size: 11px; color: #666; line-height: 1.6;">
                                <div>• <strong>Ctrl+Shift+E</strong>：开启/关闭自动滚动</div>
                                <div>• <strong>Ctrl+Shift+S</strong>：暂停/恢复自动滚动</div>
                                <div>• <strong>Ctrl+Shift+R</strong>：回到顶部</div>
                                <div>• <strong>Ctrl+Shift+B</strong>：滚动到底部</div>
                            </div>
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

                // 初始化状态机
                TopicScroller.initializeStateMachine();

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

            // 直接使用状态机获取当前状态描述
            const scrollStatusText = TopicScroller.getStateDescription();

            const scrollStatusDiv = statusDiv.querySelector('div:nth-child(5)');
            if (scrollStatusDiv) {
                scrollStatusDiv.textContent = `🔄 滚动状态：${scrollStatusText}`;
            }

            // 更新用户滚动状态显示 - 基于新状态机
            const userScrollStatusDiv = statusDiv.querySelector('div:nth-child(6)');
            if (userScrollStatusDiv) {
                let pauseStatus = '未检测';
                if (AppState.isTopicScrolling) {
                    if (TopicScroller.isPaused()) {
                        pauseStatus = '用户暂停⏸️';
                    } else if (TopicScroller.isActive()) {
                        pauseStatus = '自动滚动中📜';
                    }
                }
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

            // 初始化快捷键管理器
            KeyboardManager.init();

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