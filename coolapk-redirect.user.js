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

    let search = window.location.search;
    if (!search) return;

    try {
        search = decodeURIComponent(search);
    } catch (e) {
        return;
    }

    if (!search.startsWith('?url=')) return;
    search = search.slice(5);

    let url = search.trim();
    if (!url) return;

    if (!/^http/i.test(url)) {
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