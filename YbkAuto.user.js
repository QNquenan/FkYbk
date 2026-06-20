// ==UserScript==
// @name         Fk云班课
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      1.0.0
// @description  云班课答题辅助 + 浮动控制面板
// @author       江禾
// @license      MIT
// @match        https://www.mosoteach.cn/web/cc-detail/*
// @match        https://www.mosoteach.cn/web/act/quiz-answer/*
// @include      https://www.mosoteach.cn/web/cc-detail/*
// @include      https://www.mosoteach.cn/web/act/quiz-answer/*
// @include      https://www.mosoteach.cn/web/cc-list
// @grant        none
// ==/UserScript==

; (function () {
    'use strict';

    // ── 状态 ──
    const Z = {
        tab: 'video',
        x: 20, y: 80,
        drag: false, dx: 0, dy: 0,
        questions: [],
        running: false, paused: false,
        speed: parseInt(localStorage.getItem('zk_speed')) || 2000,
        qIdx: 0, timer: null,
        config: localStorage.getItem('zk_config') || '',
    };

    // ── Shadow DOM ──
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'closed' });
    host.style.cssText = 'all:initial;display:block;position:fixed;top:0;left:0;width:0;height:0;z-index:99999999';
    document.body.appendChild(host);

    // ── 样式 ──
    const css = document.createElement('style');
    css.textContent = `
.panel{position:fixed;top:80px;right:20px;width:340px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.14);font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;user-select:none}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 0;cursor:grab}
.title{font-weight:600;font-size:15px}
.sub{font-size:12px;color:#94a3b8;font-weight:500}
.tabs{display:flex;gap:6px;margin:10px 16px 0}
.tab{flex:1;padding:6px 0;border:none;border-radius:8px;font:inherit;font-size:13px;font-weight:500;color:#94a3b8;cursor:pointer;background:none}
.tab.on{background:#eef2ff;color:#3b82f6}
.bd{padding:12px 16px 16px;max-height:420px;overflow-y:auto}
.bd::-webkit-scrollbar{width:4px}
.bd::-webkit-scrollbar-thumb{border-radius:2px;background:#cbd5e1}
.legend{display:flex;gap:12px;margin-bottom:10px;font-size:12px;color:#64748b}
.legend span{display:flex;align-items:center;gap:3px}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:12px;max-height:248px;overflow-y:auto}
.grid::-webkit-scrollbar{width:4px}
.grid::-webkit-scrollbar-thumb{border-radius:2px;background:#cbd5e1}
.num{aspect-ratio:1;border:1.5px solid #cbd5e1;border-radius:10px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;background:#f8fafc;color:#475569;display:flex;align-items:center;justify-content:center}
.num.cur{background:#eff6ff;color:#3b82f6;border-color:#3b82f6}
.num.done{background:#e8f5e9;color:#2e7d32;border-color:#2e7d32}
.num.err{background:#fef2f2;color:#ef4444;border-color:#ef4444}
.empty{text-align:center;padding:20px 0;color:#94a3b8;font-size:13px}
.ctrl{display:flex;gap:7px;margin-bottom:6px}
.btn{padding:8px 0;border:none;border-radius:10px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;flex:1;text-align:center;white-space:nowrap}
.btn:active{transform:scale(.97)}
.btn:disabled{opacity:.4;cursor:default}
.btn-pri{background:#3b82f6;color:#fff}
.btn-warn{background:#f59e0b;color:#fff}
.btn-off{background:#f1f5f9;color:#64748b}
.run{display:flex;align-items:center;gap:5px;font-size:11px;color:#22c55e;margin-top:4px}
.pulse{width:6px;height:6px;border-radius:50%;background:#22c55e;animation:pl 1.2s infinite}
@keyframes pl{0%,100%{opacity:1}50%{opacity:.3}}
.spd{display:flex;flex-direction:column;gap:6px;margin-bottom:8px;font-size:11px;color:#64748b}
.spd label{font-weight:500}
.spd-row{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.spd button{padding:2px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font:inherit;font-size:11px;color:#475569;cursor:pointer}
.spd button.on{background:#3b82f6;border-color:#3b82f6;color:#fff}
.spd button.pri{background:#3b82f6;border-color:#3b82f6;color:#fff;padding:3px 14px}
.spd input{width:60px;padding:4px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;text-align:center;outline:none;-moz-appearance:textfield}
.spd input::-webkit-inner-spin-button{display:none}
.spd input:focus{border-color:#3b82f6}
.spd .arrow{padding:2px 6px;font-size:13px}
.set{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.set label{font-size:13px;color:#475569;font-weight:500}
.set input{width:88px;padding:5px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font:inherit;font-size:13px;text-align:center;outline:none}
.set input:focus{border-color:#3b82f6}
.cfgbtn{padding:4px 12px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;font:inherit;font-size:12px;color:#475569;cursor:pointer}
.cfgbtn:hover{border-color:#3b82f6;color:#3b82f6}
.prev{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 10px;font-size:11px;color:#64748b;line-height:1.5;max-height:48px;overflow:auto;white-space:pre-wrap;word-break:break-all;margin-top:4px}
.prev.em{color:#ef4444;font-style:normal;font-weight:500}
.ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.35);align-items:center;justify-content:center;z-index:99999999}
.ov.show{display:flex}
.toast{position:fixed;width:340px;box-sizing:border-box;pointer-events:none;font-size:12px;font-weight:500;line-height:1.5;opacity:0;transform:translateY(16px);transition:opacity .35s ease,transform .35s ease}
.toast.show{opacity:1;transform:translateY(0)}
.toast.err{z-index:99999998;background:#fef2f2;border:1px solid #fecaca;color:#ef4444;padding:8px 12px;border-radius:10px}
.toast.ok{z-index:99999998;background:#eff6ff;border:1px solid #bfdbfe;color:#3b82f6;padding:8px 12px;border-radius:10px}
.modal{width:580px;max-width:92vw;background:#fff;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.2);padding:20px}
.modal h3{font-size:16px;font-weight:600;margin-bottom:4px;color:#1e293b}
.hint{font-size:12px;color:#94a3b8;margin-bottom:10px}
.modal textarea{width:100%;height:280px;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font:12px/1.6 'JetBrains Mono','Fira Code','Consolas',monospace;resize:vertical;outline:none;box-sizing:border-box}
.modal textarea:focus{border-color:#3b82f6}
.cerr{display:none;background:#fef2f2;color:#ef4444;border:1px solid #fecaca;border-radius:8px;padding:7px 10px;font-size:12px;margin-top:8px}
.cerr.show{display:block}
.act{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
.act .btn{padding:8px 18px;flex:0 0 auto}
`;
    root.appendChild(css);

    // ── DOM 快捷创建 ──
    const $ = (tag, a) => Object.assign(document.createElement(tag), a);
    const on = (el, ev, fn) => el.addEventListener(ev, fn);

    // ── 面板 DOM ──
    const hdr = $('div', { className: 'hdr' });
    const subEl = $('span', { className: 'sub' });
    hdr.append($('span', { className: 'title', textContent: '📋 Fk云班课' }), subEl);

    const tabs = $('div', { className: 'tabs' });
    const tabVid = $('button', { className: 'tab on', textContent: '视频' });
    const tabAns = $('button', { className: 'tab', textContent: '答题' });
    const tabSet = $('button', { className: 'tab', textContent: '设置' });
    tabs.append(tabVid, tabAns, tabSet);

    const body = $('div', { className: 'bd' });
    const panel = $('div', { className: 'panel' });
    panel.append(hdr, tabs, body);
    root.appendChild(panel);

    const toast = $('div', { id: 'toast', className: 'toast', textContent: '● 未配置题库' });
    root.appendChild(toast);

    const ov = $('div', { className: 'ov' });
    root.appendChild(ov);

    // ── 面板渲染 ──
    function render() {
        body.innerHTML = '';
        if (Z.tab === 'video') renderVideo();
        else if (Z.tab === 'answer') renderAnswer();
        else renderSettings();
    }

    function renderVideo() {
        const hasVideo = !!document.querySelector('.video-js video');
        if (hasVideo) {
            body.innerHTML = '<div class="spd" id="spdBar" style="text-align:center"><label style="font-size:14px">⏩ 视频倍速</label><div class="spd-row" style="justify-content:center;margin-top:6px"><button data-spd="2" style="font-size:13px;padding:4px 16px">2x</button><button data-spd="5" style="font-size:13px;padding:4px 16px">5x</button><button data-spd="10" style="font-size:13px;padding:4px 16px">10x</button></div><div class="spd-row" style="justify-content:center;margin-top:8px"><button class="arrow" id="spdDec" style="font-size:15px;padding:4px 10px">−</button><input type="number" id="spdCustom" value="2" min="1" max="16" step="1" style="width:70px;font-size:15px;padding:4px"><button class="arrow" id="spdInc" style="font-size:15px;padding:4px 10px">+</button></div><div class="spd-row" style="justify-content:center;margin-top:8px"><button id="spdApply" class="pri" style="font-size:13px;padding:5px 20px">使用自定义</button></div></div>';
            const spdBar = body.querySelector('#spdBar');
            spdBar.querySelectorAll('[data-spd]').forEach(btn => on(btn, 'click', () => setVideoSpeed(parseFloat(btn.dataset.spd))));
            const ci = spdBar.querySelector('#spdCustom');
            const clamp = () => { let v = parseInt(ci.value) || 1; if (v < 1) v = 1; if (v > 16) v = 16; ci.value = v; };
            on(spdBar.querySelector('#spdApply'), 'click', () => { clamp(); setVideoSpeed(parseInt(ci.value)); });
            on(spdBar.querySelector('#spdInc'), 'click', () => { ci.value = Math.min(16, (parseInt(ci.value) || 1) + 1); setVideoSpeed(parseInt(ci.value)); });
            on(spdBar.querySelector('#spdDec'), 'click', () => { ci.value = Math.max(1, (parseInt(ci.value) || 1) - 1); setVideoSpeed(parseInt(ci.value)); });
            on(ci, 'change', clamp);
            on(ci, 'keydown', e => { if (e.key === 'Enter') { clamp(); setVideoSpeed(parseInt(ci.value)); } });
        } else {
            body.innerHTML = '<div class="empty" style="font-size:14px;padding:40px 0">当前页面没有检测到视频</div>';
        }
    }

    function renderAnswer() {
        body.innerHTML = '<div class="legend"><span><span class="dot" style="background:#3b82f6"></span>当前</span><span><span class="dot" style="background:#22c55e"></span>已完成</span><span><span class="dot" style="background:#ef4444"></span>有问题</span><span><span class="dot" style="background:#e2e8f0;border:1px solid #cbd5e1"></span>未答</span></div>';

        if (Z.questions.length) {
            const g = $('div', { className: 'grid' });
            Z.questions.forEach((q, i) => {
                const b = $('button', { className: 'num ' + q.status, textContent: q.index });
                on(b, 'click', () => goTo(i));
                g.appendChild(b);
            });
            body.appendChild(g);
        } else {
            body.innerHTML += '<div class="empty">当前页面没有检测到题目</div>';
        }

        const ctrl = $('div', { className: 'ctrl' });
        const goBtn = $('button', { className: 'btn btn-pri', textContent: '▶ 开始答题' });
        const pauseBtn = $('button', { className: 'btn btn-warn', textContent: '⏸ 暂停' });
        const stopBtn = $('button', { className: 'btn btn-off', textContent: '⏹ 停止' });
        ctrl.append(goBtn, pauseBtn, stopBtn);
        body.appendChild(ctrl);

        const runEl = $('div', { className: 'run', style: 'display:none' });
        runEl.innerHTML = '<span class="pulse"></span> 自动答题中 (<span id="speedShow">' + Z.speed + '</span>ms/题)';
        body.appendChild(runEl);

        on(goBtn, 'click', startAns);
        on(pauseBtn, 'click', pauseAns);
        on(stopBtn, 'click', stopAns);

        _.goBtn = goBtn; _.pauseBtn = pauseBtn; _.stopBtn = stopBtn; _.runEl = runEl;
        if (runEl) { const s = runEl.querySelector('#speedShow'); if (s) s.textContent = Z.speed; }
        syncUI();
    }

    const _ = {};

    function setVideoSpeed(rate) {
        const videos = document.querySelectorAll('.video-js video');
        if (!videos.length) return;
        videos.forEach(v => v.playbackRate = rate);
        console.log('[FK] 视频倍速:', rate);
        const btns = body.querySelectorAll('[data-spd]');
        btns.forEach(b => b.classList.toggle('on', Math.abs(parseFloat(b.dataset.spd) - rate) < 0.01));
        showToast('⏩ 已设为 ' + rate + 'x');
    }

    function syncUI() {
        const has = Z.questions.length > 0;
        if (_.goBtn) {
            _.goBtn.disabled = !has || (Z.running && !Z.paused);
            _.goBtn.textContent = Z.paused ? '▶ 继续' : Z.running ? '答题中…' : '▶ 开始答题';
            _.pauseBtn.disabled = !Z.running || Z.paused;
            _.stopBtn.disabled = !Z.running && !Z.paused;
            _.runEl.style.display = Z.running ? 'flex' : 'none';
        }
        const done = Z.questions.filter(q => q.status === 'done').length;
        subEl.textContent = Z.questions.length ? done + '/' + Z.questions.length : '';
    }

    function renderSettings() {
        body.innerHTML = `<div class="set"><label>答题速度 (ms/题)</label><input type="number" id="spd" value="${Z.speed}" min="200" max="30000" step="100"></div><div class="set" style="flex-direction:column;align-items:stretch;gap:6px"><div style="display:flex;justify-content:space-between;align-items:center"><label>题库配置</label><button class="cfgbtn" id="cfgBtn">⚙ 配置</button></div><div class="prev${Z.config ? '' : ' em'}" id="prev">${Z.config ? Z.config.slice(0, 100) + (Z.config.length > 100 ? '……' : '') : '● 未配置题库'}</div></div>`;
        const spd = body.querySelector('#spd');
        on(spd, 'change', () => { Z.speed = parseInt(spd.value) || 2000; localStorage.setItem('zk_speed', Z.speed); });
        on(body.querySelector('#cfgBtn'), 'click', openCfg);
        _.prevEl = body.querySelector('#prev');
    }

    // ── 答题控制 ──
    function goTo(idx) {
        const el = document.querySelectorAll('.list-item')[idx];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function updateGrid() {
        const g = body.querySelector('.grid');
        if (!g) return;
        g.querySelectorAll('.num').forEach((btn, i) => btn.className = 'num ' + Z.questions[i].status);
        syncUI();
    }

    function startAns() {
        if (Z.paused) { Z.paused = false; Z.running = true; syncUI(); loop(); return; }
        if (Z.running) return;
        if (!Z.config) { showToast('⚠ 请先在设置中配置题库'); return; }
        Z.running = true; Z.paused = false; Z.qIdx = 0;
        const firstUndone = Z.questions.findIndex(q => q.status !== 'done' && q.status !== 'err');
        if (firstUndone >= 0) Z.qIdx = firstUndone;
        Z.questions.forEach(q => { if (q.status === 'cur') q.status = 'default'; });
        Z.questions[Z.qIdx].status = 'cur';
        updateGrid(); syncUI(); loop();
    }

    async function loop() {
        if (!Z.running || Z.paused) return;
        if (Z.qIdx >= Z.questions.length) { stopAns(); return; }
        Z.questions.forEach(q2 => { if (q2.status === 'cur') q2.status = 'default'; });
        Z.questions[Z.qIdx].status = 'cur';
        updateGrid(); syncUI();

        try {
            await answerQuestion(Z.questions[Z.qIdx]);
        } catch (e) {
            console.error('[FK] 答题失败:', e);
            showToast('❌ 第' + (Z.qIdx + 1) + '题请求失败: ' + (e.message || e), 'err');
        }
        Z.qIdx++;
        updateGrid(); syncUI();
        setTimeout(() => { detectAnswers(); Z.timer = setTimeout(loop, Z.speed); }, 300);
    }

    function pauseAns() {
        if (!Z.running) return;
        Z.paused = true; Z.running = false; clearTimeout(Z.timer); Z.timer = null; syncUI();
    }

    function stopAns() {
        Z.running = false; Z.paused = false; clearTimeout(Z.timer); Z.timer = null; Z.qIdx = 0;
        Z.questions.forEach(q => { if (q.status === 'cur') q.status = 'default'; });
        syncUI();
    }

    // ── 题库 API 交互 ──
    async function answerQuestion(q) {
        const configs = JSON.parse(Z.config);
        const cfg = configs[0];
        const title = q._data.title;
        const optionsStr = q._data.options.map(o => o.text).join(',');
        const typeCode = q._data.typeLabel || (q._data.type === 'single' ? '单选题' : '多选题');

        const body = JSON.parse(JSON.stringify(cfg.data)
            .replace(/\$\{title\}/g, title)
            .replace(/\$\{options\}/g, optionsStr)
            .replace(/\$\{type\}/g, typeCode));

        console.log('[FK] 请求 第' + (Z.qIdx + 1) + '题');
        let resp;
        if (cfg.method === 'get' || cfg.method === 'GET') {
            resp = await (await fetch(cfg.url + '?' + new URLSearchParams(body), { method: 'GET' })).json();
        } else {
            resp = await (await fetch(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
        }

        const handlerFn = new Function(cfg.handler)();
        const answerText = handlerFn(resp)[1];
        if (answerText == null) throw new Error('API 未返回答案');

        console.log('[FK] 答案 第' + (Z.qIdx + 1) + '题:', answerText);
        const clicked = applyAnswer(q._data, String(answerText).trim());
        console.log('[FK] 完成 第' + (Z.qIdx + 1) + '题, 已选:', clicked);
        return clicked;
    }

    function applyAnswer(question, answer) {
        const opts = question.options;

        function simulateClick(el) {
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
            const seq = ['pointerdown', 'mousedown', 'click', 'mouseup', 'pointerup'];
            seq.forEach(t => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y })));
            const inp = el.querySelector('input') || el;
            if (inp.tagName === 'INPUT') {
                inp.checked = true;
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                inp.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        function target(opt) {
            return opt.input && (opt.input.closest('.v-radio, .v-input--checkbox') || opt.input.closest('label') || opt.input);
        }

        function tryMatch(opt, ans) {
            const t = opt.text.trim(), l = opt.label.replace(/[、．.\s]/g, ''), a = ans.replace(/[、．.\s]/g, '');
            return t === ans || t.includes(ans) || ans.includes(t) || l === a || a.includes(l) || l.includes(a);
        }

        let clicked = false;
        opts.forEach(opt => {
            if (tryMatch(opt, answer)) { const el = target(opt); if (el) { simulateClick(el); clicked = true; } }
        });

        if (!clicked && /[,、，]/.test(answer)) {
            answer.split(/[,、，]/).forEach(part => {
                const p = part.trim();
                if (!p) return;
                opts.forEach(opt => { if (tryMatch(opt, p)) { const el = target(opt); if (el) simulateClick(el); } });
            });
            clicked = true;
        }
        return clicked;
    }

    // ── 配置弹窗 ──
    function openCfg() {
        ov.innerHTML = '';
        ov.className = 'ov show';
        const modal = $('div', { className: 'modal' });
        modal.innerHTML = '<h3>⚙ 题库配置</h3><p class="hint">JSON 数组格式，每项含 name / url / method / type / contentType / data / handler</p><textarea id="cfgTa" spellcheck="false" placeholder=\'[\n  {\n    "name":"ZE题库(自建版)","url":"http://localhost:3000/query","method":"get","type":"GM_xmlhttpRequest","contentType":"json","data":{"title":"${title}","options":"${options}","type":"${type}"},"handler":"return (res)=>res.code===0?[res.message,undefined]:[res.data.question,res.data.answer,{ai:res.data.is_ai}]"\n  }\n]\'>' + (Z.config || '') + '</textarea><div class="cerr" id="cfgErr"></div><div class="act"><button class="btn btn-off" id="cfgCancel">取消</button><button class="btn btn-pri" id="cfgSave">保存</button></div>';
        ov.appendChild(modal);
        on(ov, 'click', e => { if (e.target === ov) closeCfg(); });
        on(modal.querySelector('#cfgCancel'), 'click', closeCfg);
        on(modal.querySelector('#cfgSave'), 'click', saveCfg);
    }

    function closeCfg() { ov.className = 'ov'; }

    function saveCfg() {
        const val = ov.querySelector('#cfgTa').value.trim();
        if (!val) return;
        const err = validateCfg(val);
        if (err) { const e = ov.querySelector('#cfgErr'); e.textContent = err; e.className = 'cerr show'; return; }
        Z.config = val;
        localStorage.setItem('zk_config', val);
        closeCfg();
        hideToast();
        if (_.prevEl) { _.prevEl.textContent = val.slice(0, 100) + (val.length > 100 ? '……' : ''); _.prevEl.className = 'prev'; }
    }

    function validateCfg(text) {
        let p;
        try { p = JSON.parse(text); } catch (e) { return '❌ JSON 格式错误：' + e.message; }
        if (!Array.isArray(p)) return '❌ 必须是数组 []';
        const req = ['name', 'url', 'method', 'type', 'contentType', 'data', 'handler'];
        for (let i = 0; i < p.length; i++) {
            const it = p[i];
            if (!it || typeof it !== 'object') return '❌ 第' + (i + 1) + '项不是对象';
            for (const f of req) if (!(f in it)) return '❌ 第' + (i + 1) + '项缺少 "' + f + '"';
            if (typeof it.name !== 'string' || !it.name.trim()) return '❌ 第' + (i + 1) + '项 name 无效';
            if (typeof it.url !== 'string') return '❌ 第' + (i + 1) + '项 url 必须是字符串';
            if (typeof it.handler !== 'string') return '❌ 第' + (i + 1) + '项 handler 必须是字符串';
            try { const fn = new Function(it.handler); if (typeof fn() !== 'function') return '❌ 第' + (i + 1) + '项 handler 需返回函数'; } catch (e) { return '❌ 第' + (i + 1) + '项 handler 语法错误'; }
        }
        return null;
    }

    // ── Toast ──
    function showToast(text, type) {
        const el = root.querySelector('#toast');
        el.style.right = Z.x + 'px';
        el.style.top = (Z.y + panel.offsetHeight + 8) + 'px';
        el.textContent = text;
        el.className = 'toast';
        void el.offsetWidth;
        el.className = 'toast show ' + (type === 'err' ? 'err' : 'ok');
        if (type !== 'err') { clearTimeout(el._timer); el._timer = setTimeout(() => hideToast(), 2500); }
    }
    function hideToast() { root.querySelector('#toast').className = 'toast'; }

    // ── 状态检测 ──
    function detectAnswers() {
        const items = document.querySelectorAll('.sheet-item');
        if (!items.length) return;
        let changed = false;
        items.forEach((el, i) => {
            if (i >= Z.questions.length) return;
            if (el.classList.contains('primary') && Z.questions[i].status !== 'done') {
                Z.questions[i].status = 'done'; changed = true;
            }
        });
        if (changed) updateGrid();
    }
    setInterval(detectAnswers, 800);

    // ── 视频检测（MutationObserver，无需轮询）──
    let lastVideo = false;
    const vidObs = new MutationObserver(() => {
        const now = !!document.querySelector('.video-js video');
        if (now !== lastVideo) { lastVideo = now; if (Z.tab === 'video') render(); }
    });
    vidObs.observe(document.body, { childList: true, subtree: true });

    // ── 拖动 ──
    on(hdr, 'mousedown', e => { Z.drag = true; Z.dx = e.clientX; Z.dy = e.clientY; });
    on(document, 'mousemove', e => {
        if (!Z.drag) return;
        Z.x = Math.max(8, Z.x - (e.clientX - Z.dx));
        Z.y = Math.max(8, Z.y + (e.clientY - Z.dy));
        Z.dx = e.clientX; Z.dy = e.clientY;
        panel.style.right = Z.x + 'px';
        panel.style.top = Z.y + 'px';
        const t = root.querySelector('#toast');
        if (t.classList.contains('show')) {
            t.style.right = Z.x + 'px';
            t.style.top = (Z.y + panel.offsetHeight + 8) + 'px';
        }
    });
    on(document, 'mouseup', () => { Z.drag = false; });

    // ── 标签切换 ──
    on(tabVid, 'click', () => { Z.tab = 'video'; tabVid.className = 'tab on'; tabAns.className = 'tab'; tabSet.className = 'tab'; render(); });
    on(tabAns, 'click', () => { Z.tab = 'answer'; tabVid.className = 'tab'; tabAns.className = 'tab on'; tabSet.className = 'tab'; render(); });
    on(tabSet, 'click', () => { Z.tab = 'settings'; tabVid.className = 'tab'; tabAns.className = 'tab'; tabSet.className = 'tab on'; render(); });

    // ── 题目检测 ──
    function checkPage() {
        if (location.href.includes('/act/quiz-answer/')) { console.log('[FK] 答题界面'); waitQ(); }
        else if (Z.questions.length) {
            Z.questions = [];
            if (Z.tab === 'answer') render();
            console.log('[FK] 已清除题目');
        }
    }

    function waitQ() {
        const existing = document.querySelectorAll('.list-item');
        if (existing.length) { syncQ(parseQ(existing)); return; }
        let t, o;
        const found = () => {
            const items = document.querySelectorAll('.list-item');
            if (!items.length) return;
            o.disconnect(); clearInterval(t);
            syncQ(parseQ(items));
        };
        o = new MutationObserver(found); o.observe(document.body, { childList: true, subtree: true });
        t = setInterval(found, 500);
        setTimeout(() => { o.disconnect(); clearInterval(t); }, 15000);
    }

    function parseQ(items) {
        return Array.from(items).map(item => {
            const cb = item.querySelector('input[type="checkbox"]');
            const rd = item.querySelector('input[type="radio"]');
            if (!cb && !rd) return null;
            return {
                type: cb ? 'multiple' : 'single',
                title: (item.querySelector('.topic-subject.word-break') || {}).textContent || '',
                typeLabel: ((item.querySelector('.v-chip__content') || {}).textContent || '').trim(),
                options: Array.from(item.querySelectorAll('.topic-answer-align')).map(ta => ({
                    label: (ta.querySelector('.vote-option-index.number') || {}).textContent || '',
                    text: (ta.querySelector('.content.topic-answer.word-break') || {}).textContent || '',
                    input: ta.parentElement && ta.parentElement.querySelector('input'),
                })),
            };
        }).filter(Boolean);
    }

    function syncQ(qs) {
        if (!qs || !qs.length) return;
        Z.questions = qs.map((q, i) => ({ index: i + 1, status: i === 0 ? 'cur' : 'default', _data: q }));
        if (Z.tab === 'answer') render();
    }

    // ── URL 监听 ──
    let lastUrl = location.href;
    on(window, 'popstate', () => { if (location.href !== lastUrl) { lastUrl = location.href; checkPage(); } });
    const _push = history.pushState, _rep = history.replaceState;
    history.pushState = function (...a) { _push.apply(this, a); if (location.href !== lastUrl) { lastUrl = location.href; checkPage(); } };
    history.replaceState = function (...a) { _rep.apply(this, a); if (location.href !== lastUrl) { lastUrl = location.href; checkPage(); } };
    setInterval(() => { if (location.href !== lastUrl) { lastUrl = location.href; checkPage(); } }, 1000);

    // ── 启动 ──
    render();
    checkPage();
    if (!Z.config) setTimeout(() => showToast('● 未配置题库'), 500);
})();
