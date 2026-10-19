// Leaderboard page: four views (ranking, pareto, matrix, radar) over LEADERBOARD (leaderboard-data.js)
// plus the accepted submissions that the benchmark repo gathers in submissions/leaderboard.json.
// The view, user agent, sort and filters live in the URL hash so a view can be linked.
const LB_SUBMISSIONS = 'https://raw.githubusercontent.com/sahsaeedi/tau-emotion-bench/main/submissions/leaderboard.json';
// Submissions name each user agent by its model; the switch uses these ids
const LB_USER_IDS = { 'qwen3-235b-a22b-instruct-2507': 'qwen', 'glm-5.2': 'glm' };
const LB_VIEWS = ['ranking', 'pareto', 'matrix', 'radar'];
const LB_PAIRS = ['cost', 'tokens', 'cost-p3', 'tokens-p3'];
const LB_TASKS_URL = 'https://github.com/sahsaeedi/tau-emotion-bench/tree/main/data/tau_emotion/domains';
const LB_LEVELS = ['domains', 'tasks'];
// Line icons for the domain chips (24x24, stroked)
const LB_ICONS = {
    all: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    airline: '<path d="M10.5 13.5 3 10l1.5-1.5 7 1.5 5-5a1.8 1.8 0 0 1 2.5 2.5l-5 5 1.5 7L14 21l-3.5-7.5Z"/><path d="M10.5 13.5 6 18"/>',
    retail: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 11V6a3 3 0 0 1 6 0v5"/>',
    telecom: '<path d="M12 20v-4"/><path d="M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/><path d="M5.5 5.5a9 9 0 0 1 13 0M8.3 8.3a5 5 0 0 1 7.4 0"/>',
    telehealth: '<path d="M6 4v6a4 4 0 0 0 8 0V4"/><path d="M5 4h2M13 4h2"/><path d="M10 14v2a4 4 0 0 0 8 0v-2"/><circle cx="18" cy="11" r="2"/>',
    school: '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
    basketball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/><path d="M5.5 5.5c3.5 3.5 3.5 9.5 0 13M18.5 5.5c-3.5 3.5-3.5 9.5 0 13"/>',
    restaurant: '<path d="M6 3v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3M8 3v18"/><path d="M17 3c-2 1-3 4-3 7v2h3v9M17 3v18"/>',
    travel: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    movie: '<path d="M4 8h16v12H4V8Z"/><path d="m4 8 1.5-4 14-1 1 4"/><path d="M8 4.5 10 8M13 4l2 3.5"/><path d="m10.5 11 4.5 2.5-4.5 2.5V11Z"/>',
    bank: '<path d="m3 9 9-5 9 5H3Z"/><path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8"/><path d="M3 17h18v3H3z"/>',
};

const state = {
    view: 'ranking',
    user: LEADERBOARD.userAgents[0].id,
    sort: 'pass1',
    dir: 'desc',
    thinking: 'all',
    type: 'all',
    q: '',
    pair: 'cost',
    level: 'domains',  // matrix: one column per domain, or per task
    domain: 'all',     // matrix at task level: which domain's tasks
    pin: null,       // radar: pinned entry key
    hover: null,     // radar: hovered entry key
};

// ---- Data ----

function lbKey(e) {
    return e.model + '|' + (e.thinking ? 't' : '') + (e.custom ? 'c' : '');
}

function lbDomainIds() {
    return LEADERBOARD.domains.map(function(d) { return d.toLowerCase(); });
}

// Trials solved per task, {domain: [count or null per task]}, from the digit strings
// in leaderboard-tasks.js (paper models) or a submission's task -> count map
function lbTaskCounts(userId, key, taskMap) {
    const tasks = typeof LEADERBOARD_RUNS === 'undefined' ? null : LEADERBOARD_RUNS;
    if (!tasks) return null;
    const digits = taskMap ? null : (tasks.counts[userId] || {})[key];
    if (!taskMap && !digits) return null;
    const out = {};
    lbDomainIds().forEach(function(d) {
        const ids = tasks.taskIds[d] || [];
        out[d] = ids.map(function(id, i) {
            if (taskMap) return taskMap[id] == null ? null : Number(taskMap[id]);
            const c = (digits[d] || '')[i];
            return c == null || c === '-' ? null : Number(c);
        });
    });
    return out;
}

// The agent's [prompt, completion] tokens per domain, from leaderboard-runs.js (paper
// models) or a submission's per-domain results; null for a domain without usage
function lbUsage(userId, key, domainResults) {
    const runs = typeof LEADERBOARD_RUNS === 'undefined' ? null : LEADERBOARD_RUNS;
    const out = {};
    let any = false;
    lbDomainIds().forEach(function(d) {
        let v = null;
        if (domainResults) {
            const r = domainResults[d];
            if (r && r.prompt_tokens != null) v = [Number(r.prompt_tokens), Number(r.completion_tokens || 0)];
        } else if (runs && runs.usage && runs.usage[userId] && runs.usage[userId][key]) {
            v = runs.usage[userId][key][d] || null;
        }
        out[d] = v;
        if (v) any = true;
    });
    return any ? out : null;
}

// Tokens in the current domain scope: {prompt, completion, total}, or null when a
// domain in the scope has no usage
function lbTokens(e) {
    if (!e.usage) return null;
    const domains = state.domain === 'all' ? lbDomainIds() : [state.domain];
    let prompt = 0, completion = 0;
    for (let i = 0; i < domains.length; i++) {
        const v = e.usage[domains[i]];
        if (!v) return null;
        prompt += v[0];
        completion += v[1];
    }
    return { prompt: prompt, completion: completion, total: prompt + completion };
}

// Estimated cost in dollars: tokens at the model's list prices per million
function lbCost(e) {
    const t = lbTokens(e);
    if (!t || !e.price) return null;
    return t.prompt / 1e6 * e.price.input + t.completion / 1e6 * e.price.output;
}

function lbFmtTokens(n) {
    if (n == null) return '–';
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'k';
    return String(Math.round(n));
}

function lbFmtCost(v) {
    if (v == null) return '–';
    if (v >= 1000) return '$' + Math.round(v).toLocaleString('en-US');
    if (v >= 100) return '$' + v.toFixed(0);
    if (v >= 10) return '$' + v.toFixed(1);
    return '$' + v.toFixed(2);
}

function lbPrepare() {
    LEADERBOARD.userAgents.forEach(function(user) {
        user.entries.forEach(function(e) {
            e.custom = !!e.custom;
            e.source = 'paper';
            e.date = null;
            e.domainsP1 = null;
            e.key = lbKey(e);
            e.gap = e.pass1 - e.pass3;
            e.tasks = lbTaskCounts(user.id, e.key, null);
            e.usage = lbUsage(user.id, e.key, null);
            e.price = (LEADERBOARD.prices || {})[e.model] || null;
            if (e.tasks) {
                e.domainsP1 = lbDomainIds().map(function(d) {
                    const counts = (e.tasks[d] || []).filter(function(k) { return k != null; });
                    if (!counts.length) return null;
                    return Math.round(10000 * counts.reduce(function(a, b) { return a + b; }, 0) / (LEADERBOARD.trials * counts.length)) / 100;
                });
            }
        });
    });
}

// ---- Domain scope: 'all' averages the ten domains; a domain id scores that domain alone ----

function lbDomainIndex() {
    return state.domain === 'all' ? -1 : lbDomainIds().indexOf(state.domain);
}

function lbP1(e) {
    const i = lbDomainIndex();
    if (i < 0) return e.pass1;
    return e.domainsP1 && e.domainsP1[i] != null ? e.domainsP1[i] : null;
}

function lbP3(e) {
    const i = lbDomainIndex();
    return i < 0 ? e.pass3 : (e.domains[i] == null ? null : e.domains[i]);
}

function lbGap(e) {
    const p1 = lbP1(e), p3 = lbP3(e);
    return p1 == null || p3 == null ? null : p1 - p3;
}

