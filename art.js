// 캐릭터와 배경 SVG. 선전 포스터 느낌을 내려고 큰 도형마다 굵은 외곽선을 쓴다.
const ART = (() => {
  const INK = '#1d1311';
  const SKIN = '#f7d2ae';
  const OUTFIT = {
    baby: { body: '#9fd3f0', sleeve: '#9fd3f0' },
    student: { body: '#d6282f', sleeve: SKIN },
    heir: { body: '#3b4a5c', sleeve: '#3b4a5c' },
    leader: { body: '#25262c', sleeve: '#25262c' },
  };
  let uid = 0;
  const r1 = n => Math.round(n * 10) / 10;

  function star(cx, cy, ro, ri) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? ri : ro;
      const a = Math.PI / 5 * i - Math.PI / 2;
      pts.push(r1(cx + r * Math.cos(a)) + ',' + r1(cy + r * Math.sin(a)));
    }
    return pts.join(' ');
  }

  function arm(x1, y1, x2, y2, color) {
    return `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${INK}" stroke-width="24" stroke-linecap="round"/>`
      + `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${color}" stroke-width="18" stroke-linecap="round"/>`
      + `<circle cx="${r1(x2)}" cy="${r1(y2)}" r="9" fill="${SKIN}" stroke="${INK}" stroke-width="3"/>`;
  }

  // 눈·눈썹·입. ex: 눈 사이 거리의 절반, ey: 눈 높이, my: 입 높이
  function face(expr, ex, ey, my, thinBrows) {
    const xs = [100 - ex, 100 + ex];
    const st = `stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"`;
    const bw = thinBrows ? 2.2 : 3;
    // inner: 눈썹 안쪽 끝 높이 변화(+는 아래로 = 화남, -는 위로 = 슬픔)
    const brows = inner => xs.map((x, i) => {
      const dir = i === 0 ? 1 : -1;
      return `<path d="M ${r1(x - 7 * dir)} ${r1(ey - 12)} L ${r1(x + 6 * dir)} ${r1(ey - 12 + inner)}" stroke="${INK}" stroke-width="${bw}" stroke-linecap="round"/>`;
    }).join('');
    let eyes = '', mouth = '', b = brows(0);
    const dot = (rx, ry) => xs.map(x => `<ellipse cx="${r1(x)}" cy="${r1(ey)}" rx="${rx}" ry="${ry}" fill="${INK}"/>`).join('');
    switch (expr) {
      case 'happy':
      case 'eat':
        eyes = xs.map(x => `<path d="M ${r1(x - 6)} ${r1(ey + 2)} Q ${r1(x)} ${r1(ey - 6)} ${r1(x + 6)} ${r1(ey + 2)}" ${st}/>`).join('');
        b = brows(-1);
        break;
      case 'sleep':
        eyes = xs.map(x => `<path d="M ${r1(x - 6)} ${r1(ey)} Q ${r1(x)} ${r1(ey + 4)} ${r1(x + 6)} ${r1(ey)}" ${st}/>`).join('');
        break;
      case 'sad':
      case 'hungry':
        eyes = dot(3.2, 4.2); b = brows(-4);
        break;
      case 'angry':
        eyes = dot(3, 3.4); b = brows(5);
        break;
      case 'sick':
        eyes = xs.map(x => `<path d="M ${r1(x - 5)} ${r1(ey)} L ${r1(x + 5)} ${r1(ey)}" ${st}/>`).join(''); b = brows(-4);
        break;
      default:
        eyes = dot(3.6, 4.6);
    }
    switch (expr) {
      case 'happy': mouth = `<path d="M 88 ${my - 3} Q 100 ${my + 12} 112 ${my - 3} Z" fill="#a3242d" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`; break;
      case 'eat': mouth = `<ellipse cx="100" cy="${my}" rx="7" ry="8" fill="#a3242d" stroke="${INK}" stroke-width="3"/>`; break;
      case 'hungry': mouth = `<ellipse cx="100" cy="${my}" rx="4.5" ry="5.5" fill="#a3242d" stroke="${INK}" stroke-width="2.5"/>`; break;
      case 'sad': mouth = `<path d="M 91 ${my + 3} Q 100 ${my - 5} 109 ${my + 3}" ${st}/>`; break;
      case 'angry': mouth = `<rect x="91" y="${my - 3}" width="18" height="7" rx="2" fill="#fff" stroke="${INK}" stroke-width="2.5"/><path d="M 91 ${my + 0.5} H 109" stroke="${INK}" stroke-width="1.5"/>`; break;
      case 'sick': mouth = `<path d="M 90 ${my} Q 95 ${my - 4} 100 ${my} Q 105 ${my + 4} 110 ${my}" ${st}/>`; break;
      case 'sleep': mouth = `<ellipse cx="100" cy="${my}" rx="3.5" ry="3" fill="#a3242d" stroke="${INK}" stroke-width="2"/>`; break;
      default: mouth = `<path d="M 92 ${my} Q 100 ${my + 5} 108 ${my}" ${st}/>`;
    }
    return b + eyes + mouth;
  }

  function kim({ stage = 'baby', fat = 10, expr = 'normal', pose = 'idle' } = {}) {
    const id = 'kim' + (++uid);
    const baby = stage === 'baby';
    const f = Math.max(0, Math.min(100, fat)) / 100;
    const wf = 1 + f * 0.55, hf = 1 + f * 0.22;
    const o = OUTFIT[stage] || OUTFIT.baby;
    const hr = (baby ? 46 : 42) * hf, hry = baby ? 44 : 41, hy = baby ? 84 : 80;
    const tw = (baby ? 40 : 52) * wf, bw = (baby ? 60 : 76) * wf;
    const top = baby ? 128 : 122, bot = 214;
    const L = 100 - bw / 2, R = 100 + bw / 2;
    const p = [];

    p.push(`<ellipse cx="100" cy="217" rx="${r1(bw / 2 + 10)}" ry="6" fill="rgba(0,0,0,.22)"/>`);
    // 팔(몸통 뒤)
    p.push(arm(L + 14, top + 22, L - 4, top + 64, o.sleeve));
    p.push(pose === 'point' ? arm(R - 14, top + 18, R + 26, top - 18, o.sleeve)
      + `<path d="M ${r1(R + 30)} ${top - 24} L ${r1(R + 42)} ${top - 36}" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`
      + `<path d="M ${r1(R + 30)} ${top - 24} L ${r1(R + 42)} ${top - 36}" stroke="${SKIN}" stroke-width="4" stroke-linecap="round"/>`
      : arm(R - 14, top + 22, R + 4, top + 64, o.sleeve));
    // 몸통
    p.push(`<path d="M ${r1(100 - tw / 2)} ${top} C ${r1(L - 6)} ${top + 14}, ${r1(L - 8)} ${bot - 16}, ${r1(L + 8)} ${bot} L ${r1(R - 8)} ${bot} C ${r1(R + 8)} ${bot - 16}, ${r1(R + 6)} ${top + 14}, ${r1(100 + tw / 2)} ${top} Z" fill="${o.body}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`);
    // 옷 디테일
    if (baby) {
      p.push(`<path d="M 82 ${top + 2} Q 100 ${top + 34} 118 ${top + 2} Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`);
      p.push(`<polygon points="${star(100, top + 13, 6, 2.6)}" fill="#e3202a"/>`);
    } else if (stage === 'student') {
      p.push(`<path d="M 86 ${top} L 100 ${top + 18} L 114 ${top}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>`);
      p.push(`<text x="100" y="${top + 62}" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="30" fill="#fff" stroke="${INK}" stroke-width="1.5" paint-order="stroke">23</text>`);
    } else {
      p.push(`<path d="M 100 ${top + 6} V ${bot - 4}" stroke="rgba(255,255,255,.18)" stroke-width="2"/>`);
      [20, 38, 56, 74].forEach(dy => p.push(`<circle cx="100" cy="${top + dy}" r="3" fill="#d8c27a" stroke="${INK}" stroke-width="1.2"/>`));
      [-1, 1].forEach(s => p.push(`<rect x="${r1(100 + s * tw * 0.36 - 9)}" y="${top + 26}" width="18" height="12" rx="2" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>`));
      p.push(`<rect x="85" y="${top - 6}" width="30" height="12" rx="3" fill="${o.body}" stroke="${INK}" stroke-width="3"/>`);
      if (stage === 'leader') {
        const mx = 100 + tw * 0.3;
        p.push(`<rect x="${r1(mx - 5)}" y="${top + 14}" width="10" height="8" fill="#d6282f" stroke="${INK}" stroke-width="1.5"/>`);
        p.push(`<polygon points="${star(mx, top + 31, 8, 3.5)}" fill="#ffc21a" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`);
      }
    }
    // 머리
    [-1, 1].forEach(s => p.push(`<circle cx="${r1(100 + s * (hr + 1))}" cy="${hy + 6}" r="9" fill="${SKIN}" stroke="${INK}" stroke-width="3"/>`));
    p.push(`<clipPath id="${id}-face"><ellipse cx="100" cy="${hy}" rx="${r1(hr - 1.5)}" ry="${hry - 1.5}"/></clipPath>`);
    p.push(`<ellipse cx="100" cy="${hy}" rx="${r1(hr)}" ry="${hry}" fill="${SKIN}" stroke="${INK}" stroke-width="3"/>`);
    if (expr === 'sick') p.push(`<ellipse cx="100" cy="${hy}" rx="${r1(hr - 2)}" ry="${hry - 2}" fill="#7cc576" opacity=".25"/>`);
    if (baby) {
      p.push(`<path d="M 98 ${hy - hry + 2} c -8 -10 2 -20 10 -14 c 5 4 0 10 -4 7" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`);
    } else {
      // 옆머리는 짧게 밀고(반투명 띠) 윗머리는 풍성하게
      p.push(`<g clip-path="url(#${id}-face)" fill="#3a3a44" opacity=".35">${[-1, 1].map(sd => `<ellipse cx="${r1(100 + sd * hr)}" cy="${r1(hy - hry * 0.3)}" rx="${r1(hr * 0.4)}" ry="${r1(hry * 0.62)}"/>`).join('')}</g>`);
      const x1 = 100 - hr * 0.86, x2 = 100 + hr * 0.86, ht = hy - hry - 19;
      p.push(`<path d="M ${r1(x1)} ${hy - 14} C ${r1(x1 - 4)} ${ht + 10}, ${r1(100 - hr * 0.5)} ${ht}, 100 ${ht} C ${r1(100 + hr * 0.5)} ${ht}, ${r1(x2 + 4)} ${ht + 10}, ${r1(x2)} ${hy - 14} C ${r1(x2 - 12)} ${hy - 26}, 116 ${hy - 30}, 100 ${hy - 28} C 84 ${hy - 30}, ${r1(x1 + 12)} ${hy - 26}, ${r1(x1)} ${hy - 14} Z" fill="#16161b" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`);
      p.push(`<path d="M ${r1(100 - hr * 0.32)} ${ht + 8} Q 100 ${ht + 3} ${r1(100 + hr * 0.32)} ${ht + 8}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3" stroke-linecap="round"/>`);
    }
    const ex = (baby ? 16 : 15) * hf, ey = baby ? hy + 8 : hy + 4, my = baby ? hy + 26 : hy + 24;
    [-1, 1].forEach(s => p.push(`<ellipse cx="${r1(100 + s * 27 * hf)}" cy="${ey + 12}" rx="${r1(7 * hf)}" ry="${r1(5 * hf)}" fill="#ff8f8f" opacity=".45"/>`));
    if (f > 0.45 && !baby) p.push(`<path d="M ${r1(100 - hr * 0.42)} ${hy + hry - 3} Q 100 ${hy + hry + 7} ${r1(100 + hr * 0.42)} ${hy + hry - 3}" fill="none" stroke="${INK}" stroke-width="2" opacity=".55"/>`);
    p.push(face(expr, ex, ey, my, baby));
    // 감정 표시
    if (expr === 'sleep') p.push(`<g font-family="'Black Han Sans', sans-serif" fill="${INK}"><text x="${r1(100 + hr)}" y="${hy - hry + 6}" font-size="20">Z</text><text x="${r1(100 + hr + 16)}" y="${hy - hry - 10}" font-size="14">z</text></g>`);
    if (expr === 'angry') p.push(`<text x="${r1(100 + hr - 14)}" y="${hy - hry + 14}" font-size="22">💢</text>`);
    if (expr === 'sick' || expr === 'hungry') p.push(`<path d="M ${r1(100 + hr - 6)} ${hy - 16} q -6 10 0 14 q 6 -4 0 -14 z" fill="#6cc3ff" stroke="${INK}" stroke-width="2"/>`);

    return `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="정은이">${p.join('')}</svg>`;
  }

  const BACKDROPS = {
    baby: `<defs><linearGradient id="bd-baby" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c9"/><stop offset="1" stop-color="#ffd98f"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#bd-baby)"/>
      <g fill="#ffe3a0">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<rect x="${i * 40}" width="20" height="230"/>`).join('')}</g>
      <rect y="228" width="400" height="72" fill="#e7a564"/>
      <path d="M0 252 H400 M0 276 H400" stroke="#c9844a" stroke-width="2"/>
      <rect x="34" y="40" width="80" height="70" rx="4" fill="#9ed8ff" stroke="${INK}" stroke-width="4"/>
      <path d="M74 40 V110 M34 75 H114" stroke="${INK}" stroke-width="3"/>
      <polygon points="${star(56, 58, 7, 3)}" fill="#fff6a8"/>
      <path d="M300 0 V38" stroke="${INK}" stroke-width="2"/>
      <polygon points="${star(300, 52, 16, 7)}" fill="#e3202a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <g stroke="${INK}" stroke-width="3"><rect x="318" y="200" width="28" height="28" fill="#3aa0dc"/><rect x="346" y="200" width="28" height="28" fill="#ffc21a"/><rect x="332" y="172" width="28" height="28" fill="#e3202a"/></g>`,
    student: `<defs><linearGradient id="bd-student" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc8f7"/><stop offset="1" stop-color="#e2f5ff"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#bd-student)"/>
      <circle cx="330" cy="58" r="24" fill="#ffe066" stroke="${INK}" stroke-width="3"/>
      <polygon points="0,236 86,96 168,210 250,70 344,196 400,128 400,300 0,300" fill="#7b96ba" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <g fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"><polygon points="86,96 70,122 80,116 90,126 102,118"/><polygon points="250,70 230,104 244,96 254,108 268,98"/><polygon points="400,128 386,146 396,142 400,146"/></g>
      <path d="M0 238 Q 120 204 220 232 T 400 226 V300 H0 Z" fill="#7ccf6b" stroke="${INK}" stroke-width="3"/>
      <rect x="362" y="122" width="7" height="118" fill="#666" stroke="${INK}" stroke-width="2"/>
      <rect x="336" y="96" width="52" height="36" fill="#fff" stroke="${INK}" stroke-width="3"/>
      <rect x="352" y="108" width="20" height="14" fill="none" stroke="#e3202a" stroke-width="2.5"/>
      <path d="M346 136 H378" stroke="#f76707" stroke-width="4"/>
      <path d="M348 138 L354 156 M362 138 L362 156 M376 138 L370 156 M354 156 H370" stroke="#fff" stroke-width="1.5"/>`,
    heir: `<defs><linearGradient id="bd-heir" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf5c"/><stop offset="1" stop-color="#fff0c2"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#bd-heir)"/>
      <g fill="#ffe9a8" opacity=".7">${[-60, -36, -12, 12, 36, 60].map(a => `<polygon points="200,250 ${r1(200 + 420 * Math.sin((a - 6) * Math.PI / 180))},${r1(250 - 420 * Math.cos((a - 6) * Math.PI / 180))} ${r1(200 + 420 * Math.sin((a + 6) * Math.PI / 180))},${r1(250 - 420 * Math.cos((a + 6) * Math.PI / 180))}"/>`).join('')}</g>
      <g fill="#6b4f3f">${Array.from({ length: 34 }, (_, i) => `<circle cx="${i * 12 + 4}" cy="${216 + (i % 2) * 3}" r="5"/>`).join('')}</g>
      <rect y="222" width="400" height="78" fill="#a3a07c" stroke="${INK}" stroke-width="3"/>
      <path d="M200 222 L40 300 M200 222 L120 300 M200 222 L280 300 M200 222 L360 300" stroke="#8a8766" stroke-width="2"/>
      ${[30, 340].map(x => `<rect x="${x + 12}" y="30" width="4" height="190" fill="${INK}"/><path d="M${x - 6} 40 H${x + 34} V120 L${x + 14} 108 L${x - 6} 120 Z" fill="#e3202a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><polygon points="${star(x + 14, 70, 11, 4.5)}" fill="#ffc21a"/>`).join('')}`,
    leader: `<defs><linearGradient id="bd-leader" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8161d"/><stop offset=".75" stop-color="#ff8a3a"/><stop offset="1" stop-color="#ffc65c"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#bd-leader)"/>
      <g fill="#ffd36b" opacity=".18">${[-75, -50, -25, 0, 25, 50, 75].map(a => `<polygon points="200,250 ${r1(200 + 440 * Math.sin((a - 7) * Math.PI / 180))},${r1(250 - 440 * Math.cos((a - 7) * Math.PI / 180))} ${r1(200 + 440 * Math.sin((a + 7) * Math.PI / 180))},${r1(250 - 440 * Math.cos((a + 7) * Math.PI / 180))}"/>`).join('')}</g>
      <polygon points="${star(200, 62, 22, 9)}" fill="#ffc21a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <g fill="#5b0c11">
        <polygon points="40,250 82,70 124,250"/><rect x="80" y="44" width="4" height="30"/>
        <rect x="140" y="196" width="40" height="54"/><rect x="186" y="214" width="30" height="36"/>
        <rect x="282" y="200" width="44" height="50"/><rect x="334" y="180" width="34" height="70"/><rect x="372" y="208" width="28" height="42"/>
        <rect x="244" y="226" width="36" height="24"/><rect x="252" y="96" width="20" height="132"/><rect x="247" y="88" width="30" height="10"/>
      </g>
      <path d="M262 88 C 250 74, 266 64, 262 48 C 276 62, 274 76, 262 88 Z" fill="#ff4d2e" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <rect y="248" width="400" height="52" fill="#3e070b"/>`,
  };

  function backdrop(stage) {
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${BACKDROPS[stage] || BACKDROPS.baby}</svg>`;
  }

  return { kim, backdrop };
})();
