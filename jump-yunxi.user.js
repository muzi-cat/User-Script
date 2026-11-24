// ==UserScript==
// @name         jump yunxi
// @description  none
// @namespace    https://www.tampermonkey.net/
// @version      1.0
// @author       DeepSeek
// @match        https://drive.uc.cn/s/*
// @match        https://pan.quark.cn/s/*
// @match        https://pan.xunlei.com/s/*
// @match        https://yun.139.com/share*/*
// @match        https://www.guangyapan.com/s/*
// @include      https://*share.123pan.*/123pan/*
// @license      MIT
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    function decd(str) {
        try {
            return decodeURIComponent(str);
        } catch (err) {
            return str;
        }
    }

    function gurl() {
        const { hostname: host, href: link } = window.location;
        const durl = decd(link);

        if (/Android.*Mobile Safari/.test(navigator.userAgent) && host === 'yun.139.com') {
            const query = durl.split('?')[1];
            if (!query) return null;
            return 'https://yun.139.com/shareweb/#/w/i/' + query;
        }

        return durl;
    }

    function jump() {
        const url = gurl();
        if (!url) return;

        const dest = 'yunx://resolve?url=' + url;
        window.location.replace(dest);
    }

    function clk(e) {
        if (!e.isTrusted) return;
        jump();
    }

    document.addEventListener('click', clk, true);

    jump();
})();