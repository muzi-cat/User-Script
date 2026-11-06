// ==UserScript==
// @name         自动刷新网页
// @description  开启后定时的自动重新访问当前网页
// @namespace    https://www.tampermonkey.net/
// @version      1.0
// @author       DeepSeek
// @match        *://*/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.registerMenuCommand
// @license      MIT
// @run-at       document-end
// ==/UserScript==

'use strict';

const setstyles = (el, styles) => {
    for (const [property, value] of Object.entries(styles)) {
        el.style.setProperty(property, String(value), 'important');
    }
};

const resetstyles = {
    'box-sizing': 'border-box',
    'margin': '0',
    'padding': '0',
    'border': '0',
    'font-family': 'inherit',
    'font-size': 'inherit',
    'font-weight': 'inherit',
    'line-height': 'inherit',
    'color': 'inherit',
    'background': 'transparent',
    'list-style': 'none',
};

const applyreset = (el) => setstyles(el, resetstyles);

const createstyledelement = (tag, styles = null) => {
    const el = document.createElement(tag);
    applyreset(el);
    if (styles) setstyles(el, styles);
    return el;
};

const buttonbasestyles = {
    'display': 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'padding': '5px 10px',
    'border-radius': '999px',
    'background-color': '#2563eb',
    'color': '#ffffff',
    'cursor': 'pointer',
    'white-space': 'nowrap',
    'line-height': '1.3',
    'opacity': '0.7',
    'pointer-events': 'auto',
};

const createbutton = (text, extrastyles = null) => {
    const btn = document.createElement('button');
    applyreset(btn);
    setstyles(btn, buttonbasestyles);
    if (extrastyles) setstyles(btn, extrastyles);
    btn.textContent = text;
    return btn;
};

const hoststyles = {
    'all': 'initial',
    'position': 'fixed',
    'inset': '0',
    'z-index': '999999999',
    'pointer-events': 'none',
    'font-family': 'system-ui',
    'font-size': '14px',
    'font-weight': '500',
    'line-height': '1.3',
    'color': '#0f172a',
    '-webkit-text-size-adjust': '100%',
    '-webkit-tap-highlight-color': 'transparent',
};

const stackstyles = {
    'position': 'fixed',
    'top': '5px',
    'right': '5px',
    'z-index': '1',
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-end',
    'gap': '15px',
    'pointer-events': 'none',
};

const countdownstyles = {
    'background-color': '#2563eb',
    'color': '#ffffff',
    'padding': '6px 12px',
    'border-radius': '999px',
    'white-space': 'nowrap',
    'pointer-events': 'none',
    'opacity': '0.7',
};

const panelstyles = {
    'position': 'fixed',
    'top': '50%',
    'left': '50%',
    'transform': 'translate(-50%, -50%)',
    'width': '80vw',
    'height': '50vh',
    'background-color': '#ffffff',
    'border-radius': '16px',
    'border': '1px solid #e2e8f0',
    'z-index': '2',
    'padding': '20px 24px',
    'display': 'flex',
    'flex-direction': 'column',
    'pointer-events': 'auto',
};

const titlestyles = {
    'margin': '0 0 10px 0',
    'font-size': '24px',
    'font-weight': '500',
    'color': '#0f172a',
    'text-align': 'center',
    'flex-shrink': '0',
};

const middlestyles = {
    'flex': '1',
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'center',
    'width': '100%',
    'min-height': '0',
    'overflow': 'auto',
};

const gridstyles = {
    'display': 'grid',
    'grid-template-columns': 'repeat(3, 1fr)',
    'gap': '10px',
    'width': '100%',
    'max-width': '600px',
    'margin': 'auto 0',
};

const timebtnbasestyles = {
    'width': '100%',
    'min-width': '0',
    'height': 'min(46px, 12vh)',
    'padding': '0 6px',
    'border-radius': '10px',
    'border': '1px solid #e2e8f0',
    'background-color': '#f8fafc',
    'color': '#1e293b',
    'cursor': 'pointer',
    'text-align': 'center',
    'white-space': 'nowrap',
    'opacity': '1',
};

const timebtnselectedstyles = {
    'background-color': '#2563eb',
    'border-color': '#2563eb',
    'color': '#ffffff',
};