function lbDomainLabel() {
    const i = lbDomainIndex();
    return i < 0 ? 'all domains' : LEADERBOARD.domains[i];
}

function lbTaskTotal() {
    const tasks = typeof LEADERBOARD_RUNS === 'undefined' ? null : LEADERBOARD_RUNS;
    if (state.domain === 'all' || !tasks) return LEADERBOARD.tasks;
    return (tasks.taskIds[state.domain] || []).length || LEADERBOARD.tasks;
}

function lbRenderDomains() {
    const tasks = typeof LEADERBOARD_RUNS === 'undefined' ? null : LEADERBOARD_RUNS;
    const chips = [{ id: 'all', name: 'All', sub: 'domains' }].concat(LEADERBOARD.domains.map(function(d) {
        const n = tasks ? (tasks.taskIds[d.toLowerCase()] || []).length : 0;
        return { id: d.toLowerCase(), name: d, sub: n ? n + ' tasks' : 'domain' };
    }));
    document.getElementById('lb-domains').innerHTML = chips.map(function(c) {
        return '<button type="button" class="lb-domain" data-domain="' + c.id + '" aria-pressed="' + (state.domain === c.id) + '">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            (LB_ICONS[c.id] || LB_ICONS.all) + '</svg>' +
            '<span class="lb-domain-name">' + lbEscape(c.name) + '</span><span class="lb-domain-sub">' + lbEscape(c.sub) + '</span></button>';
    }).join('');
}

function lbAddSubmissions(submissions) {
    submissions.forEach(function(s) {
        Object.keys(s.results).forEach(function(simulator) {
            const user = LEADERBOARD.userAgents.find(function(u) { return u.id === LB_USER_IDS[simulator]; });
            if (!user) return;
            const r = s.results[simulator];
            const e = {
                model: s.model_name,
                provider: s.model_organization,
                thinking: !!s.thinking,
                custom: s.submission_type === 'custom',
                pass1: Number(r.avg_at_3),
                pass3: Number(r.avg_hat_3),
                domains: LEADERBOARD.domains.map(function(d) {
                    const scores = r.domains[d.toLowerCase()];
                    return scores ? Number(scores.pass_3) : null;
                }),
                domainsP1: LEADERBOARD.domains.map(function(d) {
                    const scores = r.domains[d.toLowerCase()];
                    return scores && scores.pass_1 != null ? Number(scores.pass_1) : null;
                }),
                source: 'submission',
                date: s.submission_date,
                url: s.trajectories_url || null,
            };
            e.key = lbKey(e);
            e.gap = e.pass1 - e.pass3;
            e.tasks = r.tasks && Object.keys(r.tasks).length ? lbTaskCounts(user.id, e.key, r.tasks) : null;
            e.usage = lbUsage(user.id, e.key, r.domains);
            e.price = s.pricing ? { input: Number(s.pricing.input_per_million), output: Number(s.pricing.output_per_million), source: s.pricing.source || '' } : null;
            // A hand-maintained paper row with the same model gives way to the submission
            user.entries = user.entries.filter(function(x) { return x.key !== e.key; });
            user.entries.push(e);
        });
        if (s.submission_date > LEADERBOARD.updated) LEADERBOARD.updated = s.submission_date;
    });
}

function lbUserById(id) {
    return LEADERBOARD.userAgents.find(function(u) { return u.id === id; }) || LEADERBOARD.userAgents[0];
}

function lbCurrentUser() {
    return lbUserById(state.user);
}

function lbMatches(e) {
    if (state.thinking === 'yes' && !e.thinking) return false;
    if (state.thinking === 'no' && e.thinking) return false;
    if (state.type === 'standard' && e.custom) return false;
    if (state.type === 'custom' && !e.custom) return false;
    if (state.q) {
        const q = state.q.toLowerCase();
        if (e.model.toLowerCase().indexOf(q) < 0 && e.provider.toLowerCase().indexOf(q) < 0) return false;
    }
    return true;
}

function lbFiltered(user) {
    return (user || lbCurrentUser()).entries.filter(lbMatches);
}

function lbValue(e, key) {
    if (key.indexOf('d') === 0 && key.length <= 3) {
        const v = e.domains[Number(key.slice(1))];
        return v == null ? -1 : v;
    }
    if (key === 'date') return e.date || '';
    if (key === 'pass1') { const v = lbP1(e); return v == null ? -1 : v; }
    if (key === 'pass3') { const v = lbP3(e); return v == null ? -1 : v; }
    if (key === 'gap') { const v = lbGap(e); return v == null ? -1 : v; }
    if (key === 'tokens') { const v = lbTokens(e); return v == null ? -1 : v.total; }
    if (key === 'cost') { const v = lbCost(e); return v == null ? -1 : v; }
    return e[key];
}

function lbSorted(rows, key, dir) {
    const sign = dir === 'asc' ? 1 : -1;
    const text = key === 'model' || key === 'provider' || key === 'date';
    return rows.slice().sort(function(a, b) {
        const va = lbValue(a, key), vb = lbValue(b, key);
        let c = text ? String(va).localeCompare(String(vb)) : (va - vb);
        if (c === 0) c = (b.pass1 - a.pass1) || (b.pass3 - a.pass3);
        else c *= sign;
        return c;
    });
}

function lbPct(v) {
    return v == null ? '–' : v.toFixed(1) + '%';
}

function lbEscape(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
}

function lbTags(e) {
    return e.thinking ? '<span class="lb-tag">thinking</span>' : '';
}

// ---- URL hash ----

function lbReadHash() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const view = params.get('view'), user = params.get('user'), sort = params.get('sort'), pair = params.get('pair');
    if (view && LB_VIEWS.indexOf(view) >= 0) state.view = view;
    if (user && LEADERBOARD.userAgents.some(function(u) { return u.id === user; })) state.user = user;
    if (sort) {
        const parts = sort.split(':');
        state.sort = parts[0];
        state.dir = parts[1] === 'asc' ? 'asc' : 'desc';
    }
    if (pair && LB_PAIRS.indexOf(pair) >= 0) state.pair = pair;
    if (LB_LEVELS.indexOf(params.get('level')) >= 0) state.level = params.get('level');
    if (params.get('domain') && lbDomainIds().indexOf(params.get('domain')) >= 0) state.domain = params.get('domain');
    if (['all', 'yes', 'no'].indexOf(params.get('thinking')) >= 0) state.thinking = params.get('thinking');
    if (['all', 'standard', 'custom'].indexOf(params.get('type')) >= 0) state.type = params.get('type');
    if (params.get('q')) state.q = params.get('q');
    if (params.get('pin')) state.pin = params.get('pin');
}

function lbWriteHash() {
    const params = new URLSearchParams();
    if (state.view !== 'ranking') params.set('view', state.view);
    if (state.user !== LEADERBOARD.userAgents[0].id) params.set('user', state.user);
    if (state.sort !== 'pass1' || state.dir !== 'desc') params.set('sort', state.sort + ':' + state.dir);
    if (state.view === 'pareto' && state.pair !== 'cost') params.set('pair', state.pair);
    if (state.view === 'matrix' && state.level !== 'domains') params.set('level', state.level);
    if (state.domain !== 'all') params.set('domain', state.domain);
    if (state.thinking !== 'all') params.set('thinking', state.thinking);
    if (state.type !== 'all') params.set('type', state.type);
    if (state.q) params.set('q', state.q);
    if (state.view === 'radar' && state.pin) params.set('pin', state.pin);
    const hash = params.toString();
    history.replaceState(null, '', location.pathname + location.search + (hash ? '#' + hash : ''));
}

// ---- Tooltip ----

function lbTipShow(html, event) {
    const tip = document.getElementById('lb-tip');
    tip.innerHTML = html;
    tip.hidden = false;
    lbTipMove(event);
}

function lbTipMove(event) {
    const tip = document.getElementById('lb-tip');
    if (tip.hidden) return;
    const pad = 14;
    let x = event.clientX + pad, y = event.clientY + pad;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    if (x + w > window.innerWidth - 8) x = event.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = event.clientY - h - pad;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
}

