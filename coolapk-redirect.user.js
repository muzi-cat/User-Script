// ==UserScript==
// @name         酷安重定向
// @description  在酷安官方安全提示页面中时自动跳转目标链接
// @namespace    https://www.tampermonkey.net/
// @version      1.0
// @author       DeepSeek
// @match        https://www.coolapk.com/link?url=*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    let url = window.location.search;

    try {
        url = decodeURIComponent(url);
    } catch (e) {
        return;
    }

    if (!url.startsWith('?url=')) return;
    url = url.slice(5);

    if (!url) return;

    if (!/^https?:\/\//i.test(url)) {
        url = 'http://' + url;
    }

    let meta = document.querySelector('meta[name="referrer"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'referrer';
        document.head?.append(meta);
    }
    meta.content = 'no-referrer';

    window.location.replace(url);
})();