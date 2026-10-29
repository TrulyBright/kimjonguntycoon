// 게임 데이터 1/2: 지표, 성장 단계, 일정(행동), 대사, 속보 문구
const GAME_DAYS = 70;

// unlock: 해당 단계(0~3)부터 화면에 보이고 엔딩 조건으로 검사한다. 그 전에도 값은 몰래 쌓인다.
const STATS = {
  full:    { name: '배부름', icon: '🍚', color: '#f59f00', danger: v => v <= 20 },
  mood:    { name: '기분', icon: '😊', color: '#f06595', danger: v => v <= 20 },
  energy:  { name: '체력', icon: '⚡', color: '#3aa0dc', danger: v => v <= 15 },
  health:  { name: '건강', icon: '❤️', color: '#2f9e44', danger: v => v <= 25 },
  auth:    { name: '위엄', icon: '👑', color: '#e8a400', danger: v => v <= 20, unlock: 2 },
  people:  { name: '민심', icon: '🌾', color: '#74b816', danger: v => v <= 20, unlock: 3 },
  tension: { name: '국제 긴장도', icon: '🚀', color: '#7048e8', danger: v => v >= 80, unlock: 3 },
};

// 힌트에만 쓰는 숨은 수치
const EXTRA_ICONS = { fat: '⚖️', smart: '🎓', money: '💵' };

const STAGES = [
  {
    id: 'baby', name: '아기 정은', from: 1, ages: [0, 3], kg: [3.4, 14],
    decay: { full: -12, mood: -6, energy: -8 },
    intro: '백두산 정기를 받고 태어났다는(선전부 발표) 아기 정은. 잘 먹이고 잘 재워서 튼튼하게 키우자.',
  },
  {
    id: 'student', name: '유학생 ‘박운’', from: 9, ages: [12, 17], kg: [45, 68],
    decay: { full: -10, mood: -6, energy: -8 },
    intro: '정은이는 ‘박운’이라는 가명으로 스위스 베른의 학교에 입학했다. 농구와 치즈를 처음 만난 운명의 땅이다. 공부를 열심히 하면 나중에 좋은 일이 있을지도?',
  },
  {
    id: 'heir', name: '청년대장', from: 23, ages: [18, 26], kg: [75, 85],
    decay: { full: -10, mood: -6, energy: -9, auth: -3 },
    intro: '유학을 마치고 돌아온 정은이는 후계자 수업을 시작했다. 이제부터는 👑 위엄도 챙겨야 한다. 위엄이 0이 되면 아무도 박수를 쳐 주지 않는다.',
    unlockNote: '새 지표 해금: 👑 위엄',
  },
  {
    id: 'leader', name: '위원장', from: 41, ages: [27, 40], kg: [88, 96],
    decay: { full: -10, mood: -6, energy: -10, auth: -3, people: -4, tension: -2 },
    intro: '마침내 최고 지도자의 자리에 올랐다! 🌾 민심과 🚀 국제 긴장도, 💵 외화를 관리하자. 긴장도가 높을수록 제재 때문에 외화 수입이 줄어든다.',
    unlockNote: '새 지표 해금: 🌾 민심 · 🚀 국제 긴장도 · 💵 외화',
  },
];