function lbTipHide() {
    document.getElementById('lb-tip').hidden = true;
}

// ---- Header ----

function lbMeta() {
    const user = lbCurrentUser();
    const titles = {
        ranking: 'LEADERBOARD', pareto: 'PARETO FRONTIER', matrix: state.level === 'tasks' ? 'TASK MATRIX' : 'DOMAIN MATRIX', radar: 'DOMAIN RADAR',
    };
    const scope = state.domain === 'all' ? '' : ' · ' + lbEscape(lbDomainLabel()).toUpperCase();
    const tasksUrl = state.domain === 'all' ? LB_TASKS_URL : LB_TASKS_URL + '/' + state.domain + '/tasks.json';
    document.getElementById('lb-panel-title').innerHTML =
        'τ-EMOTION-BENCH ' + titles[state.view] + scope + ' / <a href="' + tasksUrl + '">' + lbTaskTotal() + ' TASKS ↗</a>';
    const n = lbFiltered(user).length;
    document.getElementById('lb-meta').textContent =
        'user agent: ' + user.name + ' · ' + n + (n === user.entries.length ? '' : ' of ' + user.entries.length) +
        ' agents · ' + LEADERBOARD.domains.length + ' domains · ' + LEADERBOARD.trials + ' trials · updated ' + LEADERBOARD.updated;
}

// ---- Ranking ----

function lbBar(e) {
    const v1 = lbP1(e), v3 = lbP3(e);
    if (v1 == null && v3 == null) return '';
    const p1 = Math.max(0, Math.min(100, v1 == null ? 0 : v1));
    const p3 = Math.max(0, Math.min(100, v3 == null ? 0 : v3));
    return '<div class="lb-track" role="img" aria-label="Pass^1 ' + lbPct(v1) + ', Pass^3 ' + lbPct(v3) + '">' +
        '<span class="lb-p1" style="width:' + p1 + '%"></span><span class="lb-p3" style="width:' + p3 + '%"></span></div>';
}

function lbTokensCell(e, cls) {
    const t = lbTokens(e);
    const title = t ? lbFmtTokens(t.prompt) + ' prompt + ' + lbFmtTokens(t.completion) + ' completion' : 'no usage recorded';
    return '<td class="num col-tokens' + cls + '" title="' + lbEscape(title) + '">' + (t ? lbFmtTokens(t.total) : '–') + '</td>';
}

function lbCostCell(e, cls) {
    const v = lbCost(e);
    const title = !lbTokens(e) ? 'no usage recorded' : !e.price ? 'no list price known' :
        'at $' + e.price.input + ' in / $' + e.price.output + ' out per million tokens';
    return '<td class="num col-cost' + cls + '" title="' + lbEscape(title) + '">' + lbFmtCost(v) + '</td>';
}

function lbRenderRanking() {
    const rows = lbSorted(lbFiltered(), state.sort, state.dir);
    const tbody = document.querySelector('#leaderboard tbody');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="lb-empty">No agents match the filter.</td></tr>';
    } else {
        tbody.innerHTML = rows.map(function(e, i) {
            const sorted = function(k) { return state.sort === k ? ' sorted' : ''; };
            return '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td><span class="lb-name">' + lbEscape(e.model) + '</span>' + lbTags(e) + '</td>' +
                '<td class="company col-company">' + lbEscape(e.provider) + '</td>' +
                '<td class="col-perf' + sorted('pass1') + '">' + lbPct(lbP1(e)) + '</td>' +
                '<td class="col-bar">' + lbBar(e) + '</td>' +
                '<td class="num' + sorted('pass3') + '">' + lbPct(lbP3(e)) + '</td>' +
                '<td class="num col-gap' + sorted('gap') + '">' + (lbGap(e) == null ? '–' : lbGap(e).toFixed(1)) + '</td>' +
                lbTokensCell(e, sorted('tokens')) + lbCostCell(e, sorted('cost')) +
                '<td class="num date col-date' + sorted('date') + '">' +
                    (e.date ? (e.url ? '<a href="' + lbEscape(e.url) + '" title="Download the trajectories">' + e.date + '</a>' : e.date) : 'paper') + '</td>' +
                '</tr>';
        }).join('');
    }
    document.querySelectorAll('#leaderboard th button').forEach(function(button) {
        const on = button.dataset.sort === state.sort;
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) button.dataset.dir = state.dir; else delete button.dataset.dir;
    });
}

// ---- Pareto ----

// Parameters in billions from the model name (Qwen3-4B, Tracer-High-1.7B, Qwen3-235B-A22B);
// null when the name gives none, as for the large API models
function lbParamsB(model) {
    const m = /(\d+(?:\.\d+)?)B(?![a-z])/i.exec(model);
    return m ? Number(m[1]) : null;
}

// The Pareto plots show only models larger than 16B
const LB_PARETO_MIN_B = 16;

function lbParetoPoints() {
    const cost = state.pair.indexOf('cost') === 0;
    const p3 = state.pair.indexOf('-p3') > 0;
    const where = state.domain === 'all' ? '' : ' on ' + lbDomainLabel();
    const score = p3 ? lbP3 : lbP1;
    const points = [];
    lbFiltered().forEach(function(e) {
        const size = lbParamsB(e.model);
        if (size != null && size <= LB_PARETO_MIN_B) return;
        const x = cost ? lbCost(e) : (lbTokens(e) ? lbTokens(e).total : null);
        const y = score(e);
        if (x != null && y != null) points.push({ e: e, x: x, y: y, sub: e.provider, name: e.model });
    });
    // Runs of one model with thinking on and off share a name; tell them apart
    const seen = {};
    points.forEach(function(p) { seen[p.e.model] = (seen[p.e.model] || 0) + 1; });
    points.forEach(function(p) {
        if (seen[p.e.model] > 1) p.name = p.e.model + (p.e.thinking ? ' (thinking)' : ' (non-thinking)');
    });
    return {
        xLabel: (cost ? 'Estimated cost' : 'Agent tokens') + where,
        yLabel: (p3 ? 'Pass^3' : 'Pass^1') + where,
        xKind: cost ? 'cost' : 'tokens',
        minX: true,
        points: points,
    };
}

// Non-dominated set: no other point is at least as good on both axes and better on one.
// y is always maximised; x is maximised, or minimised when minX is set.
function lbFrontier(points, minX) {
    const betterX = function(q, p) { return minX ? q.x <= p.x : q.x >= p.x; };
    const strictX = function(q, p) { return minX ? q.x < p.x : q.x > p.x; };
    return points.filter(function(p) {
        return !points.some(function(q) {
            return q !== p && betterX(q, p) && q.y >= p.y && (strictX(q, p) || q.y > p.y);
        });
    }).sort(function(a, b) { return a.x - b.x; });
}

// An axis from 0 to a round maximum: {max, ticks, fmt}
function lbAxis(kind, values) {
    const max = Math.max.apply(null, values.concat([0]));
    if (kind === 'pct') {
        const step = max > 50 ? 20 : 10;
        const top = Math.max(step, Math.ceil((max + step * 0.3) / step) * step);
        const ticks = [];
        for (let v = 0; v <= top; v += step) ticks.push(v);
        return { max: top, ticks: ticks, fmt: function(v) { return v + '%'; } };
    }
    const raw = Math.max(max, 1e-9) * 1.1 / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map(function(m) { return m * mag; }).find(function(st) { return st >= raw; });
    const top = Math.ceil(max * 1.1 / step) * step || step;
    const ticks = [];
    for (let i = 0; i * step <= top + 1e-9; i++) ticks.push(i * step);
    return { max: top, ticks: ticks, fmt: kind === 'cost' ? lbFmtCost : lbFmtTokens };
}

function lbParetoTip(data, p) {
    const fx = data.xKind === 'cost' ? lbFmtCost : data.xKind === 'tokens' ? lbFmtTokens : lbPct;
    return '<span>' + lbEscape(data.xLabel) + '</span> ' + fx(p.x) + ' · <span>' + lbEscape(data.yLabel) + '</span> ' + lbPct(p.y);
}

