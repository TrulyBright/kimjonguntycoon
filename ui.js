// 화면 그리기와 입력 처리. 화면 문구는 모두 I18N을 거친다.
(() => {
  const E = ENGINE, T = I18N;
  const $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const toFx = deltas => Object.fromEntries(deltas.map(d => [d.key, d.delta]));

  let s = null;
  let busy = false;
  let modal = null; // { build, dismissible, resolve }
  let shownStats = [];
  let shownSig = '';
  let currentBackdrop = null;
  let tickerTimer = null;
  let tickerIdx = 0;

  // ---------- 문구 ----------
  const findAction = (stageId, id) => (id === 'rest' ? E.REST : ACTIONS[stageId].find(a => a.id === id));
  const actionText = (stageId, a) => T.action(a.id === 'rest' ? 'common' : stageId, a);
  const currentLine = () => E.pick(T.lines(E.stage(s).id, E.moodKey(s)));

  // 속보 기록은 참조로 저장되어 있어서 그릴 때 현재 언어로 바꾼다(옛 저장분은 문장 그대로)
  function logText(n) {
    if (!n) return '';
    if (n.text) return n.text;
    if (n.k === 'birth') return T.ui('birth');
    if (n.k === 'act') {
      const a = findAction(n.st, n.id);
      if (!a) return '';
      const news = actionText(n.st, a).news;
      return news[n.i % news.length];
    }
    if (n.k === 'ev') {
      const ev = EVENTS.find(e => e.id === n.id);
      if (!ev) return '';
      const t = T.event(ev);
      return `${ev.icon} ${t.title}: ${t.choices[n.c].result}`;
    }
    if (n.k === 'warn') return T.ui('healthWarn', n.r.map(r => T.ui('reason_' + r)).join(T.ui('reasonSep')), n.n);
    return '';
  }

  // ---------- 그리기 ----------
  function applyStatic() {
    document.title = T.ui('title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = T.ui(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', T.ui(el.dataset.i18nAria)));
    $('lang-select').value = T.lang;
    renderMusicButton();
  }

  // 음원 파일이 있을 때만 보인다. 재생 중이면 🔊, 꺼져 있으면 🔇
  function renderMusicButton() {
    const b = $('btn-music');
    b.hidden = !ANTHEM.available;
    b.textContent = (ANTHEM.on ? '🔊 ' : '🔇 ') + T.ui('musicLabel');
    b.title = T.ui(ANTHEM.on ? 'musicTurnOff' : 'musicTurnOn');
    b.setAttribute('aria-pressed', String(ANTHEM.on));
  }

  function renderAll(opts) {
    renderCalendar(); renderStage(opts); renderStats(); renderActions(); renderNews();
  }

  function renderCalendar() {
    const st = E.stage(s);
    $('stage-chip').textContent = T.stage(st).name;
    $('day-label').innerHTML = T.ui('dayLabel', Math.min(s.day, GAME_DAYS), GAME_DAYS);
    $('day-fill').style.width = (Math.min(s.day - 1, GAME_DAYS) / GAME_DAYS * 100) + '%';
    $('badge-weight').textContent = T.ui('weight', E.formatKg(s));
    $('badge-age').textContent = T.ui('age', E.ageOf(s));
    const m = $('badge-money');
    m.hidden = s.stageIdx < 3;
    m.textContent = T.ui('money', s.money, E.incomeOf(s));
  }

  function renderStage(opts = {}) {
    const st = E.stage(s);
    if (currentBackdrop !== st.id) { $('backdrop').innerHTML = ART.backdrop(st.id); currentBackdrop = st.id; }
    const kim = $('kim');
    kim.classList.toggle('is-baby', st.id === 'baby');
    kim.innerHTML = ART.kim({ stage: st.id, fat: s.fat, expr: opts.expr || E.exprOf(s), pose: opts.pose || 'idle' });
  }

  function renderStats() {
    const keys = E.visibleStats(s);
    const sig = T.lang + '|' + keys.join();
    if (sig !== shownSig) {
      const fresh = shownStats.length ? keys.filter(k => !shownStats.includes(k)) : [];
      const note = s.stageIdx < 2 ? T.ui('lockedEarly') : s.stageIdx < 3 ? T.ui('lockedHeir') : '';
      $('stats').innerHTML = keys.map(k => `
        <div class="stat${fresh.includes(k) ? ' is-new' : ''}" id="stat-${k}" style="--c:${STATS[k].color}">
          <span class="stat-icon" aria-hidden="true">${STATS[k].icon}</span>
          <span class="stat-name">${esc(T.stat(k))}</span>
          <span class="stat-val" id="statv-${k}"></span>
          <div class="stat-bar" id="statb-${k}" role="meter" aria-label="${esc(T.stat(k))}" aria-valuemin="0" aria-valuemax="100"><div class="stat-fill" id="statf-${k}"></div></div>
        </div>`).join('') + (note ? `<p class="stats-note">${esc(note)}</p>` : '');
      shownStats = keys;
      shownSig = sig;
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
    const list = E.actionsFor(s), stId = E.stage(s).id, grid = $('action-grid');
    grid.dataset.n = list.length;
    grid.innerHTML = list.map((a, i) => {
      const why = E.blockReason(s, a);
      return `<button class="act" type="button" data-i="${i}"${why ? ' disabled' : ''} aria-keyshortcuts="${i + 1}">
        <span class="act-key" aria-hidden="true">${i + 1}</span>
        <span class="act-emoji" aria-hidden="true">${a.emoji}</span>
        <span class="act-name">${esc(actionText(stId, a).name)}</span>
        <span class="act-hint">${E.fxText(s, a.fx).join(' ')}</span>
        ${why ? `<span class="act-cost">${esc(T.ui(why === 'money' ? 'blockMoney' : 'blockEnergy'))}</span>` : ''}
      </button>`;
    }).join('');
  }

  function renderNews() {
    $('news-list').innerHTML = s.log.slice(0, 6).map(n =>
      `<li class="${n.warn ? 'warn' : ''}"><span class="news-day">${esc(T.ui('newsDay', n.day))}</span><span>${esc(logText(n))}</span></li>`).join('');
  }

  // ---------- 연출 ----------
  function say(text) {
    const b = $('bubble');
    b.textContent = text;
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
  }

  function setTicker(text) {
    const t = $('ticker-text');
    t.textContent = text;
    t.style.animation = 'none';
    void t.offsetWidth;
    const secs = Math.max(8, t.scrollWidth / 75); // 글자 폭과 상관없이 같은 속도로 흐르게
    t.style.animation = '';
    t.style.animationDuration = secs + 's';
    clearTimeout(tickerTimer);
    tickerTimer = setTimeout(() => {
      const lines = T.ticker();
      setTicker(lines[tickerIdx++ % lines.length]);
    }, secs * 1000);
  }

  function setAnim(name) {
    const k = $('kim');
    k.classList.remove('act-bounce', 'act-shake', 'act-sleep');
    if (name) { void k.offsetWidth; k.classList.add('act-' + name); }
  }

  function spawn(cls, text, style) {
    const el = document.createElement('span');
    el.className = cls;
    el.textContent = text;
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

  // ---------- 모달: 내용을 만드는 함수를 받아 두었다가 언어가 바뀌면 다시 그린다 ----------
  function openModal(build, { dismissible = false } = {}) {
    return new Promise(resolve => {
      modal = { build, dismissible, resolve };
      drawModal();
      $('modal').hidden = false;
      const first = $('modal-actions').querySelector('button');
      if (first) first.focus();
    });
  }

  function closeModal(i) {
    if (!modal) return;
    const m = modal;
    modal = null;
    $('modal').hidden = true;
    m.resolve(i);
  }

  function drawModal() {
    const { art = '', kicker = '', title, body, buttons } = modal.build();
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
      el.addEventListener('click', () => closeModal(i));
      acts.appendChild(el);
    });
  }

  async function showEvent(ev) {
    const idx = await openModal(() => {
      const t = T.event(ev);
      return {
        art: ev.icon, kicker: T.ui('eventKicker'), title: t.title, body: `<p>${esc(t.text)}</p>`,
        buttons: t.choices.map(c => ({ label: c.label })),
      };
    });
    const deltas = E.chooseEvent(s, ev, idx);
    renderAll();
    floatChips(deltas);
    const fx = E.fxText(s, toFx(deltas));
    await openModal(() => {
      const c = T.event(ev).choices[idx];
      return {
        art: ev.icon, kicker: T.ui('resultKicker'), title: c.label,
        body: `<p class="news-quote">${esc(c.result)}</p>${fx.length ? `<p class="fine">${fx.join('  ')}</p>` : ''}`,
        buttons: [{ label: T.ui('ok'), primary: true }],
      };
    });
  }

  async function showEvolution(prevIdx) {
    const st = E.stage(s);
    await openModal(() => {
      const tx = T.stage(st);
      return {
        art: ART.kim({ stage: st.id, fat: s.fat, expr: 'happy' }),
        kicker: `${T.stage(STAGES[prevIdx]).name} → ${tx.name}`, title: T.ui('grewTitle'),
        body: `<p>${esc(tx.intro)}</p>${tx.unlockNote ? `<p><b>${esc(tx.unlockNote)}</b></p>` : ''}`,
        buttons: [{ label: T.ui('keepRaising'), primary: true }],
      };
    });
  }

  function showAlbum() {
    return openModal(() => {
      const seen = E.seenEndings();
      const cards = ENDING_ORDER.map(id => {
        const got = seen.includes(id);
        return `<div class="album-card${got ? '' : ' locked'}"><i>${got ? ENDINGS[id].icon : '🔒'}</i>${esc(got ? T.ending(id).title : T.ui('hint', T.hint(id)))}</div>`;
      }).join('');
      return {
        kicker: T.ui('albumFound', seen.length, ENDING_ORDER.length), title: T.ui('albumTitle'),
        body: `<div class="album">${cards}</div><p class="fine">${esc(T.ui('albumNote'))}</p>`,
        buttons: [{ label: T.ui('close'), primary: true }],
      };
    }, { dismissible: true });
  }

  async function finish(id) {
    s.ending = id;
    E.clearSave();
    E.markEnding(id);
    renderAll();
    say(T.ui(id === 'sulk' ? 'endSaySulk' : id === 'sick' ? 'endSaySick' : 'endSayOther'));
    const en = ENDINGS[id];
    if (en.kind !== 'bad') ANTHEM.replay();
    const lived = Math.min(s.day - 1, GAME_DAYS);
    const choice = await openModal(() => {
      const seen = E.seenEndings(), tx = T.ending(id);
      const rows = [
        [T.ui('sumDays'), T.ui('unitDays', lived)], [T.ui('sumStage'), T.stage(E.stage(s)).name],
        [T.ui('sumMaxKg'), (s.maxKg < 20 ? s.maxKg.toFixed(1) : Math.round(s.maxKg)) + 'kg'], [T.ui('sumHoops'), T.ui('unitTimes', s.counts.hoops)],
        [T.ui('sumMissiles'), T.ui('unitMissiles', s.counts.missiles)], [T.ui('sumSummits'), T.ui('unitTimes', s.counts.summits)],
        [T.ui('sumSmart'), s.smart], [T.ui('sumFound'), `${seen.length} / ${ENDING_ORDER.length}`],
      ];
      return {
        art: en.icon, kicker: T.ui(en.kind === 'bad' ? 'endingBad' : 'endingGood'), title: tx.title,
        body: `<p>${esc(tx.text)}</p><div class="summary">${rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`,
        buttons: [{ label: T.ui('again'), primary: true }, { label: T.ui('seeAlbum') }],
      };
    });
    if (choice === 1) await showAlbum();
    newGame();
  }

  // ---------- 진행 ----------
  async function act(i) {
    if (busy || modal || !s || s.ending) return;
    const a = E.actionsFor(s)[i];
    if (!a || E.blockReason(s, a)) return;
    busy = true;
    const stId = E.stage(s).id;
    const deltas = E.doAction(s, a);
    const expr = a.anim === 'sleep' ? 'sleep' : a.anim === 'shake' ? 'angry' : a.fx.full > 0 ? 'eat' : 'happy';
    renderStage({ expr, pose: a.pose });
    setAnim(a.anim);
    if (a.fly === 'rocket') spawn('fx-rocket', '🚀', {});
    else spawn('fx', a.fly || a.emoji, { left: (38 + Math.random() * 20) + '%', top: '34%' });
    floatChips(deltas);
    say(E.pick(actionText(stId, a).say));
    setTicker(logText(s.log[0]));
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
    say(currentLine());
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
    E.log(s, { k: 'birth' });
    busy = false;
    shownStats = [];
    shownSig = '';
    setAnim(null);
    renderAll();
    say(currentLine());
    setTicker(T.ui('birth'));
    E.save(s);
  }

  async function restart() {
    if (modal || busy) return;
    const i = await openModal(() => ({
      kicker: T.ui('restartKicker'), title: T.ui('restartTitle'), body: `<p>${esc(T.ui('restartBody'))}</p>`,
      buttons: [{ label: T.ui('again'), primary: true }, { label: T.ui('cancel') }],
    }), { dismissible: true });
    if (i === 0) { E.clearSave(); newGame(); }
  }

  function langRow() {
    return `<div class="lang-row" role="group" aria-label="Language">${T.LANGS.map(l =>
      `<button type="button" class="lang-btn" data-lang="${l.id}" aria-pressed="${l.id === T.lang}">${l.label}</button>`).join('')}</div>`;
  }

  async function intro(saved) {
    const i = await openModal(() => ({
      art: ART.kim({ stage: 'baby', expr: 'happy' }),
      kicker: T.ui('eyebrow'),
      title: T.ui('title'),
      body: `${langRow()}<p>${esc(T.ui('introLead'))}</p><ul>${T.ui('introRules').map(r => `<li>${esc(r)}</li>`).join('')}</ul><p class="fine">${esc(T.ui('footer'))}</p>`,
      buttons: saved
        ? [{ label: T.ui('continue'), sub: T.ui('continueSub', saved.day, T.stage(STAGES[saved.stageIdx]).name), primary: true }, { label: T.ui('startOver') }]
        : [{ label: T.ui('start'), primary: true }],
    }));
    if (saved && i === 1) { E.clearSave(); newGame(); }
    ANTHEM.autoStart(); // 시작 버튼을 누른 순간 국가가 울린다
  }

  function setLang(id) {
    T.set(id);
    applyStatic();
    renderAll();
    say(currentLine());
    setTicker(logText(s.log[0]) || T.ticker()[0]);
    if (modal) drawModal();
  }

  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target && e.target.tagName === 'SELECT') return;
    const n = parseInt(e.key, 10);
    if (modal) {
      if (e.key === 'Escape' && modal.dismissible) closeModal(-1);
      else if (n >= 1) {
        const b = $('modal-actions').children[n - 1];
        if (b) { e.preventDefault(); b.click(); }
      }
      return;
    }
    if (n >= 1 && n <= 9) { e.preventDefault(); act(n - 1); }
  }

  function init() {
    T.set(T.detect());
    $('lang-select').innerHTML = T.LANGS.map(l => `<option value="${l.id}">${l.label}</option>`).join('');
    $('lang-select').addEventListener('change', e => setLang(e.target.value));
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
    $('btn-album').addEventListener('click', () => { if (!modal) showAlbum(); });
    $('btn-restart').addEventListener('click', restart);
    $('btn-music').addEventListener('click', () => ANTHEM.toggle());
    ANTHEM.onChange(renderMusicButton);
    $('modal-body').addEventListener('click', e => {
      const b = e.target.closest('[data-lang]');
      if (b) setLang(b.dataset.lang);
    });
    document.addEventListener('keydown', onKey);

    const saved = E.load();
    if (saved) s = saved;
    else { s = E.newState(); E.log(s, { k: 'birth' }); }
    applyStatic();
    renderAll();
    say(currentLine());
    setTicker(logText(s.log[0]) || T.ui('birth'));
    intro(saved);
  }

  init();
})();
