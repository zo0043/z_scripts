// ==UserScript==
// @name         夸克网盘 - 文件夹名称快捷复制
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  为夸克网盘添加文件夹名称快捷复制按钮
// @author       YourName
// @match        https://pan.quark.cn/*
// @match        https://pan.quark.cn
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('夸克网盘助手脚本启动 v2.0');

    // 复制到剪贴板
    function copyText(text) {
        console.log('复制文件名:', text);
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showMessage('已复制: ' + text.substring(0, 20) + (text.length > 20 ? '...' : ''));
            }).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    // 降级复制
    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showMessage('已复制: ' + text.substring(0, 20) + (text.length > 20 ? '...' : ''));
        } catch (e) {
            showMessage('复制失败');
        }
        document.body.removeChild(ta);
    }

    // 显示消息
    function showMessage(msg) {
        const div = document.createElement('div');
        div.textContent = msg;
        div.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: #333; color: white; padding: 10px 15px;
            border-radius: 4px; z-index: 99999; font-size: 13px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2000);
    }

    // 创建复制按钮
    function createButton(name) {
        const btn = document.createElement('span');
        btn.textContent = ' 📋';
        btn.title = '复制文件名';
        btn.className = 'copy-btn';
        btn.style.cssText = `
            color: #1890ff;
            cursor: pointer;
            font-size: 14px;
            margin-left: 6px;
            padding: 2px 6px;
            border-radius: 3px;
            transition: all 0.2s;
            background: rgba(24, 144, 255, 0.1);
        `;
        btn.addEventListener('mouseenter', () => {
            btn.style.background = 'rgba(24, 144, 255, 0.2)';
            btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'rgba(24, 144, 255, 0.1)';
            btn.style.transform = 'scale(1)';
        });
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyText(name);
        });
        return btn;
    }

    // 添加复制按钮
    function addButtons() {
        console.log('查找文件名元素...');

        const els = document.querySelectorAll('.filename-text.editable-cell.editable-cell-allow');
        console.log(`找到 ${els.length} 个文件名元素`);

        let added = 0;
        els.forEach(el => {
            if (el.querySelector('.copy-btn')) {
                console.log('已存在按钮，跳过:', el.textContent.trim());
                return;
            }

            const name = el.textContent.trim();
            if (name) {
                console.log('添加按钮到:', name);
                const btn = createButton(name);
                el.appendChild(btn);
                added++;
            }
        });

        console.log(`夸克网盘助手: 共添加 ${added} 个复制按钮`);
        return added;
    }

    // 清理按钮
    function cleanup() {
        const btns = document.querySelectorAll('.copy-btn');
        btns.forEach(b => b.remove());
        console.log(`清理了 ${btns.length} 个按钮`);
    }

    // 初始化
    function init() {
        console.log('初始化夸克网盘助手...');

        // 清理旧按钮
        cleanup();

        // 延迟添加按钮
        setTimeout(() => {
            const count = addButtons();

            // 如果没找到元素，尝试备用方案
            if (count === 0) {
                console.log('尝试备用方案...');
                const backupEls = document.querySelectorAll('[class*="filename"], [class*="name"]');
                console.log(`备用方案找到 ${backupEls.length} 个可能元素`);

                backupEls.forEach(el => {
                    if (!el.querySelector('.copy-btn')) {
                        const name = el.textContent.trim();
                        if (name && name.length < 50 && !name.match(/^\d{1,2}:\d{2}/)) {
                            const btn = createButton(name);
                            el.appendChild(btn);
                        }
                    }
                });
            }
        }, 1000);

        // 监听页面变化
        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            mutations.forEach(m => {
                if (m.type === 'childList' && m.addedNodes.length > 0) {
                    shouldCheck = true;
                }
            });
            if (shouldCheck) {
                clearTimeout(window.quarkTimer);
                window.quarkTimer = setTimeout(addButtons, 800);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        console.log('DOM 监听已启动');
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();