// A log axis on the 1-2-5 sequence, padded around the data: {min, max, ticks, fmt, log}
function lbLogAxis(kind, values) {
    let lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
    if (!(lo > 0)) lo = hi > 0 ? hi / 10 : 1;
    if (hi <= lo) { lo /= 2; hi *= 2; }
    const seq = [];
    for (let e = Math.floor(Math.log10(lo)) - 1; e <= Math.ceil(Math.log10(hi)) + 1; e++) {
        [1, 2, 5].forEach(function(mul) { seq.push(mul * Math.pow(10, e)); });
    }
    const min = seq.filter(function(v) { return v <= lo / 1.15; }).pop();
    const max = seq.find(function(v) { return v >= hi * 1.15; });
    return {
        min: min, max: max, log: true,
        ticks: seq.filter(function(v) { return v >= min && v <= max; }),
        // Ticks are round numbers, so they print without decimals
        fmt: kind === 'cost' ?
            function(v) { return v >= 1 ? '$' + Math.round(v).toLocaleString('en-US') : '$' + String(+v.toFixed(2)); } :
            lbFmtTokens,
    };
}

function lbRenderPareto() {
    const box = document.getElementById('lb-pareto');
    const data = lbParetoPoints();
    document.getElementById('lb-pair').value = state.pair;
    if (!data.points.length) {
        box.innerHTML = '<p class="lb-empty">No agents to plot: none of the filtered agents has ' +
            (data.xKind === 'cost' ? 'both token usage and a list price' : 'token usage') + '.</p>';
        return;
    }
    const W = Math.max(320, box.clientWidth - 32), H = Math.max(360, Math.min(560, Math.round(W * 0.52)));
    // Phones: points are numbered and named in a key under the chart
    const compact = W < 600;
    const m = { top: 24, right: compact ? 24 : 150, bottom: 52, left: compact ? 52 : 64 };
    const pw = W - m.left - m.right, ph = H - m.top - m.bottom;
    // Cost spans more than tenfold, so it gets a log axis; tokens stay linear from 0
    const xValues = data.points.map(function(p) { return p.x; });
    const xAxis = data.xKind === 'cost' ? lbLogAxis('cost', xValues) : lbAxis(data.xKind, xValues);
    // Scores always span the full 0 to 100 so plots compare at a glance
    const yAxis = { max: 100, ticks: [0, 20, 40, 60, 80, 100], fmt: function(v) { return v + '%'; } };
    const sx = xAxis.log ?
        function(v) { return m.left + (Math.log(v) - Math.log(xAxis.min)) / (Math.log(xAxis.max) - Math.log(xAxis.min)) * pw; } :
        function(v) { return m.left + v / xAxis.max * pw; };
    const sy = function(v) { return m.top + ph - v / yAxis.max * ph; };
    const frontier = lbFrontier(data.points, data.minX);
    const onFrontier = {};
    frontier.forEach(function(p) { onFrontier[p.e.key] = true; });

    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' +
        lbEscape(data.yLabel) + ' against ' + lbEscape(data.xLabel) + '">';
    xAxis.ticks.forEach(function(v) {
        svg += '<line class="lb-grid" x1="' + sx(v) + '" x2="' + sx(v) + '" y1="' + m.top + '" y2="' + (m.top + ph) + '"/>';
        svg += '<text class="lb-axis-text" x="' + sx(v) + '" y="' + (m.top + ph + 18) + '" text-anchor="middle">' + lbEscape(xAxis.fmt(v)) + '</text>';
    });
    yAxis.ticks.forEach(function(v) {
        svg += '<line class="lb-grid" x1="' + m.left + '" x2="' + (m.left + pw) + '" y1="' + sy(v) + '" y2="' + sy(v) + '"/>';
        svg += '<text class="lb-axis-text" x="' + (m.left - 8) + '" y="' + (sy(v) + 4) + '" text-anchor="end">' + lbEscape(yAxis.fmt(v)) + '</text>';
    });
    svg += '<text class="lb-axis-title" x="' + (m.left + pw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + lbEscape(data.xLabel) + (xAxis.log ? ' (log scale)' : '') + '</text>';
    svg += '<text class="lb-axis-title" transform="translate(14 ' + (m.top + ph / 2) + ') rotate(-90)" text-anchor="middle">' + lbEscape(data.yLabel) + '</text>';
    if (data.diagonal) {
        const d = Math.min(xAxis.max, yAxis.max);
        svg += '<line class="lb-ref" x1="' + sx(0) + '" y1="' + sy(0) + '" x2="' + sx(d) + '" y2="' + sy(d) + '"/>';
    }
    if (frontier.length > 1) {
        svg += '<polyline class="lb-frontier" points="' + frontier.map(function(p) { return sx(p.x) + ',' + sy(p.y); }).join(' ') + '"/>';
    }
    // Labels: every point gets one. Spots are tried on rings of growing distance around
    // the mark; a spot is scored by how much it overlaps other labels, marks and the
    // frontier line, and the first free spot wins (else the least overlapping one).
    // A label set away from its mark gets a thin leader line back to it.
    const boxes = data.points.map(function(p) { return { x0: sx(p.x) - 7, x1: sx(p.x) + 7, y0: sy(p.y) - 7, y1: sy(p.y) + 7 }; });
    for (let i = 1; i < frontier.length; i++) {
        const ax = sx(frontier[i - 1].x), ay = sy(frontier[i - 1].y), bx = sx(frontier[i].x), by = sy(frontier[i].y);
        const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 4));
        for (let k = 0; k <= steps; k++) {
            const x = ax + (bx - ax) * k / steps, y = ay + (by - ay) * k / steps;
            boxes.push({ x0: x - 2, x1: x + 2, y0: y - 2, y1: y + 2 });
        }
    }
    const overlap = function(b) {
        let area = 0;
        boxes.forEach(function(o) {
            const w = Math.min(b.x1, o.x1) - Math.max(b.x0, o.x0), h = Math.min(b.y1, o.y1) - Math.max(b.y0, o.y0);
            if (w > 0 && h > 0) area += w * h;
        });
        const out = Math.max(0, m.left + 4 - b.x0) + Math.max(0, b.x1 - (W - 4)) +
            Math.max(0, 2 - b.y0) + Math.max(0, b.y1 - (m.top + ph - 2));
        return area + out * 1000;
    };
    const RINGS = [10, 22, 36, 52, 70, 92, 118, 148];
    const ANGLES = [0, 180, 30, 150, -30, -150, 60, 120, -60, -120, 90, -90];
    // Frontier points first, then the most crowded points, so they get the nearest spots
    const nearest = function(p) {
        let d = Infinity;
        data.points.forEach(function(q) { if (q !== p) d = Math.min(d, Math.hypot(sx(q.x) - sx(p.x), sy(q.y) - sy(p.y))); });
        return d;
    };
    const order = data.points.slice().sort(function(a, b) {
        return (onFrontier[b.e.key] ? 1 : 0) - (onFrontier[a.e.key] ? 1 : 0) || nearest(a) - nearest(b);
    });
    data.points.slice().sort(function(a, b) { return b.y - a.y || a.x - b.x; })
        .forEach(function(p, i) { p.num = i + 1; });
    // Label box: a name over its company, or on phones just the point's number
    const up = compact ? 9 : 11, down = compact ? 3 : 14;
    const labels = order.map(function(p) {
        const px = sx(p.x), py = sy(p.y);
        const width = compact ? String(p.num).length * 7 + 4 : Math.max(p.name.length * 7.3, p.sub.length * 6.1) + 4;
        let best = null;
        for (let r = 0; r < RINGS.length && !(best && best.cost === 0); r++) {
            for (let a = 0; a < ANGLES.length; a++) {
                const t = ANGLES[a] * Math.PI / 180, c = Math.cos(t), sn = -Math.sin(t);
                const ax = px + RINGS[r] * c, ay = py + RINGS[r] * sn;
                const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle';
                const x0 = anchor === 'start' ? ax : anchor === 'end' ? ax - width : ax - width / 2;
                const y = sn > 0.3 ? ay + up : sn < -0.3 ? ay - down : ay + (up - down) / 2;
                const box = { x0: x0, x1: x0 + width, y0: y - up, y1: y + down };
                const cost = overlap(box);
                if (!best || cost < best.cost) best = { x: ax, y: y, anchor: anchor, box: box, cost: cost, ring: r };
                if (cost === 0) break;
            }
        }
        boxes.push(best.box);
        // Leader from the mark's edge to the nearest point of the label's box
        let leader = null;
        if (best.ring > 0) {
            const tx = Math.max(best.box.x0, Math.min(px, best.box.x1)), ty = Math.max(best.box.y0, Math.min(py, best.box.y1));
            const d = Math.hypot(tx - px, ty - py);
            if (d > 14) leader = { x1: px + (tx - px) * 6 / d, y1: py + (ty - py) * 6 / d, x2: tx, y2: ty };
        }
        return { p: p, x: best.x, y: best.y, anchor: best.anchor, leader: leader };
    });
    data.points.forEach(function(p) {
        const f = onFrontier[p.e.key] ? ' on-frontier' : '';
        svg += '<g class="lb-point" data-key="' + lbEscape(p.e.key) + '">' +
            '<rect class="lb-hit" x="' + (sx(p.x) - 12) + '" y="' + (sy(p.y) - 12) + '" width="24" height="24"/>' +
            '<rect class="lb-dot' + f + '" x="' + (sx(p.x) - 4) + '" y="' + (sy(p.y) - 4) + '" width="8" height="8"/>' +
            '</g>';
    });
    labels.forEach(function(l) {
        const f = onFrontier[l.p.e.key] ? ' on-frontier' : '';
        if (l.leader) {
            svg += '<line class="lb-leader" x1="' + l.leader.x1.toFixed(1) + '" y1="' + l.leader.y1.toFixed(1) +
                '" x2="' + l.leader.x2.toFixed(1) + '" y2="' + l.leader.y2.toFixed(1) + '"/>';
        }
        if (compact) {
            svg += '<text class="lb-label lb-label-num' + f + '" x="' + l.x.toFixed(1) + '" y="' + l.y.toFixed(1) + '" text-anchor="' + l.anchor + '">' + l.p.num + '</text>';
        } else {
            svg += '<text class="lb-label' + f + '" x="' + l.x.toFixed(1) + '" y="' + l.y.toFixed(1) + '" text-anchor="' + l.anchor + '">' + lbEscape(l.p.name) + '</text>' +
                '<text class="lb-label-sub" x="' + l.x.toFixed(1) + '" y="' + (l.y + 12).toFixed(1) + '" text-anchor="' + l.anchor + '">' + lbEscape(l.p.sub) + '</text>';
        }
    });
    svg += '</svg>';
    if (compact) {
        const fx = data.xKind === 'cost' ? lbFmtCost : lbFmtTokens;
        svg += '<ol class="lb-pkey">' + data.points.slice().sort(function(a, b) { return a.num - b.num; }).map(function(p) {
            return '<li data-key="' + lbEscape(p.e.key) + '"' + (onFrontier[p.e.key] ? ' class="on-frontier"' : '') + '>' +
                '<span class="lb-pkey-num">' + p.num + '</span>' +
                '<span class="lb-pkey-name">' + lbEscape(p.name) + '</span>' +
                '<span class="lb-pkey-val">' + fx(p.x) + ' · ' + lbPct(p.y) + '</span></li>';
        }).join('') + '</ol>';
    }
    box.innerHTML = svg;

    box.querySelectorAll('.lb-point').forEach(function(g) {
        const p = data.points.find(function(x) { return x.e.key === g.dataset.key; });
        g.addEventListener('mouseenter', function(event) {
            lbTipShow('<b>' + lbEscape(p.name) + '</b> <span>' + lbEscape(p.sub) + '</span><br>' + lbParetoTip(data, p) +
                (onFrontier[p.e.key] ? '<br><span>on the frontier</span>' : ''), event);
        });
        g.addEventListener('mousemove', lbTipMove);
        g.addEventListener('mouseleave', lbTipHide);
    });
    // Phones: tapping a row of the key marks its point
    box.querySelectorAll('.lb-pkey li').forEach(function(li) {
        li.addEventListener('click', function() {
            const on = !li.classList.contains('is-active');
            box.querySelectorAll('.lb-pkey li, .lb-point').forEach(function(el) { el.classList.remove('is-active'); });
            if (on) {
                li.classList.add('is-active');
                const g = box.querySelector('.lb-point[data-key="' + CSS.escape(li.dataset.key) + '"]');
                if (g) g.classList.add('is-active');
            }
        });
    });
}

