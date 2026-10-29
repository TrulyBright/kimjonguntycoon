// 다국어 지원. 한국어 원문은 data.js·events.js에 그대로 두고, 다른 언어는 lang-*.js가 덮어쓴다.
// 번역에 없는 문구는 한국어 원문으로 대체된다.
const I18N = (() => {
  const LANGS = [
    { id: 'ko', label: '한국어', html: 'ko' },
    { id: 'en', label: 'English', html: 'en' },
    { id: 'zh', label: '简体中文', html: 'zh-CN' },
    { id: 'ja', label: '日本語', html: 'ja' },
  ];
  // 언어별 글꼴은 그 언어를 고를 때만 불러온다(한국어 글꼴은 index.html에서 바로 불러옴)
  const FONT_URLS = {
    en: 'https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Sans:wght@400;500;700&family=IBM+Plex+Serif:wght@400;700&display=swap',
    zh: 'https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;700&display=swap',
    ja: 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@400;700&display=swap',
  };
  const KEY = 'kim-raising-lang';
  const dicts = {};
  let lang = 'ko';

  const isLang = id => LANGS.some(l => l.id === id);
  function merge(dst, src) {
    for (const [k, v] of Object.entries(src)) {
      dst[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(dst[k] || {}, v) : v;
    }
    return dst;
  }
  function add(id, part) { dicts[id] = merge(dicts[id] || {}, part); }

  // 우선순위: 주소의 #en 같은 표시 > 저장된 선택 > 브라우저 언어 > 영어
  function detect() {
    const hash = location.hash.slice(1);
    if (isLang(hash)) return hash;
    try {
      const saved = localStorage.getItem(KEY);
      if (isLang(saved)) return saved;
    } catch (e) { /* 저장소 없음 */ }
    for (const n of navigator.languages || [navigator.language || '']) {
      const p = String(n).slice(0, 2).toLowerCase();
      if (isLang(p)) return p;
    }
    return 'en';
  }

  function set(id) {
    lang = isLang(id) ? id : 'ko';
    try { localStorage.setItem(KEY, lang); } catch (e) { /* 저장소 없음 */ }
    if (isLang(location.hash.slice(1)) && location.hash.slice(1) !== lang) {
      try { history.replaceState(null, '', '#' + lang); } catch (e) { /* 무시 */ }
    }
    document.documentElement.lang = LANGS.find(l => l.id === lang).html;
    const url = FONT_URLS[lang];
    if (url && !document.querySelector(`link[data-font="${lang}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.dataset.font = lang;
      document.head.appendChild(link);
    }
  }

  const cur = () => dicts[lang] || {};
  function ui(key, ...args) {
    let v = cur().ui && cur().ui[key];
    if (v === undefined) v = dicts.ko.ui[key];
    if (v === undefined) return key;
    return typeof v === 'function' ? v(...args) : v;
  }
  const stat = k => (cur().stats && cur().stats[k]) || STATS[k].name;
  function stage(st) {
    const o = (cur().stages && cur().stages[st.id]) || {};
    return { name: o.name || st.name, intro: o.intro || st.intro, unlockNote: o.unlockNote || st.unlockNote };
  }
  function action(group, a) {
    const o = (cur().actions && cur().actions[group] && cur().actions[group][a.id]) || {};
    return { name: o.name || a.name, say: o.say || a.say, news: o.news || a.news };
  }
  const lines = (stageId, mood) => (cur().lines && cur().lines[stageId] && cur().lines[stageId][mood]) || LINES[stageId][mood];
  const ticker = () => cur().ticker || TICKER_LINES;
  function event(ev) {
    const o = (cur().events && cur().events[ev.id]) || null;
    return {
      title: (o && o.title) || ev.title,
      text: (o && o.text) || ev.text,
      choices: ev.choices.map((c, i) => ({
        label: (o && o.choices[i] && o.choices[i][0]) || c.label,
        result: (o && o.choices[i] && o.choices[i][1]) || c.result,
      })),
    };
  }
  function ending(id) {
    const o = cur().endings && cur().endings[id];
    return { title: (o && o[0]) || ENDINGS[id].title, text: (o && o[1]) || ENDINGS[id].text };
  }
  const hint = id => (cur().hints && cur().hints[id]) || dicts.ko.hints[id];

  return {
    LANGS, dicts, add, detect, set, get lang() { return lang; },
    ui, stat, stage, action, lines, ticker, event, ending, hint,
  };
})();

I18N.add('ko', {
  ui: {
    title: '김정은 키우기',
    eyebrow: '최고존엄 육성 시뮬레이션',
    album: '엔딩 도감',
    restart: '처음부터',
    langLabel: '언어',
    musicLabel: '음악',
    musicTurnOff: '음악 끄기',
    musicTurnOn: '음악 켜기',
    githubLink: 'GitHub 저장소 열기',
    ariaProgress: '진행 상황',
    ariaStage: '정은이',
    ariaStats: '상태 지표',
    ariaActions: '오늘의 일정',
    ariaNews: '인민 속보',
    breaking: '속보',
    scheduleTitle: '오늘의 일정',
    scheduleHint: '일정 하나를 고르면 하루가 지나갑니다 · 숫자키 1–8',
    newsTitle: '인민 속보',
    footer: '이 게임은 정치 풍자 패러디입니다. 등장하는 사건과 대사는 대부분 지어낸 것이며, 일부 실제 보도를 과장했습니다.',
    dayLabel: (d, max) => `<b>${d}</b>일째 <small>/ ${max}일</small>`,
    newsDay: d => `${d}일째`,
    weight: kg => `체중 ${kg}`,
    age: n => `${n}살`,
    money: (m, inc) => `외화 $${m} · 하루 +$${inc}`,
    lockedEarly: '청년대장이 되면 👑 위엄, 위원장이 되면 🌾 민심 · 🚀 국제 긴장도 · 💵 외화가 열립니다.',
    lockedHeir: '위원장이 되면 🌾 민심 · 🚀 국제 긴장도 · 💵 외화가 열립니다.',
    blockMoney: '외화 부족',
    blockEnergy: '체력 부족',
    birth: '인민 여러분, 백두산 정기를 받은 아기가 태어났습니다! (선전부 발표)',
    healthWarn: (r, n) => `⚠️ ${r} 때문에 건강이 나빠졌다. (❤️−${n})`,
    reason_hunger: '배고픔',
    reason_overwork: '과로',
    reason_weight: '불어난 체중',
    reason_stress: '스트레스',
    reasonSep: '·',
    eventKicker: '돌발 사건',
    resultKicker: '그 결과',
    ok: '확인',
    grewTitle: '정은이가 자랐다!',
    keepRaising: '계속 키우기',
    albumTitle: '엔딩 도감',
    albumFound: (n, t) => `${n} / ${t} 발견`,
    albumNote: '엔딩 기록은 이 브라우저에만 저장됩니다.',
    close: '닫기',
    hint: h => `힌트: ${h}`,
    endingBad: 'BAD ENDING',
    endingGood: 'ENDING',
    sumDays: '버틴 날',
    sumStage: '마지막 모습',
    sumMaxKg: '최고 체중',
    sumHoops: '농구',
    sumMissiles: '미사일',
    sumSummits: '정상회담',
    sumSmart: '지식',
    sumFound: '찾은 엔딩',
    unitDays: n => `${n}일`,
    unitTimes: n => `${n}회`,
    unitMissiles: n => `${n}발`,
    again: '다시 키우기',
    seeAlbum: '엔딩 도감 보기',
    restartKicker: '처음부터',
    restartTitle: '정은이를 다시 키울까요?',
    restartBody: '지금까지 키운 기록은 사라집니다. 엔딩 도감은 그대로 남습니다.',
    cancel: '취소',
    introLead: '당신은 정은이의 양육을 맡은 담당 동무입니다. 70일 동안 잘 먹이고 잘 재우고 잘 놀아 주며 위대한(?) 영도자로 키워 내십시오.',
    introRules: ['일정을 하나 고를 때마다 하루가 지나갑니다.', '건강이나 기분이 0이 되면 그대로 끝납니다.', '자랄수록 새 지표와 일정이 열립니다. 엔딩은 모두 12가지입니다.'],
    continue: '이어서 키우기',
    continueSub: (d, st) => `${d}일째 · ${st}`,
    startOver: '처음부터 키우기',
    start: '키우기 시작',
    endSaySulk: '흥!',
    endSaySick: '콜록…',
    endSayOther: '……',
  },
  hints: {
    peace: '긴장은 낮게, 민심은 높게, 회담은 여러 번', rocket: '미사일을 아주 많이. 그래도 위엄은 지켜야',
    coach: '공을 정말 사랑한다면', cheese: '치즈를 정말 사랑한다면', scholar: '유학 시절에 공부를',
    eternal: '위엄을 하늘 끝까지', normal: '무난하게 70일', sick: '건강이 0', sulk: '기분이 0',
    isolated: '국제 긴장도 100', exile: '민심 0', noclap: '위엄 0',
  },
});
