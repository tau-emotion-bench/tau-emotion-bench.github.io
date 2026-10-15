// Renders LEADERBOARD (from leaderboard-data.js) as a ranked table with one 0-100 bar per agent,
// adding the accepted submissions that the benchmark repo gathers in submissions/leaderboard.json
const LB_SUBMISSIONS = 'https://raw.githubusercontent.com/sahsaeedi/tau-emotion-bench/main/submissions/leaderboard.json';
// Submissions name each user agent by its model; the switch uses these ids
const LB_USER_IDS = { 'qwen3-235b-a22b-instruct-2507': 'qwen', 'glm-5.2': 'glm' };
let lbSort = 'pass1';
let lbUser = LEADERBOARD.userAgents[0].id;

function lbCurrentUser() {
    return LEADERBOARD.userAgents.find(function(u) { return u.id === lbUser; });
}

function lbEscape(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function lbBar(entry) {
    const p1 = Math.max(0, Math.min(100, entry.pass1));
    const p3 = Math.max(0, Math.min(100, entry.pass3));
    return '<div class="lb-track" role="img" aria-label="Pass^1 ' + entry.pass1.toFixed(1) + ', Pass^3 ' +
        entry.pass3.toFixed(1) + ' out of 100"><span class="lb-p1" style="width:' + p1 + '%"></span>' +
        '<span class="lb-p3" style="width:' + p3 + '%"></span></div>';
}

function lbAddSubmissions(submissions) {
    submissions.forEach(function(s) {
        Object.keys(s.results).forEach(function(simulator) {
            const user = LEADERBOARD.userAgents.find(function(u) { return u.id === LB_USER_IDS[simulator]; });
            if (!user) return;
            const r = s.results[simulator];
            user.entries.push({
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
            });
        });
        if (s.submission_date > LEADERBOARD.updated) LEADERBOARD.updated = s.submission_date;
    });
}

function lbMeta() {
    document.getElementById('lb-meta').textContent =
        LEADERBOARD.userAgents[0].entries.length + ' agents · ' + LEADERBOARD.userAgents.length + ' user agents · ' +
        LEADERBOARD.tasks + ' tasks · ' + LEADERBOARD.domains.length + ' domains · ' + LEADERBOARD.trials +
        ' trials · updated ' + LEADERBOARD.updated;
}

function lbRender() {
    const other = lbSort === 'pass1' ? 'pass3' : 'pass1';
    const user = lbCurrentUser();
    const rows = user.entries.slice().sort(function(a, b) {
        return (b[lbSort] - a[lbSort]) || (b[other] - a[other]);
    });

    document.querySelector('#leaderboard tbody').innerHTML = rows.map(function(e, i) {
        const tag = (e.thinking ? '<span class="lb-tag">thinking</span>' : '') +
            (e.custom ? '<span class="lb-tag">custom</span>' : '');
        return '<tr' + (i < 3 ? ' class="lb-top"' : '') + '>' +
            '<td class="num">' + (i + 1) + '</td>' +
            '<td><span class="lb-name">' + lbEscape(e.model) + '</span>' + tag + '</td>' +
            '<td class="company col-company">' + lbEscape(e.provider) + '</td>' +
            '<td class="user col-user">' + lbEscape(user.short || user.name) + '</td>' +
            '<td class="col-perf">' + lbBar(e) + '</td>' +
            '<td class="num' + (lbSort === 'pass1' ? ' sorted' : '') + '">' + e.pass1.toFixed(1) + '</td>' +
            '<td class="num' + (lbSort === 'pass3' ? ' sorted' : '') + '">' + e.pass3.toFixed(1) + '</td>' +
            '</tr>';
    }).join('');

    document.querySelectorAll('#leaderboard th button').forEach(function(button) {
        button.setAttribute('aria-pressed', button.dataset.sort === lbSort ? 'true' : 'false');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    lbMeta();

    // User-agent switch: one ranking per user simulator
    const switcher = document.getElementById('lb-user');
    switcher.innerHTML = LEADERBOARD.userAgents.map(function(u) {
        return '<button type="button" data-user="' + u.id + '" aria-pressed="' + (u.id === lbUser) + '">' +
            lbEscape(u.name) + '</button>';
    }).join('');
    switcher.addEventListener('click', function(event) {
        const button = event.target.closest('button');
        if (!button) return;
        lbUser = button.dataset.user;
        switcher.querySelectorAll('button').forEach(function(b) {
            b.setAttribute('aria-pressed', b === button ? 'true' : 'false');
        });
        lbRender();
    });

    document.querySelectorAll('#leaderboard th button').forEach(function(button) {
        button.addEventListener('click', function() {
            lbSort = button.dataset.sort;
            lbRender();
        });
    });

    lbRender();

    // The page shows the results above until the submissions load, and without them if they can't
    fetch(LB_SUBMISSIONS)
        .then(function(response) { return response.ok ? response.json() : []; })
        .then(function(submissions) {
            if (!submissions.length) return;
            lbAddSubmissions(submissions);
            lbMeta();
            lbRender();
        })
        .catch(function() {});
});