// ---- Matrix ----

function lbRenderMatrix() {
    const level = document.getElementById('lb-level');
    level.querySelectorAll('button').forEach(function(b) {
        b.setAttribute('aria-pressed', b.dataset.value === state.level ? 'true' : 'false');
    });
    document.getElementById('lb-level-hint').textContent = state.level === 'tasks' ?
        (state.domain === 'all' ? 'all ' + LEADERBOARD.tasks + ' tasks; pick a domain above to narrow' : 'the ' + lbTaskTotal() + ' ' + lbDomainLabel() + ' tasks') :
        'Pass^3 per domain';
    if (state.level === 'tasks') lbRenderTaskMatrix();
    else lbRenderDomainMatrix();
}

function lbRenderTaskMatrix() {
    const box = document.getElementById('lb-matrix');
    const rows = lbSorted(lbFiltered(), state.sort, state.dir);
    const tasks = typeof LEADERBOARD_RUNS === 'undefined' ? null : LEADERBOARD_RUNS;
    if (!tasks) {
        box.innerHTML = '<p class="lb-empty">Per-task results are not available.</p>';
        return;
    }
    const domains = state.domain === 'all' ? lbDomainIds() : [state.domain];
    const groups = domains.map(function(d) { return { id: d, ids: tasks.taskIds[d] || [] }; });
    const total = groups.reduce(function(n, g) { return n + g.ids.length; }, 0);
    let html = '<table class="lb-matrix lb-tasks"><thead>' +
        '<tr class="lb-m-groups"><th class="lb-m-model" rowspan="2">Model</th>' +
        '<th class="lb-m-score" rowspan="2"><button type="button" data-sort="pass3" aria-pressed="' + (state.sort === 'pass3') + '">Pass^3</button></th>';
    groups.forEach(function(g) {
        html += '<th class="lb-m-group" colspan="' + g.ids.length + '"><a href="' + LB_TASKS_URL + '/' + g.id + '/tasks.json" title="Open the ' + g.id + ' tasks">' +
            lbEscape(g.id) + ' <span>' + g.ids.length + '</span></a></th>';
    });
    html += '</tr><tr>';
    groups.forEach(function(g) {
        g.ids.forEach(function(id, i) {
            const short = id.replace(/^[a-z]+_test_/, '');
            html += '<th class="lb-m-task' + (i === 0 ? ' first' : '') + '"><a href="' + LB_TASKS_URL + '/' + g.id + '/tasks.json" title="' + lbEscape(id) + '"><span>' + lbEscape(short) + '</span></a></th>';
        });
    });
    html += '</tr></thead><tbody>';
    if (!rows.length) html += '<tr><td colspan="' + (total + 2) + '" class="lb-empty">No agents match the filter.</td></tr>';
    rows.forEach(function(e) {
        html += '<tr><th scope="row"><span class="lb-name">' + lbEscape(e.model) + '</span>' + lbTags(e) +
            '<span class="lb-sub">' + lbEscape(e.provider) + '</span></th>' +
            '<td class="lb-m-score">' + lbPct(e.pass3) + '</td>';
        groups.forEach(function(g) {
            const counts = e.tasks ? e.tasks[g.id] : null;
            g.ids.forEach(function(id, i) {
                const k = counts ? counts[i] : null;
                const first = i === 0 ? ' first' : '';
                if (k == null) {
                    html += '<td class="lb-m-cell na' + first + '" data-row="' + lbEscape(e.key) + '" data-task="' + lbEscape(id) + '">·</td>';
                } else {
                    const t = Math.max(0, Math.min(1, k / LEADERBOARD.trials));
                    html += '<td class="lb-m-cell' + (t >= 0.6 ? ' hi' : '') + first + '" style="--v:' + t.toFixed(3) + '" data-row="' + lbEscape(e.key) + '" data-task="' + lbEscape(id) + '">' + k + '/' + LEADERBOARD.trials + '</td>';
                }
            });
        });
        html += '</tr>';
    });
    // How many agents solved each task in every trial
    html += '</tbody><tfoot><tr><th scope="row">Solved by</th><td class="lb-m-score"></td>';
    groups.forEach(function(g) {
        g.ids.forEach(function(id, i) {
            let n = 0, of = 0;
            rows.forEach(function(e) {
                const counts = e.tasks ? e.tasks[g.id] : null;
                if (counts && counts[i] != null) { of++; if (counts[i] >= LEADERBOARD.trials) n++; }
            });
            html += '<td class="lb-m-foot' + (i === 0 ? ' first' : '') + '" title="' + n + ' of ' + of + ' agents solved ' + lbEscape(id) + ' in every trial">' + (of ? n : '·') + '</td>';
        });
    });
    html += '</tr></tfoot></table>';
    box.innerHTML = html;

    box.querySelectorAll('thead button').forEach(function(button) {
        button.addEventListener('click', function() { lbSetSort(button.dataset.sort); });
    });
    const byKey = {};
    rows.forEach(function(e) { byKey[e.key] = e; });
    box.querySelectorAll('td.lb-m-cell').forEach(function(cell) {
        cell.addEventListener('mouseenter', function(event) {
            const e = byKey[cell.dataset.row];
            lbTipShow('<b>' + lbEscape(e.model) + '</b> <span>/ ' + lbEscape(cell.dataset.task) + '</span><br>' +
                (cell.classList.contains('na') ? '<span>no released trajectories</span>' : cell.textContent + ' <span>trials solved</span>'), event);
        });
        cell.addEventListener('mousemove', lbTipMove);
        cell.addEventListener('mouseleave', lbTipHide);
    });
}