// count: 엔딩 판정용 누적 횟수 / anim: bounce·shake·sleep / fly: 날아가는 이모지 연출
const ACTIONS = {
  baby: [
    { id: 'milk', emoji: '🍼', name: '분유 먹이기', fx: { full: 35, mood: 5, fat: 1 }, anim: 'bounce',
      say: ['맘마!', '꿀꺽꿀꺽… 더!'],
      news: ['정은 동지께서 분유 한 병을 단숨에 비우시였습니다. 젖병 공장 로동자들이 감격의 눈물을 흘렸습니다.'] },
    { id: 'play', emoji: '🧸', name: '놀아주기', fx: { mood: 25, energy: -15, full: -5 }, anim: 'bounce',
      say: ['까르르!', '탱크! 탱크!'],
      news: ['장난감 탱크를 가지고 노시던 정은 동지께서 벌써 포병 전술을 구상하시였습니다.', '정은 동지께서 블록을 쌓으시자 그것이 그대로 주체탑 모양이 되였습니다.'] },
    { id: 'sleep', emoji: '💤', name: '재우기', fx: { energy: 45, health: 4, mood: 3 }, anim: 'sleep',
      say: ['쿨… 쿨…'],
      news: ['정은 동지께서 주무시는 동안 온 나라가 숨을 죽였습니다.'] },
    { id: 'bath', emoji: '🛁', name: '목욕시키기', fx: { health: 12, mood: -6, energy: -5 }, anim: 'shake',
      say: ['싫어어! 물 싫어!', '으앙!'],
      news: ['목욕물 온도는 정확히 혁명적인 36.5도였습니다.'] },
    { id: 'praise', emoji: '🌟', name: '“천재다!” 칭찬하기', fx: { mood: 15, auth: 4, energy: -5 }, anim: 'bounce',
      say: ['헤헤, 내가 최고!'],
      news: ['선전부는 정은 동지께서 생후 100일 만에 구구단을 외우시였다고 발표했습니다.'] },
  ],
  student: [
    { id: 'fondue', emoji: '🫕', name: '퐁듀 먹기', fx: { full: 32, mood: 10, fat: 4 }, anim: 'bounce',
      say: ['치즈가… 늘어난다우!', '이 나라 음식 최고다!'],
      news: ['베른의 한 식당에서 퐁듀 냄비가 바닥을 드러냈습니다. 치즈와의 운명적인 만남이었습니다.'] },
    { id: 'hoops', emoji: '🏀', name: '농구하기', fx: { mood: 22, energy: -20, full: -8, fat: -5, health: 3 }, count: 'hoops', anim: 'bounce', fly: '🏀',
      say: ['덩크! …는 다음에.', '마이클 조던 최고!'],
      news: ['박운 학생의 레이업슛을 본 체육 교사가 할 말을 잃었습니다. 공이 반대편 골대로 날아갔기 때문입니다.'] },
    { id: 'study', emoji: '📚', name: '공부하기', fx: { mood: -10, energy: -12, smart: 12 }, anim: 'shake',
      say: ['독일어 어렵다우…', '수학은 혁명적으로 어렵다.'],
      news: ['박운 학생이 시험지에 ‘참 잘했어요’ 도장을 받았습니다. 도장은 본인이 찍었다는 소문입니다.'] },
    { id: 'sleep', emoji: '💤', name: '기숙사에서 자기', fx: { energy: 45, health: 4 }, anim: 'sleep',
      say: ['쿨… 조던… 쿨…'],
      news: ['박운 학생의 코골이 소리에 기숙사 사감이 세 번 잠에서 깼습니다.'] },
    { id: 'movie', emoji: '🎬', name: '액션영화 보기', fx: { mood: 16, energy: -5, full: -4 }, anim: 'bounce',
      say: ['나도 다리 찢기 할 수 있다우!'],
      news: ['근육질 배우의 다리 찢기를 따라 하던 박운 학생의 바지가 찢어졌습니다.'] },
    { id: 'call', emoji: '📞', name: '집에 전화하기', fx: { mood: 8, auth: 5, energy: -3 }, anim: 'bounce',
      say: ['네, 아버지. 혁명 과업은… 농구는 잘 됩니다!'],
      news: ['평양에서 “혁명 과업은 잘 되여가나?”라는 질문이 왔습니다. 그는 “농구는 잘 되여갑니다”라고 답했습니다.'] },
  ],
  heir: [
    { id: 'meat', emoji: '🍖', name: '고기 먹기', fx: { full: 32, mood: 10, fat: 4 }, anim: 'bounce',
      say: ['고기는 혁명의 원동력이다!'],
      news: ['청년대장 동지께서 갈비 열두 대를 드시며 인민 경제의 앞날을 구상하시였습니다.'] },
    { id: 'guide', emoji: '👉', name: '현지지도', fx: { auth: 12, people: 3, energy: -18, mood: -3 }, anim: 'bounce', pose: 'point',
      say: ['저기! 저것을 고치라우!', '이것은… 좋다!'],
      news: ['청년대장 동지께서 공장에서 무언가를 가리키시였습니다. 무엇인지 아무도 모르지만 모두가 받아 적었습니다.'] },
    { id: 'haircut', emoji: '💇', name: '그 머리로 이발', fx: { auth: 8, mood: 5 }, anim: 'bounce',
      say: ['옆은 싹, 위는 풍성하게!'],
      news: ['이발사는 오늘도 손을 떨며 가위질을 했습니다. 옆머리는 싹, 윗머리는 풍성하게.'] },
    { id: 'speech', emoji: '🎤', name: '연설 연습', fx: { auth: 10, energy: -10, mood: -2 }, anim: 'bounce', pose: 'point',
      say: ['동무들! …아니, 다시.'],
      news: ['거울 앞 연설 연습이 네 시간째 이어지고 있습니다. 거울도 박수를 쳤습니다.'] },
    { id: 'hoops', emoji: '🏀', name: '농구하기', fx: { mood: 22, energy: -20, full: -8, fat: -5, health: 3 }, count: 'hoops', anim: 'bounce', fly: '🏀',
      say: ['수비가 너무 약하다우. 왜 아무도 막지 않지?'],
      news: ['청년대장 동지께서 경기에서 87득점을 올리시였습니다. 상대 팀은 끝까지 수비를 하지 않았습니다.'] },
    { id: 'sleep', emoji: '💤', name: '잠자기', fx: { energy: 45, health: 4 }, anim: 'sleep',
      say: ['쿨…'],
      news: ['청년대장 동지의 취침 시간에 맞춰 평양 전역의 소등이 이루어졌습니다. 원래 전기가 없었다는 지적도 있습니다.'] },
  ],
  leader: [
    { id: 'cheese', emoji: '🧀', name: '에멘탈 치즈 만찬', fx: { full: 35, mood: 14, fat: 5, money: -25 }, anim: 'bounce',
      say: ['구멍이 많을수록 맛있다우!', '스위스의 맛이다…'],
      news: ['위원장 동지께서 스위스산 치즈를 맛보시며 “구멍이 혁명적”이라고 평가하시였습니다.'] },
    { id: 'guide', emoji: '👉', name: '현지지도', fx: { auth: 10, people: 6, energy: -18, mood: -3 }, anim: 'bounce', pose: 'point',
      say: ['저기 저것! 저것을 두 배로!', '여기 공장장 동무 어디 갔소?'],
      news: ['위원장 동지께서 가리키신 손가락 끝에서 생산량이 300% 증가했다고 합니다.', '위원장 동지께서 양말 공장을 찾으시여 양말의 혁명적 탄력을 높이 평가하시였습니다.'] },
    { id: 'missile', emoji: '🚀', name: '미사일 시험발사', fx: { auth: 18, tension: 22, people: -6, mood: 8, money: -45 }, count: 'missiles', anim: 'bounce', fly: 'rocket',
      say: ['쏴라우!', '바다로! 아무도 없는 바다로!'],
      news: ['오늘 발사된 미사일은 동해의 물고기들에게 커다란 충격을 주었습니다.', '이웃 나라들이 “깊은 유감”을 표명했습니다. 이번 달 들어 네 번째 유감입니다.'] },
    { id: 'summit', emoji: '🤝', name: '정상회담', fx: { tension: -25, mood: 6, auth: -4, energy: -15, money: 45 }, count: 'summits', anim: 'bounce',
      say: ['악수는 세게, 사진은 크게!'],
      news: ['역사적인 정상회담이 열렸습니다. 두 정상은 악수를 19초 동안 했고, 합의문은 한 줄이었습니다.'] },
    { id: 'ration', emoji: '🍚', name: '식량 배급', fx: { people: 22, auth: 3, money: -40 }, anim: 'bounce',
      say: ['인민들도 배불리 먹으라우!'],
      news: ['오랜만에 쌀 배급이 이루어졌습니다. 인민들의 박수 소리가 처음으로 진심이었습니다.'] },
    { id: 'parade', emoji: '🎖️', name: '열병식', fx: { auth: 15, mood: 10, people: -3, energy: -10, money: -30 }, anim: 'bounce', pose: 'point',
      say: ['발을 더 높이 들라우!'],
      news: ['열병식에서 병사들의 다리가 하늘 높이 올라갔습니다. 몇 명은 아직 내려오지 않았습니다.'] },
    { id: 'resort', emoji: '🏖️', name: '원산 별장 휴가', fx: { energy: 45, health: 8, mood: 10, money: -10 }, anim: 'sleep',
      say: ['바다… 좋다우…', '쿨…'],
      news: ['위원장 동지께서 원산 별장에서 휴식하시였습니다. 제트스키는 세 대가 고장 났습니다.'] },
    { id: 'hoops', emoji: '🏀', name: '농구 시합', fx: { mood: 22, energy: -20, full: -8, fat: -5, health: 3 }, count: 'hoops', anim: 'bounce', fly: '🏀',
      say: ['심판은 물론 우리 쪽이다우!'],
      news: ['위원장 동지의 팀이 145 대 0으로 이겼습니다. 상대 팀 선수들은 경기 내내 박수를 쳤습니다.'] },
  ],
};

