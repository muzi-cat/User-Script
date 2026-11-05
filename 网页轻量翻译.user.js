// ==UserScript==
// @name         网页轻量翻译
// @description  页面左上角下滑开启翻译功能，只支持仅译文，引擎仅微软翻译
// @namespace    https://www.microsoft.com/
// @version      1.0
// @author       DeepSeek
// @match        *://*/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.registerMenuCommand
// @connect      edge.microsoft.com
// @license      MIT
// @run-at       document-start
// ==/UserScript==

'use strict';

const frmMs = 3;
const batSz = 50;
const slLen = 600;

const tags = new Set([
    'script', 'style', 'noscript',
    'code', 'pre', 'textarea', 'svg', 'canvas',
    'head', 'title', 'audio', 'video', 'object',
    'kbd', 'samp', 'var', 'math', 'iframe',
    'picture', 'slot', 'map', 'colgroup'
]);

const blkSel = [...tags].join(',');

const aUrl = 'https://edge.microsoft.com/translate/translatetext' +
               '?from=&to=zh-Hans&isEnterpriseClient=false';

const hdrs = {
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'sec-ch-ua': '"Microsoft Edge";v="131", "Not:A-Brand";v="8", "Chromium";v="131"',
    'sec-mesh-client-os': 'Android',
    'sec-mesh-client-edge-channel': 'stable',
    'sec-mesh-client-edge-version': '131.0.0.0',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 EdgA/131.0.0.0',
};

function cmpQ(queue, head) {
    if (head <= 1000) return head;
    if (head < queue.length) {
        queue.splice(0, head);
        return 0;
    }
    queue.length = 0;
    return 0;
}

function drnQ(queue, head, hdlr, rel) {
    const stTm = performance.now();
    while (head < queue.length) {
        const item = queue[head++];
        try {
            hdlr(item);
        } catch (error) {
            if (rel) rel(item);
        }
        if (performance.now() - stTm >= frmMs) break;
    }
    return cmpQ(queue, head);
}

const pendN = new WeakSet();

const wkMap = new WeakMap();

const toast = (() => {
    const fdMs = 500;
    const hdMs = 1000;

    let host = null;
    let inner = null;
    let msgNd = null;
    let timer = null;

    const hostCss = [
        ['all', 'initial'],
        ['display', 'block'],
        ['position', 'fixed'],
        ['left', '5px'],
        ['bottom', '8px'],
        ['z-index', '999999999'],
        ['pointer-events', 'none'],
        ['max-width', '50vw'],
    ];

    const boxCss = [
        ['all', 'initial'],
        ['display', 'block'],
        ['box-sizing', 'border-box'],
        ['pointer-events', 'none'],
        ['max-width', '100%'],
        ['padding', '6px 12px'],
        ['background', 'rgba(0, 0, 0, 0.8)'],
        ['color', '#fff'],
        ['border-radius', '999px'],
        ['font-size', '12px'],
        ['font-weight', '500'],
        ['font-family', 'system-ui'],
        ['line-height', 'normal'],
        ['white-space', 'nowrap'],
        ['overflow', 'hidden'],
        ['text-overflow', 'ellipsis'],
    ];

    function setCss(el, decls) {
        for (const [prop, val] of decls) {
            el.style.setProperty(prop, val, 'important');
        }
    }

    function ensEl() {
        if (host && host.isConnected) return true;

        const docEl = document.documentElement;
        if (!docEl) return false;

        host = document.createElement('div');
        setCss(host, hostCss);

        const root = host.attachShadow({ mode: 'closed' });

        inner = document.createElement('div');
        setCss(inner, boxCss);

        msgNd = document.createTextNode('');
        inner.append(msgNd);

        root.append(inner);
        docEl.append(host);
        return true;
    }

    function show(msg) {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        if (!ensEl()) return;

        inner.style.setProperty('transition', 'none', 'important');
        inner.style.setProperty('opacity', '0', 'important');
        msgNd.nodeValue = msg;
        void inner.offsetWidth;
        inner.style.setProperty('transition', `opacity ${fdMs}ms ease`, 'important');
        inner.style.setProperty('opacity', '1', 'important');

        timer = setTimeout(() => {
            inner.style.setProperty('opacity', '0', 'important');
            timer = null;
        }, fdMs + hdMs);
    }

    return { show };
})();