function lbRenderDomainMatrix() {
    const box = document.getElementById('lb-matrix');
    const rows = lbSorted(lbFiltered(), state.sort, state.dir);
    const sortKey = state.sort;
    let html = '<table class="lb-matrix"><thead><tr>' +
        '<th class="lb-m-model">Model</th>' +
        '<th class="lb-m-score"><button type="button" data-sort="pass3" aria-pressed="' + (sortKey === 'pass3') + '">Pass^3</button></th>';
    LEADERBOARD.domains.forEach(function(d, i) {
        html += '<th class="lb-m-domain' + (d.toLowerCase() === state.domain ? ' sel' : '') + '"><button type="button" data-sort="d' + i + '" aria-pressed="' + (sortKey === 'd' + i) + '" title="Sort by ' + lbEscape(d) + '"><span>' + lbEscape(d) + '</span></button></th>';
    });
    html += '</tr></thead><tbody>';
    if (!rows.length) html += '<tr><td colspan="' + (LEADERBOARD.domains.length + 2) + '" class="lb-empty">No agents match the filter.</td></tr>';
    rows.forEach(function(e) {
        html += '<tr><th scope="row"><span class="lb-name">' + lbEscape(e.model) + '</span>' + lbTags(e) +
            '<span class="lb-sub">' + lbEscape(e.provider) + '</span></th>' +
            '<td class="lb-m-score">' + lbPct(e.pass3) + '</td>';
        e.domains.forEach(function(v, i) {
            if (v == null) {
                html += '<td class="lb-m-cell na" data-row="' + lbEscape(e.key) + '" data-col="' + i + '">–</td>';
            } else {
                const t = Math.max(0, Math.min(1, v / 100));
                html += '<td class="lb-m-cell' + (t >= 0.6 ? ' hi' : '') + '" style="--v:' + t.toFixed(3) + '" data-row="' + lbEscape(e.key) + '" data-col="' + i + '">' + v.toFixed(0) + '</td>';
            }
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    box.innerHTML = html;

    box.querySelectorAll('thead button').forEach(function(button) {
        button.addEventListener('click', function() {
            lbSetSort(button.dataset.sort);
        });
    });
    const byKey = {};
    rows.forEach(function(e) { byKey[e.key] = e; });
    box.querySelectorAll('td.lb-m-cell').forEach(function(cell) {
        cell.addEventListener('mouseenter', function(event) {
            const e = byKey[cell.dataset.row], i = Number(cell.dataset.col);
            const p1 = e.domainsP1 && e.domainsP1[i] != null ? ' · <span>Pass^1</span> ' + lbPct(e.domainsP1[i]) : '';
            lbTipShow('<b>' + lbEscape(e.model) + '</b> <span>/ ' + lbEscape(LEADERBOARD.domains[i]) + '</span><br>' +
                '<span>Pass^3</span> ' + lbPct(e.domains[i]) + p1, event);
        });
        cell.addEventListener('mousemove', lbTipMove);
        cell.addEventListener('mouseleave', lbTipHide);
    });
}

// ---- Radar ----

function lbRadarEntry(rows) {
    const key = state.hover || state.pin;
    return rows.find(function(e) { return e.key === key; }) || rows[0] || null;
}

function lbRenderRadarTable(rows) {
    const box = document.getElementById('lb-radar-table');
    const active = lbRadarEntry(rows);
    const sortKey = state.sort === 'pass1' ? 'pass3' : state.sort;
    let html = '<table class="lb-table lb-radar-table"><thead><tr><th>Model</th>' +
        '<th class="num all"><button type="button" data-sort="pass3" aria-pressed="' + (sortKey === 'pass3') + '">All domains</button></th>';
    LEADERBOARD.domains.forEach(function(d, i) {
        html += '<th class="num dom"><button type="button" data-sort="d' + i + '" aria-pressed="' + (sortKey === 'd' + i) + '" title="Sort by ' + lbEscape(d) + '"><span>' + lbEscape(d) + '</span></button></th>';
    });
    html += '</tr></thead><tbody>';
    if (!rows.length) html += '<tr><td colspan="' + (LEADERBOARD.domains.length + 2) + '" class="lb-empty">No agents match the filter.</td></tr>';
    rows.forEach(function(e) {
        html += '<tr data-key="' + lbEscape(e.key) + '"' + (active && active.key === e.key ? ' class="is-active"' : '') + ' tabindex="0">' +
            '<td><span class="lb-name">' + lbEscape(e.model) + '</span>' + lbTags(e) + '<span class="lb-sub">' + lbEscape(e.provider) + '</span></td>' +
            '<td class="num all">' + lbPct(e.pass3) + '</td>';
        e.domains.forEach(function(v) { html += '<td class="num">' + (v == null ? '–' : v.toFixed(1)) + '</td>'; });
        html += '</tr>';
    });
    html += '</tbody></table>';
    box.innerHTML = html;

    box.querySelectorAll('thead button').forEach(function(button) {
        button.addEventListener('click', function() { lbSetSort(button.dataset.sort); });
    });
    box.querySelectorAll('tbody tr[data-key]').forEach(function(tr) {
        tr.addEventListener('mouseenter', function() { state.hover = tr.dataset.key; lbRenderRadarChart(rows); lbMarkActive(rows); });
        tr.addEventListener('focus', function() { state.hover = tr.dataset.key; lbRenderRadarChart(rows); lbMarkActive(rows); });
        tr.addEventListener('mouseleave', function() { state.hover = null; lbRenderRadarChart(rows); lbMarkActive(rows); });
        tr.addEventListener('click', function() { lbPin(tr.dataset.key, rows); });
        tr.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); lbPin(tr.dataset.key, rows); }
        });
    });
}

