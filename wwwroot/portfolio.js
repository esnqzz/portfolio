window.initPortfolio = function (userId) {

    // ── Splash screen ──────────────────────────────
    const splash = document.getElementById('splash');
    const main   = document.getElementById('main-content');

    setTimeout(() => {
        splash.classList.add('hide');
        main.classList.remove('hidden');
        main.classList.add('visible');

        // Kart reveal başlat
        initCards();
        fetchREST();
    }, 1800);

    // ── Card scroll reveal ─────────────────────────
    function initCards() {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const cards = [...document.querySelectorAll('.card')];
                    const idx   = cards.indexOf(entry.target);
                    setTimeout(() => entry.target.classList.add('vis'), idx * 65);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        document.querySelectorAll('.card').forEach(el => obs.observe(el));
    }

    // ── Lanyard ────────────────────────────────────
    const SC = { online:'#23a55a', idle:'#f0b232', dnd:'#f23f43', offline:'#4e5058' };
    const SL = { online:'online', idle:'idle', dnd:'dnd', offline:'offline' };

    function updatePresence(data) {
        const ring   = document.getElementById('status-ring');
        const dot    = document.getElementById('sdot');
        const label  = document.getElementById('slabel');
        const avatar = document.getElementById('discord-avatar');
        const actRow = document.getElementById('act-row');
        const actTxt = document.getElementById('act-text');
        const nameEl = document.getElementById('dname');

        const status = data.discord_status || 'offline';
        if (ring)  ring.style.background = SC[status];
        if (dot)   dot.style.background  = SC[status];
        if (label) label.textContent     = SL[status];

        if (avatar && data.discord_user?.avatar) {
            const u = data.discord_user;
            avatar.src = `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`;
        }

        if (nameEl && data.discord_user) {
            nameEl.textContent = data.discord_user.global_name || data.discord_user.username;
        }

        const act = data.activities?.find(a => a.type === 0);
        if (act && actRow) {
            actRow.style.display = 'flex';
            actTxt.textContent   = act.name + (act.details ? ' · ' + act.details : '');
        } else if (actRow) {
            actRow.style.display = 'none';
        }
    }

    function fetchREST() {
        fetch(`https://api.lanyard.rest/v1/users/${userId}`)
            .then(r => r.json())
            .then(j => { if (j.data) updatePresence(j.data); })
            .catch(() => {});
    }

    setInterval(fetchREST, 30000);

    try {
        const ws = new WebSocket('wss://api.lanyard.rest/socket');
        let hb = null;
        ws.onopen = () => ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }));
        ws.onmessage = e => {
            const msg = JSON.parse(e.data);
            if (msg.op === 1) {
                if (hb) clearInterval(hb);
                hb = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ op: 3 })), msg.d.heartbeat_interval);
            }
            if (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') updatePresence(msg.d);
        };
        ws.onclose = () => hb && clearInterval(hb);
    } catch (e) {}
};