const cache = (() => {
    const dbNm = 'web-light-trans';
    const dbVer = 1;
    const stNm = 'trans';

    const limit = 5000;
    const flMs = 500;

    const trMap = new Map();
    const dtySt = new Set();
    let flTmr = null;
    let dbPrm = null;
    let initP = null;

    function opDb() {
        if (dbPrm) return dbPrm;

        dbPrm = new Promise((rsv, rjt) => {
            const rqst = indexedDB.open(dbNm, dbVer);

            rqst.onupgradeneeded = () => {
                const idb = rqst.result;
                if (!idb.objectStoreNames.contains(stNm)) {
                    idb.createObjectStore(stNm, { keyPath: 'sourc' });
                }
            };

            rqst.onsuccess = () => {
                const idb = rqst.result;
                idb.onversionchange = () => {
                    try {
                        idb.close();
                    } catch (error) {
                    }
                    dbPrm = null;
                };
                rsv(idb);
            };
            rqst.onerror = () => rjt(rqst.error);
            rqst.onblocked = () => rjt(new Error('IDB_BLOCKED'));
        }).catch((error) => {
            dbPrm = null;
            throw error;
        });

        return dbPrm;
    }

    function flush() {
        if (flTmr) {
            clearTimeout(flTmr);
            flTmr = null;
        }
        if (!dtySt.size) return;

        const srcs = [...dtySt];
        dtySt.clear();

        const rows = [];
        for (const src of srcs) {
            const entry = trMap.get(src);
            if (!entry) continue;
            rows.push({
                sourc: src,
                dest: entry.dest,
                tms: entry.tms,
            });
        }
        if (!rows.length) return;

        const rqRow = () => {
            for (const row of rows) dtySt.add(row.sourc);
        };

        opDb().then((idb) => {
            const trx = idb.transaction(stNm, 'readwrite');
            const store = trx.objectStore(stNm);
            for (const row of rows) store.put(row);
            trx.onabort = rqRow;
        }).catch(rqRow);
    }

    function mkDty(src) {
        dtySt.add(src);
        if (flTmr) return;
        flTmr = setTimeout(flush, flMs);
    }

    function delDb(srcs) {
        if (!srcs.length) return;
        opDb().then((idb) => {
            const trx = idb.transaction(stNm, 'readwrite');
            const store = trx.objectStore(stNm);
            for (const src of srcs) store.delete(src);
        }).catch(() => {});
    }

    let trmSc = false;

    function schTr() {
        if (trmSc || trMap.size < limit) return;
        trmSc = true;
        const rnTrm = () => {
            trmSc = false;
            trim();
        };
        requestIdleCallback(rnTrm, { timeout: 1500 });
    }

    function trim() {
        if (trMap.size < limit) return;
        const evCnt = Math.floor(trMap.size / 2);
        const srtEt = [...trMap.entries()]
            .sort((entA, entB) => entA[1].tms - entB[1].tms);
        const vics = srtEt.slice(0, evCnt).map((entry) => entry[0]);
        for (const src of vics) {
            trMap.delete(src);
            dtySt.delete(src);
        }
        delDb(vics);
    }

    function init() {
        if (initP) return initP;
        initP = (async () => {
            try {
                const idb = await opDb();

                const rows = await new Promise((rsv, rjt) => {
                    const trx = idb.transaction(stNm, 'readonly');
                    const rqst = trx.objectStore(stNm).getAll();

                    rqst.onsuccess = () => rsv(rqst.result || []);
                    rqst.onerror = () => rjt(rqst.error);
                    trx.onerror = () => rjt(trx.error);
                });

                for (const row of rows) {
                    if (!row || typeof row.dest !== 'string') continue;
                    trMap.set(row.sourc, {
                        dest: row.dest,
                        tms: row.tms,
                    });
                }

                schTr();
            } catch (error) {
            }
        })();
        return initP;
    }

    function get(src) {
        if (typeof src !== 'string' || !src) return '';
        const entry = trMap.get(src);
        if (!entry) return '';
        return entry.dest;
    }

    function set(src, dest) {
        if (typeof src !== 'string' || !src) return;
        if (typeof dest !== 'string' || !dest) return;

        trMap.set(src, { dest, tms: Date.now() });
        mkDty(src);
        schTr();
    }

    return { init, get, set };
})();