function lbPin(key, rows) {
    state.pin = state.pin === key ? null : key;
    state.hover = null;
    lbWriteHash();
    lbRenderRadarChart(rows);
    lbMarkActive(rows);
}

function lbMarkActive(rows) {
    const active = lbRadarEntry(rows);
    document.querySelectorAll('#lb-radar-table tbody tr[data-key]').forEach(function(tr) {
        tr.classList.toggle('is-active', !!active && tr.dataset.key === active.key);
    });
    document.querySelectorAll('#lb-radar .lb-legend button').forEach(function(b) {
        b.setAttribute('aria-pressed', !!active && b.dataset.key === active.key ? 'true' : 'false');
    });
}

function lbRenderRadarChart(rows) {
    const box = document.getElementById('lb-radar');
    const n = LEADERBOARD.domains.length;
    const W = 660, S = 560, cx = W / 2, cy = S / 2, R = S / 2 - 76;
    const angle = function(i) { return -Math.PI / 2 + i * 2 * Math.PI / n; };
    const pt = function(i, v) { return [cx + R * v / 100 * Math.cos(angle(i)), cy + R * v / 100 * Math.sin(angle(i))]; };
    const poly = function(e) { return e.domains.map(function(v, i) { return pt(i, v == null ? 0 : v).map(function(c) { return c.toFixed(1); }).join(','); }).join(' '); };
    const active = lbRadarEntry(rows);

    let svg = '<svg viewBox="0 0 ' + W + ' ' + S + '" role="img" aria-label="Pass^3 per domain, one polygon per agent">';
    [20, 40, 60, 80, 100].forEach(function(r) {
        svg += '<polygon class="lb-radar-ring" points="' + LEADERBOARD.domains.map(function(_, i) { return pt(i, r).join(','); }).join(' ') + '"/>';
        svg += '<text class="lb-radar-tick" x="' + (cx + 4) + '" y="' + (cy - R * r / 100 + 3) + '">' + r + '</text>';
    });
    LEADERBOARD.domains.forEach(function(d, i) {
        const end = pt(i, 100), lab = pt(i, 113);
        svg += '<line class="lb-radar-axis" x1="' + cx + '" y1="' + cy + '" x2="' + end[0] + '" y2="' + end[1] + '"/>';
        const anchor = Math.abs(Math.cos(angle(i))) < 0.2 ? 'middle' : (Math.cos(angle(i)) > 0 ? 'start' : 'end');
        svg += '<text class="lb-radar-name' + (d.toLowerCase() === state.domain ? ' sel' : '') + '" x="' + lab[0].toFixed(1) + '" y="' + (lab[1] + 4).toFixed(1) + '" text-anchor="' + anchor + '">' + lbEscape(d) + '</text>';
    });
    rows.forEach(function(e) {
        if (active && e.key === active.key) return;
        svg += '<polygon class="lb-radar-ghost" points="' + poly(e) + '"><title>' + lbEscape(e.model) + '</title></polygon>';
    });
    if (active) {
        svg += '<polygon class="lb-radar-main" points="' + poly(active) + '"/>';
        active.domains.forEach(function(v, i) {
            if (v == null) return;
            const p = pt(i, v);
            const off = pt(i, v + 9);
            svg += '<circle class="lb-radar-vertex" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5"/>';
            svg += '<text class="lb-radar-value" x="' + off[0].toFixed(1) + '" y="' + (off[1] + 4).toFixed(1) + '" text-anchor="middle">' + v.toFixed(0) + '</text>';
        });
    }
    svg += '</svg>';
    svg += '<p class="lb-radar-title">' + (active ? '<b>' + lbEscape(active.model) + '</b> <span>' + lbEscape(active.provider) + ' · Pass^3 ' + lbPct(active.pass3) +
        (state.pin === active.key ? ' · pinned' : '') + '</span>' : '<span>No agents match the filter.</span>') + '</p>';
    svg += '<ul class="lb-legend">' + rows.map(function(e) {
        return '<li><button type="button" data-key="' + lbEscape(e.key) + '" aria-pressed="' + (active && e.key === active.key) + '">' + lbEscape(e.model) + '</button></li>';
    }).join('') + '</ul>';
    box.innerHTML = svg;
    box.querySelectorAll('.lb-legend button').forEach(function(b) {
        b.addEventListener('mouseenter', function() { state.hover = b.dataset.key; lbRenderRadarChart(rows); lbMarkActive(rows); });
        b.addEventListener('mouseleave', function() { state.hover = null; lbRenderRadarChart(rows); lbMarkActive(rows); });
        b.addEventListener('click', function() { lbPin(b.dataset.key, rows); });
    });
}

function lbRenderRadar() {
    const rows = lbSorted(lbFiltered(), state.sort === 'pass1' ? 'pass3' : state.sort, state.dir);
    lbRenderRadarTable(rows);
    lbRenderRadarChart(rows);
}

// ---- Render dispatch ----

function lbRender() {
    lbRenderDomains();
    lbMeta();
    document.querySelectorAll('.lb-view').forEach(function(v) { v.hidden = v.dataset.view !== state.view; });
    document.querySelectorAll('.lb-tabs [role="tab"]').forEach(function(t) {
        t.setAttribute('aria-selected', t.dataset.view === state.view ? 'true' : 'false');
    });
    const count = (state.thinking !== 'all') + (state.type !== 'all') + (state.q ? 1 : 0);
    const badge = document.getElementById('lb-filter-count');
    badge.hidden = !count;
    badge.textContent = count;
    if (state.view === 'ranking') lbRenderRanking();
    else if (state.view === 'pareto') lbRenderPareto();
    else if (state.view === 'matrix') lbRenderMatrix();
    else lbRenderRadar();
    lbWriteHash();
}

function lbSetSort(key) {
    if (state.sort === key) state.dir = state.dir === 'desc' ? 'asc' : 'desc';
    else { state.sort = key; state.dir = key === 'model' || key === 'provider' ? 'asc' : 'desc'; }
    lbRender();
}

// ---- Export ----

// ---- Export ----

function lbDownload(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
}

function lbCsv() {
    const user = lbCurrentUser();
    const rows = lbSorted(lbFiltered(user), state.sort, state.dir);
    const head = ['rank', 'model', 'company', 'thinking', 'submission', 'user_agent', 'scope', 'pass1', 'pass3', 'prompt_tokens', 'completion_tokens', 'cost_estimate_usd', 'added'].concat(
        LEADERBOARD.domains.map(function(d) { return 'pass3_' + d.toLowerCase(); }));
    const lines = [head.join(',')].concat(rows.map(function(e, i) {
        return [i + 1, e.model, e.provider, e.thinking ? 'yes' : 'no', e.custom ? 'custom' : 'standard', user.name, lbDomainLabel(),
            lbP1(e) == null ? '' : lbP1(e), lbP3(e) == null ? '' : lbP3(e),
            lbTokens(e) ? lbTokens(e).prompt : '', lbTokens(e) ? lbTokens(e).completion : '',
            lbCost(e) == null ? '' : lbCost(e).toFixed(2), e.date || 'paper']
            .concat(e.domains.map(function(v) { return v == null ? '' : v; }))
            .map(function(v) { return /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v; }).join(',');
    }));
    lbDownload(new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }),
        'tau-emotion-bench-' + user.id + (state.domain === 'all' ? '' : '-' + state.domain) + '.csv');
}

// The current view's chart (Pareto or radar) as a PNG: the SVG is copied with its
// computed styles inlined, since the page's stylesheet doesn't travel with it
const LB_SVG_STYLES = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linejoin', 'opacity', 'font-size', 'font-weight', 'font-family', 'letter-spacing', 'text-transform', 'text-anchor'];

function lbChartSvg() {
    const id = state.view === 'pareto' ? 'lb-pareto' : state.view === 'radar' ? 'lb-radar' : null;
    return id ? document.querySelector('#' + id + ' svg') : null;
}

