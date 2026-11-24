// ==UserScript==
// @name         jump yunxi
// @description  none
// @namespace    https://cn.com.net/
// @version      1.0
// @author       DeepSeek
// @match        https://pan.quark.cn/s/*
// @match        https://drive.uc.cn/s/*
// @match        https://pan.xunlei.com/s/*
// @match        https://yun.139.com/share*/*
// @include      https://*share.123pan.*/123pan/*
// @match        https://www.guangyapan.com/s/*
// @match        https://*.lanosso.com/*
// @match        https://*.lanzn.com/*
// @match        https://*.lanzog.com/*
// @match        https://*.lanpw.com/*
// @match        https://*.lanpv.com/*
// @match        https://*.lanzv.com/*
// @match        https://*.lanzouu.com/*
// @include      https://*.lanz*.com/*
// @include      https://lanz*.com/*
// @license      MIT
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const scheme = 'yunx://resolve?url=';

    function getShareUrl() {
        const { hostname, href } = window.location;

        if (/Android.*Mobile Safari/.test(navigator.userAgent) && hostname === 'yun.139.com') {
            const query = href.split('?')[1];
            if (!query) return null;
            return 'https://yun.139.com/shareweb/#/w/i/' + query;
        }

        return href;
    }

    function doJump() {
        const url = getShareUrl();
        if (!url) return;

        const target = scheme + encodeURIComponent(url);
        window.location.replace(target);
    }

    function onClick(e) {
        if (!e.isTrusted) return;
        doJump();
    }

    document.addEventListener('click', onClick, true);

    doJump();
})();