function trBat(texts) {
    const { promise: prm, resolve: rsv, reject: rjt } = Promise.withResolvers();
    GM.xmlHttpRequest({
        method: 'POST',
        url: aUrl,
        headers: hdrs,
        data: JSON.stringify(texts),
        timeout: 10000,
        onload: (resp) => {
            if (resp.status !== 200) {
                rjt({ code: 'HTTP' });
                return;
            }
            let data;
            try {
                data = JSON.parse(resp.responseText);
            } catch (error) {
                rjt({ code: 'PARSE' });
                return;
            }

            if (!Array.isArray(data)) {
                rjt({ code: 'PARSE' });
                return;
            }

            const outs = new Array(texts.length);
            for (let index = 0; index < texts.length; index++) {
                outs[index] = data[index]?.translations?.[0]?.text ?? '';
            }
            rsv(outs);
        },
        onerror: () => rjt({ code: 'NET' }),
        ontimeout: () => rjt({ code: 'TMO' }),
    });
    return prm;
}

function inBlk(elm) {
    return elm.isContentEditable || elm.closest(blkSel) !== null;
}

const pipe = (() => {
    const rdSt = { queue: [], head: 0 };
    const wrSt = { queue: [], head: 0 };

    const inFlt = new Set();
    const ndQue = [];

    let ndHd = 0;
    let run = false;
    let busy = false;
    let phase = 'read';

    const msgs = {
        PARSE: '解析失败',
        HTTP: '请求失败',
        NET: '网络错误',
        TMO: '请求超时',
    };

    function tryQ(node, known) {
        if (pendN.has(node)) return;
        pendN.add(node);
        ndQue.push({ node, known });
    }

    const ndFlt = {
        acceptNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                return NodeFilter.FILTER_ACCEPT;
            }
            if (tags.has(node.localName) || node.isContentEditable) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_SKIP;
        },
    };

    function proc(root) {
        if (!root) return;

        const qLen = ndQue.length;

        if (root.nodeType === Node.TEXT_NODE) {
            tryQ(root, false);
        } else if (root.nodeType === Node.ELEMENT_NODE) {
            if (!inBlk(root)) {
                const walker = document.createTreeWalker(
                    root,
                    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
                    ndFlt
                );

                let node = walker.nextNode();
                while (node) {
                    tryQ(node, true);
                    node = walker.nextNode();
                }
            }
        } else {
            return;
        }

        if (ndQue.length !== qLen) plan();
    }

    function hdNd(item) {
        const node = item.node;

        if (!node.isConnected) {
            pendN.delete(node);
            return;
        }

        const raw = node.nodeValue;
        const text = raw.trim();

        if (text.length < 2) {
            pendN.delete(node);
            return;
        }

        const trTxt = wkMap.get(node);
        if (trTxt !== undefined && text === trTxt) {
            pendN.delete(node);
            return;
        }

        if (!item.known) {
            const parEl = node.parentElement;
            if (!parEl || inBlk(parEl)) {
                pendN.delete(node);
                return;
            }
        }

        const cchTr = cache.get(text);
        if (cchTr) {
            wrSt.queue.push({
                node,
                trTxt: cchTr,
                orgTx: text,
                raw,
                cchHi: true,
            });
            return;
        }

        rdSt.queue.push({
            node,
            raw,
            text,
            wgt: Math.max(1, Math.ceil(text.length / slLen)),
        });
    }

    function relNd(item) {
        pendN.delete(item.node);
    }

    function drnRd() {
        ndHd = drnQ(ndQue, ndHd, hdNd, relNd);
        if (rdSt.head < rdSt.queue.length) wake();
    }

    function hasR() {
        return ndHd < ndQue.length;
    }

    function apTr(node, mngT, orgTx, snap) {
        if (node.nodeValue !== snap) return null;

        if (mngT === orgTx) return false;

        const lead = snap.indexOf(orgTx);
        const tail = snap.length - lead - orgTx.length;

        node.nodeValue =
            snap.slice(0, lead) +
            mngT +
            snap.slice(snap.length - tail);

        return true;
    }

    function hdIt(item) {
        const node = item.node;

        pendN.delete(node);

        if (!node.isConnected) return;
        if (item.abrt) return;

        const mngT = item.trTxt.trim();

        const wrote = apTr(node, mngT, item.orgTx, item.raw);

        if (wrote === null) {
            proc(node);
            return;
        }

        wkMap.set(node, mngT);
        if (wrote && !item.cchHi) {
            cache.set(item.orgTx, mngT);
        }
    }

    function drnWr() {
        wrSt.head = drnQ(wrSt.queue, wrSt.head, hdIt);
    }

    function hasW() {
        return wrSt.head < wrSt.queue.length;
    }

    function plan(src) {
        if (busy) return;
        phase = src === 'write' ? 'write' : 'read';
        busy = true;
        requestAnimationFrame(tick);
    }

    function tick() {
        if (phase === 'read') {
            drnRd();
            if (hasW()) phase = 'write';
        } else {
            drnWr();
            if (hasR()) phase = 'read';
        }

        if (hasR() || hasW()) {
            requestAnimationFrame(tick);
        } else {
            busy = false;
            phase = 'read';
        }
    }

    function abTsk(task) {
        wrSt.queue.push({ node: task.node, abrt: true });
        plan('write');
    }

    function dec(trLs, batch) {
        const out = [];

        for (let idx = 0; idx < batch.length; idx++) {
            const task = batch[idx];
            const trTxt = trLs[idx];

            if (String(trTxt).trim() === '') {
                out.push({ node: task.node, abrt: true });
                continue;
            }

            out.push({
                node: task.node,
                trTxt,
                orgTx: task.text,
                raw: task.raw,
            });
        }

        return out;
    }

    function nxtBt(queue, head, maxU) {
        const batch = [];
        let units = 0;

        while (head < queue.length) {
            const task = queue[head];

            if (batch.length > 0 && units + task.wgt > maxU) break;

            batch.push(task);
            units += task.wgt;
            head++;

            if (units >= maxU) break;
        }

        return { batch, head };
    }

    function wake() {
        if (run) return;
        run = true;
        cons();
    }

    async function cons() {
        while (true) {
            rdSt.head = cmpQ(rdSt.queue, rdSt.head);

            while (inFlt.size >= 5) {
                await Promise.race(inFlt);
            }

            const next = nxtBt(rdSt.queue, rdSt.head, batSz);
            rdSt.head = next.head;
            const batch = next.batch;

            if (batch.length === 0) {
                if (inFlt.size === 0) {
                    run = false;
                    return;
                }
                await Promise.race(inFlt);
                continue;
            }

            const prm = doChk(batch)
                .finally(() => inFlt.delete(prm));

            inFlt.add(prm);
        }
    }

    async function doChk(batch) {
        const body = batch.map((task) => task.text);

        let trLs;
        try {
            trLs = await trBat(body);
        } catch (error) {
            toast.show(msgs[error?.code] || '未知错误');
            for (const task of batch) abTsk(task);
            return;
        }

        for (const rslt of dec(trLs, batch)) {
            wrSt.queue.push(rslt);
        }
        plan('write');
    }

    return { proc };
})();