function lbPng() {
    const svg = lbChartSvg();
    if (!svg) return;
    const copy = svg.cloneNode(true);
    const src = svg.querySelectorAll('*'), dst = copy.querySelectorAll('*');
    for (let i = 0; i < src.length; i++) {
        const cs = getComputedStyle(src[i]);
        LB_SVG_STYLES.forEach(function(p) { dst[i].style.setProperty(p, cs.getPropertyValue(p)); });
    }
    const box = svg.viewBox.baseVal;
    const w = box.width || svg.clientWidth, h = box.height || svg.clientHeight;
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', w);
    copy.setAttribute('height', h);
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', getComputedStyle(document.getElementById('lb-panel')).backgroundColor);
    copy.insertBefore(bg, copy.firstChild);
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const img = new Image();
    img.onload = function() {
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) {
            if (blob) lbDownload(blob, 'tau-emotion-bench-' + state.view + '-' + lbCurrentUser().id + '.png');
        }, 'image/png');
    };
    img.onerror = function() { lbToast('could not render the chart'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(copy));
}

function lbToast(text) {
    const toast = document.getElementById('lb-toast');
    toast.textContent = text;
    clearTimeout(lbToast.timer);
    lbToast.timer = setTimeout(function() { toast.textContent = ''; }, 2000);
}

// ---- Setup ----

document.addEventListener('DOMContentLoaded', function() {
    lbPrepare();
    lbReadHash();

    // User-agent switch
    const userSelect = document.getElementById('lb-user');
    userSelect.innerHTML = LEADERBOARD.userAgents.map(function(u) {
        return '<option value="' + u.id + '">' + lbEscape(u.name) + '</option>';
    }).join('');
    userSelect.value = state.user;
    userSelect.addEventListener('change', function() { state.user = userSelect.value; state.pin = null; lbRender(); });

    // View tabs
    document.querySelectorAll('.lb-tabs [role="tab"]').forEach(function(tab) {
        tab.addEventListener('click', function() { state.view = tab.dataset.view; lbRender(); });
    });

    // Ranking sort
    document.querySelectorAll('#leaderboard th button').forEach(function(button) {
        button.addEventListener('click', function() { lbSetSort(button.dataset.sort); });
    });

    // Matrix level and domain
    document.getElementById('lb-level').addEventListener('click', function(event) {
        const b = event.target.closest('button');
        if (!b) return;
        state.level = b.dataset.value;
        lbRender();
    });
    document.getElementById('lb-domains').addEventListener('click', function(event) {
        const b = event.target.closest('button');
        if (!b) return;
        state.domain = b.dataset.domain;
        lbRender();
    });

    // Pareto axes
    document.getElementById('lb-pair').addEventListener('change', function(event) { state.pair = event.target.value; lbRender(); });

    // Filter popover
    const filterBtn = document.getElementById('lb-filter-btn'), filter = document.getElementById('lb-filter');
    filterBtn.addEventListener('click', function() {
        const open = filter.hidden;
        filter.hidden = !open;
        filterBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function(event) {
        if (!filter.hidden && !event.target.closest('.lb-filter-wrap')) {
            filter.hidden = true;
            filterBtn.setAttribute('aria-expanded', 'false');
        }
    });
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && !filter.hidden) { filter.hidden = true; filterBtn.setAttribute('aria-expanded', 'false'); }
    });
    const syncFilterButtons = function() {
        filter.querySelectorAll('.lb-segmented').forEach(function(group) {
            group.querySelectorAll('button').forEach(function(b) {
                b.setAttribute('aria-pressed', b.dataset.value === state[group.dataset.filter] ? 'true' : 'false');
            });
        });
        document.getElementById('lb-q').value = state.q;
    };
    filter.querySelectorAll('.lb-segmented').forEach(function(group) {
        group.addEventListener('click', function(event) {
            const b = event.target.closest('button');
            if (!b) return;
            state[group.dataset.filter] = b.dataset.value;
            syncFilterButtons();
            lbRender();
        });
    });
    document.getElementById('lb-q').addEventListener('input', function(event) { state.q = event.target.value.trim(); lbRender(); });
    document.getElementById('lb-filter-reset').addEventListener('click', function() {
        state.thinking = 'all'; state.type = 'all'; state.q = '';
        syncFilterButtons();
        lbRender();
    });
    syncFilterButtons();

    // Citation dialog
    const citeDialog = document.getElementById('lb-cite-dialog');
    const citeButton = document.getElementById('lb-cite');
    const closeCite = function() { citeDialog.hidden = true; citeButton.focus(); };
    citeButton.addEventListener('click', function() {
        citeDialog.hidden = false;
        document.getElementById('lb-cite-copy').focus();
    });
    document.getElementById('lb-cite-close').addEventListener('click', closeCite);
    citeDialog.addEventListener('click', function(event) { if (event.target === citeDialog) closeCite(); });
    document.addEventListener('keydown', function(event) { if (event.key === 'Escape' && !citeDialog.hidden) closeCite(); });
    document.getElementById('lb-cite-copy').addEventListener('click', function() {
        const text = document.getElementById('lb-bibtex').textContent;
        const toast = document.getElementById('lb-cite-toast');
        const done = function(msg) { toast.textContent = msg; setTimeout(function() { toast.textContent = ''; }, 2000); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(function() { done('copied'); }, function() { done('select the text to copy it'); });
        else done('select the text to copy it');
    });

    // Share and export
    document.getElementById('lb-copy').addEventListener('click', function() {
        lbWriteHash();
        const url = location.href;
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(function() { lbToast('link copied'); }, function() { lbToast(url); });
        else lbToast(url);
    });
    // Share menu: link, native share, CSV, PNG of the chart
    const shareBtn = document.getElementById('lb-share'), shareMenu = document.getElementById('lb-share-menu');
    const closeShare = function() { shareMenu.hidden = true; shareBtn.setAttribute('aria-expanded', 'false'); };
    shareBtn.addEventListener('click', function() {
        const open = shareMenu.hidden;
        shareMenu.querySelector('[data-action="share"]').hidden = !navigator.share;
        const png = shareMenu.querySelector('[data-action="png"]');
        png.disabled = !lbChartSvg();
        png.title = png.disabled ? 'Open the Pareto or radar view to download its chart' : '';
        shareMenu.hidden = !open;
        shareBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    shareMenu.addEventListener('click', function(event) {
        const b = event.target.closest('button');
        if (!b || b.disabled) return;
        closeShare();
        lbWriteHash();
        const url = location.href;
        if (b.dataset.action === 'link') {
            if (navigator.clipboard) navigator.clipboard.writeText(url).then(function() { lbToast('link copied'); }, function() { lbToast(url); });
            else lbToast(url);
        } else if (b.dataset.action === 'share') {
            navigator.share({ title: document.title, text: 'τ-Emotion-Bench leaderboard', url: url }).catch(function() {});
        } else if (b.dataset.action === 'csv') {
            lbCsv();
        } else if (b.dataset.action === 'png') {
            lbPng();
        }
    });
    document.addEventListener('click', function(event) {
        if (!shareMenu.hidden && !event.target.closest('#lb-share-menu') && event.target.closest('#lb-share') !== shareBtn) closeShare();
    });
    document.addEventListener('keydown', function(event) { if (event.key === 'Escape') closeShare(); });

    // Charts follow the panel width
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() { if (state.view === 'pareto') lbRenderPareto(); }, 120);
    });
    window.addEventListener('hashchange', function() { lbReadHash(); userSelect.value = state.user; syncFilterButtons(); lbRender(); });

    lbRender();

    // The page shows the paper results until the submissions load, and without them if they can't
    fetch(LB_SUBMISSIONS)
        .then(function(response) { return response.ok ? response.json() : []; })
        .then(function(submissions) {
            if (!submissions.length) return;
            lbAddSubmissions(submissions);
            lbRender();
        })
        .catch(function() {});
});
