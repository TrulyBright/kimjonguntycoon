// 화면 그리기와 입력 처리
(() => {
  const E = ENGINE;
  const $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const toFx = deltas => Object.fromEntries(deltas.map(d => [d.key, d.delta]));
  const BIRTH_LINE = '인민 여러분, 백두산 정기를 받은 아기가 태어났습니다! (선전부 발표)';
  const ENDING_HINTS = {
    peace: '긴장은 낮게, 민심은 높게, 회담은 여러 번', rocket: '미사일을 아주 많이. 그래도 위엄은 지켜야',
    coach: '공을 정말 사랑한다면', cheese: '치즈를 정말 사랑한다면', scholar: '유학 시절에 공부를',
    eternal: '위엄을 하늘 끝까지', normal: '무난하게 70일', sick: '건강이 0', sulk: '기분이 0',
    isolated: '국제 긴장도 100', exile: '민심 0', noclap: '위엄 0',
  };

  let s = null;
  let busy = false;
  let modalOpen = false;
  let modalDismiss = null;
  let shownStats = [];
  let currentBackdrop = null;
  let tickerTimer = null;
  let tickerIdx = 0;

  // ---------- 그리기 ----------
  function renderAll(opts) {
    renderCalendar(); renderStage(opts); renderStats(); renderActions(); renderNews();
  }

  function renderCalendar() {
    const st = E.stage(s);
    $('stage-chip').textContent = st.name;
    $('day-num').textContent = Math.min(s.day, GAME_DAYS);
    $('day-fill').style.width = (Math.min(s.day - 1, GAME_DAYS) / GAME_DAYS * 100) + '%';
    $('badge-weight').textContent = '체중 ' + E.formatKg(s);
    $('badge-age').textContent = E.ageOf(s) + '살';
    const m = $('badge-money');
    m.hidden = s.stageIdx < 3;
    m.textContent = `외화 $${s.money} · 하루 +$${E.incomeOf(s)}`;
  }

  function renderStage(opts = {}) {
    const st = E.stage(s);
    if (currentBackdrop !== st.id) { $('backdrop').innerHTML = ART.backdrop(st.id); currentBackdrop = st.id; }
    const kim = $('kim');
    kim.classList.toggle('is-baby', st.id === 'baby');
    kim.innerHTML = ART.kim({ stage: st.id, fat: s.fat, expr: opts.expr || E.exprOf(s), pose: opts.pose || 'idle' });
  }

  function lockedNote() {
    if (s.stageIdx < 2) return '청년대장이 되면 👑 위엄, 위원장이 되면 🌾 민심 · 🚀 국제 긴장도 · 💵 외화가 열립니다.';
    if (s.stageIdx < 3) return '위원장이 되면 🌾 민심 · 🚀 국제 긴장도 · 💵 외화가 열립니다.';
    return '';
  }

  function renderStats() {
    const keys = E.visibleStats(s);
    const wrap = $('stats');
    if (keys.join() !== shownStats.join()) {
      const fresh = shownStats.length ? keys.filter(k => !shownStats.includes(k)) : [];
      const note = lockedNote();
      wrap.innerHTML = keys.map(k => `
        <div class="stat${fresh.includes(k) ? ' is-new' : ''}" id="stat-${k}" style="--c:${STATS[k].color}">
          <span class="stat-icon" aria-hidden="true">${STATS[k].icon}</span>
          <span class="stat-name">${STATS[k].name}</span>
          <span class="stat-val" id="statv-${k}"></span>
          <div class="stat-bar" id="statb-${k}" role="meter" aria-label="${STATS[k].name}" aria-valuemin="0" aria-valuemax="100"><div class="stat-fill" id="statf-${k}"></div></div>
        </div>`).join('') + (note ? `<p class="stats-note">${note}</p>` : '');
      shownStats = keys;
    }
    keys.forEach(k => {
      const v = s[k];
      $('statv-' + k).textContent = v;
      $('statf-' + k).style.width = v + '%';
      $('statb-' + k).setAttribute('aria-valuenow', v);
      $('stat-' + k).classList.toggle('is-danger', STATS[k].danger(v));
    });
  }

  function renderActions() {
    const list = E.actionsFor(s);
    $('action-grid').dataset.n = list.length;
    $('action-grid').innerHTML = list.map((a, i) => {
      const why = E.blockReason(s, a);
      return `<button class="act" type="button" data-i="${i}"${why ? ' disabled' : ''} aria-keyshortcuts="${i + 1}">
        <span class="act-key" aria-hidden="true">${i + 1}</span>
        <span class="act-emoji" aria-hidden="true">${a.emoji}</span>
        <span class="act-name">${esc(a.name)}</span>
        <span class="act-hint">${E.fxText(s, a.fx).join(' ')}</span>
        ${why ? `<span class="act-cost">${why}</span>` : ''}
      </button>`;
    }).join('');
  }

  function renderNews() {
    $('news-list').innerHTML = s.log.slice(0, 6).map(n =>
      `<li class="${n.warn ? 'warn' : ''}"><span class="news-day">${n.day}일째</span><span>${esc(n.text)}</span></li>`).join('');
  }

  // ---------- 연출 ----------
  function say(text) {
    const b = $('bubble');
    b.textContent = text;
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  }

  function setTicker(text) {
    const t = $('ticker-text');
    const secs = Math.max(10, text.length * 0.3);
    t.textContent = text;
    t.style.animation = 'none'; void t.offsetWidth;
    t.style.animation = '';
    t.style.animationDuration = secs + 's';
    clearTimeout(tickerTimer);
    tickerTimer = setTimeout(() => setTicker(TICKER_LINES[tickerIdx++ % TICKER_LINES.length]), secs * 1000);
  }

  function setAnim(name) {
    const k = $('kim');
    k.classList.remove('act-bounce', 'act-shake', 'act-sleep');
    if (name) { void k.offsetWidth; k.classList.add('act-' + name); }
  }

  function spawn(cls, text, style) {
    const el = document.createElement('span');
    el.className = cls; el.textContent = text;
    Object.assign(el.style, style);
    $('fx-layer').appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }

  function floatChips(deltas) {
    const bad = d => (d.key === 'tension' || d.key === 'fat') ? d.delta > 0 : d.delta < 0;
    deltas.filter(d => E.fxText(s, { [d.key]: d.delta }).length).forEach((d, i) => {
      spawn('fx-chip' + (bad(d) ? ' neg' : ''), E.fxText(s, { [d.key]: d.delta })[0],
        { left: (6 + (i % 3) * 22) + '%', top: (50 + Math.floor(i / 3) * 11) + '%', animationDelay: (i * 0.08) + 's' });
    });
  }

  // ---------- 모달 ----------
  function openModal({ art = '', kicker = '', title, body, buttons, dismissible = false }) {
    return new Promise(resolve => {
      const done = i => { $('modal').hidden = true; modalOpen = false; modalDismiss = null; resolve(i); };
      $('modal-art').innerHTML = art;
      $('modal-kicker').textContent = kicker;
      $('modal-title').textContent = title;
      $('modal-body').innerHTML = body;
      const acts = $('modal-actions');
      acts.innerHTML = '';
      buttons.forEach((b, i) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'choice' + (b.primary ? ' primary' : '');
        el.innerHTML = `<b>${esc(b.label)}</b>` + (b.sub ? `<span>${esc(b.sub)}</span>` : '');
        el.addEventListener('click', () => done(i));
        acts.appendChild(el);
      });
      modalDismiss = dismissible ? () => done(-1) : null;
      $('modal').hidden = false;
      modalOpen = true;
      acts.querySelector('button').focus();
    });
  }

  async function showEvent(ev) {
    const idx = await openModal({
      art: ev.icon, kicker: '돌발 사건', title: ev.title, body: `<p>${esc(ev.text)}</p>`,
      buttons: ev.choices.map(c => ({ label: c.label })),
    });
    const deltas = E.chooseEvent(s, ev, idx);
    renderAll();
    floatChips(deltas);
    const fx = E.fxText(s, toFx(deltas));
    await openModal({
      art: ev.icon, kicker: '그 결과', title: ev.choices[idx].label,
      body: `<p class="news-quote">${esc(ev.choices[idx].result)}</p>${fx.length ? `<p class="fine">${fx.join('  ')}</p>` : ''}`,
      buttons: [{ label: '확인', primary: true }],
    });
  }

  async function showEvolution(prevIdx) {
    const st = E.stage(s);
    await openModal({
      art: ART.kim({ stage: st.id, fat: s.fat, expr: 'happy' }),
      kicker: `${STAGES[prevIdx].name} → ${st.name}`, title: '정은이가 자랐다!',
      body: `<p>${esc(st.intro)}</p>${st.unlockNote ? `<p><b>${esc(st.unlockNote)}</b></p>` : ''}`,
      buttons: [{ label: '계속 키우기', primary: true }],
    });
  }

  function showAlbum() {
    const seen = E.seenEndings();
    const cards = ENDING_ORDER.map(id => {
      const en = ENDINGS[id], got = seen.includes(id);
      return `<div class="album-card${got ? '' : ' locked'}"><i>${got ? en.icon : '🔒'}</i>${got ? esc(en.title) : '힌트: ' + esc(ENDING_HINTS[id])}</div>`;
    }).join('');
    return openModal({
      kicker: `${seen.length} / ${ENDING_ORDER.length} 발견`, title: '엔딩 도감',
      body: `<div class="album">${cards}</div><p class="fine">엔딩 기록은 이 브라우저에만 저장됩니다.</p>`,
      buttons: [{ label: '닫기', primary: true }], dismissible: true,
    });
  }

  async function finish(id) {
    s.ending = id;
    E.clearSave();
    const seen = E.markEnding(id);
    renderAll();
    say(id === 'sulk' ? '흥!' : id === 'sick' ? '콜록…' : '……');
    const en = ENDINGS[id];
    const lived = Math.min(s.day - 1, GAME_DAYS);
    const rows = [
      ['버틴 날', lived + '일'], ['마지막 모습', E.stage(s).name],
      ['최고 체중', (s.maxKg < 20 ? s.maxKg.toFixed(1) : Math.round(s.maxKg)) + 'kg'], ['농구', s.counts.hoops + '회'],
      ['미사일', s.counts.missiles + '발'], ['정상회담', s.counts.summits + '회'],
      ['지식', s.smart], ['찾은 엔딩', `${seen.length} / ${ENDING_ORDER.length}`],
    ];
    const choice = await openModal({
      art: en.icon, kicker: en.kind === 'bad' ? 'BAD ENDING' : 'ENDING', title: en.title,
      body: `<p>${esc(en.text)}</p><div class="summary">${rows.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>`,
      buttons: [{ label: '다시 키우기', primary: true }, { label: '엔딩 도감 보기' }],
    });
    if (choice === 1) await showAlbum();
    newGame();
  }

  // ---------- 진행 ----------
  async function act(i) {
    if (busy || modalOpen || !s || s.ending) return;
    const a = E.actionsFor(s)[i];
    if (!a || E.blockReason(s, a)) return;
    busy = true;
    const deltas = E.doAction(s, a);
    const expr = a.anim === 'sleep' ? 'sleep' : a.anim === 'shake' ? 'angry' : a.fx.full > 0 ? 'eat' : 'happy';
    renderStage({ expr, pose: a.pose });
    setAnim(a.anim);
    if (a.fly === 'rocket') spawn('fx-rocket', '🚀', {});
    else spawn('fx', a.fly || a.emoji, { left: (38 + Math.random() * 20) + '%', top: '34%' });
    floatChips(deltas);
    say(E.pick(a.say));
    setTicker(s.log[0].text);
    $('stage').classList.toggle('is-night', a.anim === 'sleep');
    renderStats(); renderCalendar(); renderNews();
    await wait(1150);

    $('stage').classList.remove('is-night');
    const prevIdx = s.stageIdx;
    const { evolved } = E.endTurn(s);
    let end = E.failEnding(s) || (E.isFinished(s) ? E.finalEnding(s) : null);
    if (end) return finish(end);
    setAnim(null);
    renderAll();
    say(E.lineOf(s));
    if (evolved) await showEvolution(prevIdx);
    else {
      const ev = E.pickEvent(s);
      if (ev) await showEvent(ev);
    }
    end = E.failEnding(s);
    if (end) return finish(end);
    E.save(s);
    busy = false;
    renderAll();
  }

  function newGame() {
    s = E.newState();
    E.log(s, BIRTH_LINE);
    busy = false;
    shownStats = [];
    setAnim(null);
    renderAll();
    say(E.lineOf(s));
    setTicker(BIRTH_LINE);
    E.save(s);
  }

  async function restart() {
    if (modalOpen || busy) return;
    const i = await openModal({
      kicker: '처음부터', title: '정은이를 다시 키울까요?',
      body: '<p>지금까지 키운 기록은 사라집니다. 엔딩 도감은 그대로 남습니다.</p>',
      buttons: [{ label: '다시 키우기', primary: true }, { label: '취소' }], dismissible: true,
    });
    if (i === 0) { E.clearSave(); newGame(); }
  }

  async function intro(saved) {
    const body = `<p>당신은 정은이의 양육을 맡은 담당 동무입니다. 70일 동안 잘 먹이고 잘 재우고 잘 놀아 주며 위대한(?) 영도자로 키워 내십시오.</p>
      <ul><li>일정을 하나 고를 때마다 하루가 지나갑니다.</li><li>건강이나 기분이 0이 되면 그대로 끝납니다.</li><li>자랄수록 새 지표와 일정이 열립니다. 엔딩은 모두 12가지입니다.</li></ul>
      <p class="fine">이 게임은 정치 풍자 패러디입니다. 사건과 대사는 대부분 지어낸 것이며, 일부 실제 보도를 과장했습니다.</p>`;
    const buttons = saved
      ? [{ label: '이어서 키우기', sub: `${saved.day}일째 · ${STAGES[saved.stageIdx].name}`, primary: true }, { label: '처음부터 키우기' }]
      : [{ label: '키우기 시작', primary: true }];
    const i = await openModal({ art: ART.kim({ stage: 'baby', expr: 'happy' }), kicker: '최고존엄 육성 시뮬레이션', title: '김정은 키우기', body, buttons });
    if (saved && i === 1) { E.clearSave(); newGame(); }
  }

  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const n = parseInt(e.key, 10);
    if (modalOpen) {
      if (e.key === 'Escape' && modalDismiss) modalDismiss();
      else if (n >= 1) {
        const b = $('modal-actions').children[n - 1];
        if (b) { e.preventDefault(); b.click(); }
      }
      return;
    }
    if (n >= 1 && n <= 9) { e.preventDefault(); act(n - 1); }
  }

  function init() {
    const track = $('day-track');
    STAGES.slice(1).forEach(st => {
      const m = document.createElement('span');
      m.className = 'day-mark';
      m.style.left = ((st.from - 1) / GAME_DAYS * 100) + '%';
      track.appendChild(m);
    });
    $('action-grid').addEventListener('click', e => {
      const b = e.target.closest('.act');
      if (b && !b.disabled) act(Number(b.dataset.i));
    });
    $('btn-album').addEventListener('click', () => { if (!modalOpen) showAlbum(); });
    $('btn-restart').addEventListener('click', restart);
    document.addEventListener('keydown', onKey);

    const saved = E.load();
    if (saved) s = saved;
    else { s = E.newState(); E.log(s, BIRTH_LINE); }
    renderAll();
    say(E.lineOf(s));
    setTicker(s.log[0] ? s.log[0].text : BIRTH_LINE);
    intro(saved);
  }

  init();
})();