const timebtnunselectedstyles = {
    'background-color': '#f8fafc',
    'border-color': '#e2e8f0',
    'color': '#1e293b',
};

const footerstyes = {
    'display': 'flex',
    'justify-content': 'center',
    'gap': '14px',
    'margin-top': '14px',
    'flex-shrink': '0',
};

const cancelbtnstyles = {
    'padding': '8px 32px',
    'border-radius': '30px',
    'border': '1px solid #cbd5e1',
    'background-color': '#ffffff',
    'color': '#334155',
    'cursor': 'pointer',
    'white-space': 'nowrap',
    'opacity': '1',
};

const confirmbtnstyles = {
    'padding': '8px 32px',
    'border-radius': '30px',
    'border': 'none',
    'background-color': '#2563eb',
    'color': '#ffffff',
    'cursor': 'pointer',
    'white-space': 'nowrap',
    'opacity': '1',
};

const shadow = (() => {
    let host = null;
    let root = null;

    const init = () => {
        if (host) return root;

        host = document.createElement('div');
        host.id = 'auto-refresh-shadow-host';
        setstyles(host, hoststyles);
        document.body.append(host);

        root = host.attachShadow({ mode: 'closed' });
        return root;
    };

    const get = () => root || init();

    const destroy = () => {
        if (host) host.remove();
        host = null;
        root = null;
    };

    return { init, get, destroy };
})();

const stack = (() => {
    let container = null;

    const get = () => {
        if (!container) {
            container = createstyledelement('div', stackstyles);
            container.className = 'stack';
            shadow.get().append(container);
        }
        return container;
    };

    const remove = () => {
        if (container) container.remove();
        container = null;
    };

    return { get, remove };
})();

const storage = (() => {
    const prefix = 'auto_refresh_domain_';
    const getkey = (domain) => prefix + domain;
    const getdomain = () => window.location.hostname;

    const gettime = async () => {
        const key = getkey(getdomain());
        const value = await GM.getValue(key, null);
        if (value === null) return null;
        const interval = Number(value);
        return (isNaN(interval) || interval <= 0) ? null : interval;
    };

    const settime = async (intervalms) => {
        await GM.setValue(getkey(getdomain()), intervalms);
    };

    const removetime = async () => {
        await GM.deleteValue(getkey(getdomain()));
    };

    return { getdomain, gettime, settime, removetime };
})();

const countdown = (() => {
    let element = null;
    let intervalid = null;
    let remainms = 0;

    const remove = () => {
        if (intervalid !== null) {
            clearInterval(intervalid);
            intervalid = null;
        }
        if (element) element.remove();
        element = null;
    };

    const formattime = (ms) => {
        const total = Math.ceil(ms / 1000);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const seconds = total % 60;
        const pad = (n) => n.toString().padStart(2, '0');
        if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
        return `${pad(minutes)}:${pad(seconds)}`;
    };

    const updatetext = () => {
        if (!element) return;
        if (remainms <= 0) return;
        element.textContent = `${formattime(remainms)}`;
    };

    const show = (intervalms) => {
        remove();
        remainms = intervalms;

        element = createstyledelement('div', countdownstyles);
        element.className = 'countdown';
        updatetext();
        stack.get().prepend(element);

        const startat = Date.now();
        intervalid = setInterval(() => {
            const elapsed = Date.now() - startat;
            remainms = intervalms - elapsed;
            updatetext();
        }, 1000);
    };

    return { show, remove };
})();

const timer = (() => {
    let timerid = null;

    const clear = () => {
        if (timerid !== null) {
            clearTimeout(timerid);
            timerid = null;
        }
    };

    const start = async () => {
        clear();
        const interval = await storage.gettime();
        if (interval === null) return false;

        timerid = setTimeout(async () => {
            const current = await storage.gettime();
            if (current === interval) location.reload();
        }, interval);

        return true;
    };

    return { clear, start };
})();

const bottombar = (() => {
    let buttons = [];

    const remove = () => {
        buttons.forEach(b => b.remove());
        buttons = [];
    };

    const createbtn = (text, onclick) => {
        const btn = createbutton(text);
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await onclick();
        });
        return btn;
    };

    const show = (onsetting) => {
        if (buttons.length) return;

        const cancelbtn = createbtn('关闭', async () => {
            await storage.removetime();
            timer.clear();
            countdown.remove();
            remove();
            stack.remove();
        });

        const resetbtn = createbtn('重设', async () => {
            await onsetting();
        });

        buttons = [resetbtn, cancelbtn];
        const stack_el = stack.get();
        buttons.forEach(b => stack_el.append(b));
    };

    return { show, remove };
})();

