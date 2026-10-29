// 게임 규칙. DOM을 건드리지 않는 순수 로직이라 node에서도 돌릴 수 있다.
const ENGINE = (() => {
  const SAVE_KEY = 'kim-raising-save-v1';
  const SEEN_KEY = 'kim-raising-endings-v1';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // 모든 행동이 막혔을 때(외화·체력 모두 바닥) 내놓는 비상 행동
  const REST = {
    id: 'rest', emoji: '🛌', name: '그냥 쉬기', fx: { energy: 30, mood: -3 }, anim: 'sleep',
    say: ['아무것도 안 하고 싶다우…'],
    news: ['오늘은 공식 일정이 없었습니다. 매우 이례적인 일입니다.'],
  };

  function newState() {
    return {
      v: 1, day: 1, stageIdx: 0,
      full: 70, mood: 70, energy: 80, health: 90,
      auth: 40, people: 60, tension: 30,
      fat: 10, smart: 0, money: 150,
      counts: { hoops: 0, missiles: 0, summits: 0 },
      seenEvents: [], sinceEvent: 0, ending: null, log: [], maxKg: 0,
    };
  }

  const stage = s => STAGES[s.stageIdx];
  const stageIndexOf = day => STAGES.reduce((idx, st, i) => (day >= st.from ? i : idx), 0);
  const isUnlocked = (key, s) => (STATS[key].unlock || 0) <= s.stageIdx;
  const visibleStats = s => Object.keys(STATS).filter(k => isUnlocked(k, s));

  // 단계 안에서의 진행률(0~1 미만)
  function stageProgress(s) {
    const st = stage(s), next = STAGES[s.stageIdx + 1];
    const to = next ? next.from : GAME_DAYS + 1;
    return clamp((Math.min(s.day, GAME_DAYS) - st.from) / (to - st.from), 0, 0.999);
  }
  function ageOf(s) {
    const [a0, a1] = stage(s).ages;
    return Math.floor(a0 + stageProgress(s) * (a1 - a0 + 1));
  }
  function kgOf(s) {
    const [k0, k1] = stage(s).kg;
    const base = k0 + (k1 - k0) * stageProgress(s);
    return base * (1 + s.fat / 100 * (s.stageIdx === 0 ? 0.35 : 0.7));
  }
  // 긴장도가 높을수록 제재 때문에 수입이 준다
  const incomeOf = s => Math.round(5 + 20 * (1 - s.tension / 100));
  const formatKg = s => (s.stageIdx === 0 ? kgOf(s).toFixed(1) : Math.round(kgOf(s))) + 'kg';

  // 효과를 적용하고 실제로 바뀐 양을 돌려준다(상한·하한에 걸리면 줄어든다)
  function applyFx(s, fx) {
    const out = [];
    for (const [k, d] of Object.entries(fx || {})) {
      const before = s[k];
      s[k] = k === 'money' ? Math.max(0, before + d) : clamp(before + d, 0, 100);
      if (s[k] !== before) out.push({ key: k, delta: s[k] - before });
    }
    return out;
  }
  function addCounts(s, count) {
    if (!count) return;
    if (typeof count === 'string') s.counts[count] = (s.counts[count] || 0) + 1;
    else for (const [k, n] of Object.entries(count)) s.counts[k] = (s.counts[k] || 0) + n;
  }

  function blockReason(s, a) {
    if (a.fx.money < 0 && s.money < -a.fx.money) return 'money';
    if (a.fx.energy < 0 && s.energy < -a.fx.energy) return 'energy';
    return null;
  }
  function actionsFor(s) {
    const list = ACTIONS[stage(s).id];
    return list.every(a => blockReason(s, a)) ? [...list, REST] : list;
  }

  function doAction(s, a) {
    const deltas = applyFx(s, a.fx);
    addCounts(s, a.count);
    // 문장 대신 참조를 남겨서 언어를 바꿔도 지난 속보가 함께 번역되게 한다
    log(s, { k: 'act', st: stage(s).id, id: a.id, i: Math.floor(Math.random() * a.news.length) });
    return deltas;
  }

  // 하루 마감: 자연 감소, 건강 판정, 외화 수입, 날짜·단계 진행
  function endTurn(s) {
    const st = stage(s);
    applyFx(s, st.decay);
    const reasons = [];
    let loss = 0;
    if (s.full <= 15) { loss += 10; reasons.push('hunger'); s.mood = clamp(s.mood - 4, 0, 100); }
    if (s.energy <= 10) { loss += 7; reasons.push('overwork'); }
    if (s.fat >= 70) { loss += 4; reasons.push('weight'); }
    if (s.mood <= 15) { loss += 3; reasons.push('stress'); }
    if (loss) {
      s.health = clamp(s.health - loss, 0, 100);
      log(s, { k: 'warn', r: reasons, n: loss }, true);
    } else if (s.full >= 40 && s.energy >= 30) {
      s.health = clamp(s.health + 3, 0, 100);
    }
    if (s.full >= 95) s.fat = clamp(s.fat + 2, 0, 100);
    else s.fat = clamp(s.fat - 1, 0, 100);
    let income = 0;
    if (s.stageIdx === 3) {
      income = incomeOf(s);
      s.money += income;
    }
    s.maxKg = Math.max(s.maxKg, kgOf(s));
    s.day += 1;
    const ni = stageIndexOf(Math.min(s.day, GAME_DAYS));
    const evolved = ni !== s.stageIdx;
    s.stageIdx = ni;
    return { evolved, income };
  }

  function failEnding(s) {
    if (s.health <= 0) return 'sick';
    if (s.mood <= 0) return 'sulk';
    if (s.stageIdx >= 3 && s.tension >= 100) return 'isolated';
    if (s.stageIdx >= 3 && s.people <= 0) return 'exile';
    if (s.stageIdx >= 2 && s.auth <= 0) return 'noclap';
    return null;
  }
  function finalEnding(s) {
    const c = s.counts;
    if (s.tension <= 30 && s.people >= 65 && c.summits >= 3) return 'peace';
    if (c.missiles >= 5 && s.auth >= 60) return 'rocket';
    if (c.hoops >= 12) return 'coach';
    if (s.fat >= 70) return 'cheese';
    if (s.smart >= 60) return 'scholar';
    if (s.auth >= 75) return 'eternal';
    return 'normal';
  }
  const isFinished = s => s.day > GAME_DAYS;

  // 사건은 이틀째부터, 오래 안 일어날수록 확률이 오른다. 한 판에 같은 사건은 한 번만.
  function pickEvent(s) {
    if (s.day <= 2) return null;
    const chance = Math.min(0.75, 0.22 + 0.12 * s.sinceEvent);
    const pool = EVENTS.filter(e => e.stage.includes(stage(s).id) && !s.seenEvents.includes(e.id) && (!e.when || e.when(s)));
    if (!pool.length || Math.random() > chance) { s.sinceEvent += 1; return null; }
    const ev = pick(pool);
    s.seenEvents.push(ev.id);
    s.sinceEvent = 0;
    return ev;
  }
  function chooseEvent(s, ev, idx) {
    const c = ev.choices[idx];
    const deltas = applyFx(s, c.fx);
    addCounts(s, c.count);
    log(s, { k: 'ev', id: ev.id, c: idx });
    return deltas;
  }

  function moodKey(s) {
    if (s.health <= 30) return 'sick';
    if (s.full <= 25) return 'hungry';
    if (s.energy <= 20) return 'tired';
    if (s.mood <= 30) return 'sad';
    if (s.mood >= 70) return 'happy';
    return 'normal';
  }
  function exprOf(s) {
    const k = moodKey(s);
    if (k === 'tired') return 'sad';
    if (k === 'sad') return s.mood <= 15 ? 'angry' : 'sad';
    return k;
  }

  // 효과 표기: 아직 안 보이는 지표는 숨긴다
  function fxText(s, fx) {
    return Object.entries(fx).filter(([k]) => {
      if (STATS[k]) return isUnlocked(k, s);
      return k !== 'money' || s.stageIdx >= 3;
    }).map(([k, d]) => (STATS[k] ? STATS[k].icon : EXTRA_ICONS[k]) + (d > 0 ? '+' : '−') + Math.abs(d));
  }

  function log(s, entry, warn = false) {
    s.log.unshift({ day: Math.min(s.day, GAME_DAYS), warn, ...entry });
    if (s.log.length > 30) s.log.length = 30;
  }

  function save(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* 저장 불가 환경 */ } }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      return s && s.v === 1 && !s.ending ? s : null;
    } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ } }
  function seenEndings() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch (e) { return []; }
  }
  function markEnding(id) {
    const list = seenEndings();
    if (!list.includes(id)) list.push(id);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(list)); } catch (e) { /* 무시 */ }
    return list;
  }

  return {
    newState, stage, isUnlocked, visibleStats, ageOf, kgOf, formatKg, incomeOf, applyFx, blockReason, actionsFor,
    doAction, endTurn, failEnding, finalEnding, isFinished, pickEvent, chooseEvent,
    exprOf, moodKey, fxText, log, REST, save, load, clearSave, seenEndings, markEnding, pick,
  };
})();