// 말풍선 대사: 상태 우선순위(아픔 > 배고픔 > 피곤 > 기분 나쁨 > 기분 좋음 > 보통)
const LINES = {
  baby: {
    sick: ['콜록… 엄마…'], hungry: ['맘마! 맘마아!', '응애애애!'], tired: ['하암… 졸려…'],
    sad: ['흐앙… 심심해…'], happy: ['까르르!', '부릉부릉! (운전 연습 중)'], normal: ['응애!', '미… 미사…?', '빠빠!'],
  },
  student: {
    sick: ['몸이 좀 안 좋수다…'], hungry: ['퐁듀… 퐁듀가 필요하다우.'], tired: ['숙제는 내일 하자우…'],
    sad: ['아무도 날 몰라준다우.', '집에 가고 싶다…'], happy: ['나는 박운. 평범한 학생이다!', '조던처럼 날아오를 테다!'],
    normal: ['독일어로 ‘치즈’는 Käse다우.', '나는 그냥 대사관 직원 아들이다. 진짜다.'],
  },
  heir: {
    sick: ['의사 동무를 불러라우!'], hungry: ['배가 고프면 위엄도 없다우.'], tired: ['현지지도는 내일 하자우…'],
    sad: ['흥! 기분 나쁘다우.'], happy: ['오늘도 위대한 하루다!', '박수 소리가 듣기 좋다우.'],
    normal: ['내가 가리키는 곳이 곧 미래다.', '머리 모양은 괜찮소?'],
  },
  leader: {
    sick: ['요즘 몸이… 아니다, 아주 건강하다!'], hungry: ['치즈! 치즈를 가져오라우!'], tired: ['회의는… 짧게 하라우…'],
    sad: ['아무도 나를 이해 못 하오.', '박수 소리가 작다우?'], happy: ['오늘 날씨도 내 덕분이다!', '세상이 다 내 발아래다우!'],
    normal: ['이 몸이 위원장이다.', '보고서는 세 줄로 하라우.', '동무, 그 손뼉은 진심이오?'],
  },
};

const TICKER_LINES = [
  '백두산에 쌍무지개가 떴다는 보고가 사흘 연속 접수되었습니다.',
  '평양 기상청 예보: 오늘 날씨는 동지의 기분에 따라 맑음.',
  '선대 위원장의 골프 기록(첫 라운드 홀인원 11개)은 아직 깨지지 않았습니다.',
  '전국 이발소에 ‘그 머리’ 주문이 폭주하고 있습니다.',
  '해외 언론이 또 오보를 냈습니다. 우리는 아주 잘 지내고 있습니다.',
  '박수 연습 시간이 하루 두 시간으로 늘어났습니다.',
];