const panel = (() => {
    let element = null;

    const timebuttons = [
        { label: '5秒', ms: 5000 },
        { label: '15秒', ms: 15000 },
        { label: '30秒', ms: 30000 },
        { label: '60秒', ms: 60000 },
        { label: '5分钟', ms: 300000 },
        { label: '10分钟', ms: 600000 },
        { label: '30分钟', ms: 1800000 },
        { label: '60分钟', ms: 3600000 },
    ];

    const remove = () => {
        if (element) element.remove();
        element = null;
    };

    const show = async () => {
        if (element) return;

        const currenttime = await storage.gettime();

        element = createstyledelement('div', panelstyles);
        element.className = 'panel';
        element.id = 'auto-refresh-panel';

        const blockevent = (e) => {
            e.stopPropagation();
        };

        element.addEventListener('touchstart', blockevent, { passive: true });
        element.addEventListener('touchmove', blockevent, { passive: true });
        element.addEventListener('touchend', blockevent, { passive: true });
        element.addEventListener('click', blockevent);
        element.addEventListener('mousedown', blockevent);
        element.addEventListener('contextmenu', blockevent);

        const title = createstyledelement('h3', titlestyles);
        title.className = 'title';
        title.textContent = '选择刷新时间';
        element.append(title);

        const middle = createstyledelement('div', middlestyles);
        middle.className = 'middle';

        const grid = createstyledelement('div', gridstyles);
        grid.className = 'grid';

        let selectedms = null;
        const btns = [];

        const clearsel = () => {
            btns.forEach(b => {
                b.classList.remove('selected');
                setstyles(b, timebtnunselectedstyles);
            });
        };

        const setsel = (btn) => {
            clearsel();
            if (btn) {
                btn.classList.add('selected');
                setstyles(btn, timebtnselectedstyles);
            }
        };

        timebuttons.forEach(item => {
            const btn = createbutton(item.label, timebtnbasestyles);
            btn.className = 'timebtn';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedms = item.ms;
                setsel(btn);
            });
            grid.append(btn);
            btns.push(btn);
        });

        if (currenttime !== null) {
            selectedms = currenttime;
            const matchedbtn = btns.find((btn, index) => timebuttons[index].ms === currenttime);
            if (matchedbtn) {
                setsel(matchedbtn);
            }
        }

        middle.append(grid);
        element.append(middle);

        const footer = createstyledelement('div', footerstyes);
        footer.className = 'footer';

        const cancelbtn = createbutton('取消', cancelbtnstyles);
        cancelbtn.className = 'cancelbtn';
        cancelbtn.addEventListener('click', (e) => {
            e.stopPropagation();
            remove();
        });

        const confirmbtn = createbutton('确认', confirmbtnstyles);
        confirmbtn.className = 'confirmbtn';
        confirmbtn.addEventListener('click', async (e) => {
            e.stopPropagation();

            if (selectedms === null || selectedms <= 0) {
                alert('\n请先选择一个刷新时间');
                return;
            }

            await storage.removetime();
            await storage.settime(selectedms);
            remove();
            await timer.start();
            countdown.show(selectedms);
            bottombar.show(async () => panel.show());
        });

        footer.append(cancelbtn);
        footer.append(confirmbtn);
        element.append(footer);

        shadow.get().append(element);
    };

    return { show };
})();

const bootstrap = (() => {
    const init = async () => {
        shadow.init();
        timer.clear();
        bottombar.remove();
        countdown.remove();
        stack.remove();

        const interval = await storage.gettime();
        if (interval === null) return;

        await timer.start();
        countdown.show(interval);
        bottombar.show(async () => panel.show());
    };

    const registermenu = () => {
        GM.registerMenuCommand('⏳ 启用自动刷新', () => panel.show());
    };

    return { init, registermenu };
})();

if (window.top !== window.self) return;

bootstrap.registermenu();
bootstrap.init();