const obsv = (() => {
    function start() {
        const obs = new MutationObserver((muts) => {
            const addSt = new Set();

            for (let mIdx = 0; mIdx < muts.length; mIdx++) {
                const mut = muts[mIdx];
                if (mut.type === 'characterData') {
                    const tgtNd = mut.target;
                    if (tgtNd && tgtNd.nodeType === Node.TEXT_NODE) {
                        pipe.proc(tgtNd);
                    }
                    continue;
                }
                const nodes = mut.addedNodes;
                for (let ndIdx = 0; ndIdx < nodes.length; ndIdx++) {
                    const addNd = nodes[ndIdx];
                    if (addNd.nodeType === Node.TEXT_NODE ||
                        addNd.nodeType === Node.ELEMENT_NODE) {
                        addSt.add(addNd);
                    }
                }
            }

            for (const addNd of addSt) {
                const parNd = addNd.parentNode;
                if (parNd && addSt.has(parNd)) continue;
                pipe.proc(addNd);
            }
        });
        obs.observe(document, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    return { start };
})();

const gest = (() => {
    const zWid = 150;
    const zHgt = 50;
    const minD = 30;

    let actv = false;
    let stX = 0;
    let stY = 0;

    function setup() {
        document.addEventListener('touchstart', tStr, { passive: true, capture: true });
        document.addEventListener('touchmove', tMov, { passive: false, capture: true });
        document.addEventListener('touchend', tEnd, { passive: true, capture: true });
        document.addEventListener('touchcancel', (event) => {
            if (event.isTrusted) reset();
        }, { passive: true, capture: true });
    }

    function tStr(event) {
        if (!event.isTrusted) return;
        reset();
        if (event.touches.length !== 1) return;
        const touch = event.touches[0];
        if (touch.clientX <= zWid && touch.clientY <= zHgt) {
            actv = true;
            stX = touch.clientX;
            stY = touch.clientY;
        }
    }

    function tMov(event) {
        if (!event.isTrusted) return;
        if (!actv) return;
        event.preventDefault();
    }

    function tEnd(event) {
        if (!event.isTrusted) return;
        if (!actv) return;
        const touch = event.changedTouches[0];
        if (!touch) {
            reset();
            return;
        }
        const dlX = touch.clientX - stX;
        const dlY = touch.clientY - stY;
        reset();
        if (dlY < minD) return;
        if (dlY < Math.abs(dlX) * 2) return;
        trCtl.trPge();
    }

    function reset() {
        actv = false;
    }

    return { setup };
})();

const akey = 'enabl-auto-trans';

async function getHs() {
    try {
        const rval = await GM.getValue(akey, '[]');
        const harr = JSON.parse(rval);
        return new Set(Array.isArray(harr) ? harr : []);
    } catch (error) {
        return new Set();
    }
}

async function tgl(host, hset) {
    if (hset.has(host)) hset.delete(host);
    else hset.add(host);

    try {
        await GM.setValue(akey, JSON.stringify([...hset]));
    } catch (error) {
    }
}

const trCtl = (() => {
    let begun = false;

    async function trPge() {
        if (begun) return;

        begun = true;

        await cache.init();

        toast.show('正在翻译...');

        obsv.start();

        pipe.proc(document.documentElement);
    }

    async function start() {
        if (window.top !== window.self) return;

        gest.setup();

        const host = location.hostname;
        const hset = await getHs();
        const auto = hset.has(host);
        if (auto) trPge();

        GM.registerMenuCommand(
            auto ? '关闭自动翻译' : '启用自动翻译',
            async () => {
                await tgl(host, hset);
                location.replace(location.href);
            }
        );

        GM.registerMenuCommand('翻译当前页面', () => {
            trPge();
        });
    }

    return { start, trPge };
})();

trCtl.start();