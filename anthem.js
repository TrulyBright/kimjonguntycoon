// 국가: YouTube 영상을 퍼가기(embed)로 8초부터 재생한다. 파일을 내려받아 다시 올리지 않는다.
// YouTube 퍼가기 정책에 따라 플레이어를 숨기지 않고 200×200px 이상 크기로 보여 준다.
const ANTHEM = (() => {
  const VIDEO_ID = 'VovFaEd-Kp0'; // National Anthem: North Korea - 애국가 (Ian Berwick)
  const START_SEC = 8;
  const listeners = [];
  let on = false;

  const dock = () => document.getElementById('anthem-dock');
  const notify = () => listeners.forEach(fn => fn(on));

  function play(title) {
    const d = dock();
    if (!d) return;
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?start=${START_SEC}&autoplay=1&rel=0&playsinline=1`;
    frame.title = title || 'YouTube';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    d.querySelector('.anthem-frame').replaceChildren(frame);
    d.hidden = false;
    document.body.classList.add('has-dock');
    on = true;
    notify();
  }

  function stop() {
    const d = dock();
    if (!d || !on) return;
    d.querySelector('.anthem-frame').replaceChildren();
    d.hidden = true;
    document.body.classList.remove('has-dock');
    on = false;
    notify();
  }

  return {
    play, stop,
    get on() { return on; },
    onChange(fn) { listeners.push(fn); },
  };
})();
