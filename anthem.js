// 배경음악: 저장소 루트에 올린 anthem.* 음원 파일을 반복 재생한다. 파일이 없으면 국가 버튼을 숨긴다.
// 브라우저는 사용자가 누른 다음에만 소리를 허락하므로, 시작 버튼을 누를 때 재생을 시작한다.
const ANTHEM = (() => {
  const CANDIDATES = ['anthem.mp3', 'anthem.m4a', 'anthem.ogg', 'anthem.opus', 'anthem.webm', 'anthem.wav'];
  const START_SEC = 8; // 영상 음원을 그대로 넣으면 앞 8초를 건너뛴다. 잘라 낸 파일이면 0으로 바꾼다.
  const KEY = 'kim-raising-bgm';
  const audio = new Audio();
  const listeners = [];
  let src = null;
  let on = false;
  let resumeOnShow = false;
  audio.preload = 'auto';
  audio.volume = 0.5;

  const notify = () => listeners.forEach(fn => fn());
  const wanted = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } };
  const remember = v => { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) { /* 저장소 없음 */ } };

  // 어떤 확장자로 올렸는지 확인한다. 없는 파일에 index.html을 돌려주는 호스팅(SPA 대체 응답)도 걸러 낸다.
  const isAudio = f => fetch(f, { method: 'HEAD', cache: 'no-store' })
    .then(r => r.ok && !/text\/html/.test(r.headers.get('content-type') || ''), () => false);
  const ready = CANDIDATES
    .reduce((p, f) => p.then(found => found || isAudio(f).then(ok => (ok ? f : null))), Promise.resolve(null))
    .then(found => {
      src = found;
      if (src) audio.src = src;
      notify();
    });

  function start(fromTop) {
    if (!src) return;
    if (fromTop || audio.currentTime < START_SEC) audio.currentTime = START_SEC;
    on = true;
    notify();
    audio.play().catch(() => { on = false; notify(); });
  }

  function stop() {
    audio.pause();
    on = false;
    resumeOnShow = false;
    notify();
  }

  audio.addEventListener('ended', () => { // 끝나면 다시 처음(8초)부터
    audio.currentTime = START_SEC;
    audio.play().catch(() => {});
  });
  audio.addEventListener('error', () => { // 재생할 수 없는 파일이면 버튼을 숨긴다
    src = null;
    stop();
  });
  document.addEventListener('visibilitychange', () => { // 다른 탭에 가 있는 동안은 멈춘다
    if (document.hidden && on) { resumeOnShow = true; audio.pause(); }
    else if (!document.hidden && resumeOnShow) { resumeOnShow = false; audio.play().catch(() => {}); }
  });

  return {
    get on() { return on; },
    get available() { return !!src; },
    autoStart() { if (wanted()) ready.then(() => start(true)); },
    replay() { if (on) start(true); },
    toggle() {
      if (on) { stop(); remember(false); }
      else { remember(true); start(false); }
    },
    onChange(fn) { listeners.push(fn); },
  };
})();
