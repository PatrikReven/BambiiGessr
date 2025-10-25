/* =========================================================
   SloGuesser — Geo igra za Slovenijo
   - Občine in kraji kot ločena načina (UI se preklopi)
   - Rdeč outline okoli območja Slovenije (bolj vidno)
   - Ime igralca + scoreboard v localStorage
   - Flow: klik na mapo -> gumb "Potrdi" -> rezultat
   ========================================================= */

// ---------- UI refs ----------
const startOverlay = document.getElementById('startOverlay');
const playerNameInput = document.getElementById('playerName');
const modeGroup = document.getElementById('modeGroup');
const difficultySel = document.getElementById('difficulty');
const numQSel = document.getElementById('numQ');
const startBtn = document.getElementById('startBtn');

const uiPlayer = document.getElementById('uiPlayer');
const uiMode = document.getElementById('uiMode');
const uiLevel = document.getElementById('uiLevel');
const uiQ = document.getElementById('uiQ');
const uiScore = document.getElementById('uiScore');
const targetName = document.getElementById('targetName');
const seekLabel = document.getElementById('seekLabel');
const findLabel = document.getElementById('findLabel');
const topTarget = document.getElementById('topTarget');
const feedback = document.getElementById('feedback');

const confirmBtn = document.getElementById('confirmBtn');
const resetBtn = document.getElementById('resetBtn');
const clearBoardBtn = document.getElementById('clearBoardBtn');

document.getElementById('helpBtn').addEventListener('click', () => {
  alert(
`Kako igrati:
1) Vpiši ime, izberi Način (Kraji ali Občine), Težavnost in št. vprašanj.
2) Klikni na zemljevid Slovenije, kjer misliš, da je iskani kraj/občina.
3) Pritisni "Potrdi", da potrdiš odgovor.
Vse rezultate in ime shranimo lokalno v tem brskalniku.`
  );
});

// ---------- Leaflet map ----------
const map = L.map('map', {
  zoomControl: true,
  attributionControl: true,
  zoomSnap: 0.25,
  maxBounds: L.latLngBounds([45.0, 12.7], [47.2, 17.1]),
  maxBoundsViscosity: 0.7
}).setView([46.1, 14.9], 8.6);

// Temna podlaga brez label (bolj kontrastno)
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
  maxZoom: 18,
  minZoom: 6,
  attribution: '&copy; OpenStreetMap & Carto',
}).addTo(map);

// Slovenija “okvir” (tight bounds)
const slBoundsTight = L.latLngBounds([45.35, 13.35], [46.9, 16.6]);
// Rdeč črtkan OUTLINE okrog Slovenije (po okvirju za vizualno pomoč)
const siOutline = L.rectangle(slBoundsTight, {
  color: '#ff4d4d',
  weight: 3,
  fill: false,
  dashArray: '8 6',
  opacity: 0.9
}).addTo(map);

// graphics for guess + answer
let guessMarker = null;
let answerMarker = null;
let linkLine = null;

// recenter button
document.getElementById('recenterBtn').addEventListener('click', () => {
  map.fitBounds(slBoundsTight.pad(0.05));
});

// ---------- Local storage helpers ----------
const LS_KEYS = {
  name: 'sloguesser.playerName',
  board: 'sloguesser.leaderboard'
};

const loadName = () => localStorage.getItem(LS_KEYS.name) || '';
const saveName = (n) => localStorage.setItem(LS_KEYS.name, n);
const loadBoard = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.board) || '[]'); }
  catch { return []; }
};
const saveBoard = (b) => localStorage.setItem(LS_KEYS.board, JSON.stringify(b));

// ---------- Dataset ----------
const DATA = {
  kraji: {
    1: [
      {name:"Ljubljana", lat:46.0569, lon:14.5058},
      {name:"Maribor", lat:46.5547, lon:15.6459},
      {name:"Celje", lat:46.2309, lon:15.2604},
      {name:"Kranj", lat:46.2389, lon:14.3556},
      {name:"Koper", lat:45.5481, lon:13.7300},
      {name:"Novo mesto", lat:45.8030, lon:15.1689},
      {name:"Velenje", lat:46.3592, lon:15.1103},
      {name:"Ptuj", lat:46.4203, lon:15.8700},
      {name:"Murska Sobota", lat:46.6625, lon:16.1667},
      {name:"Nova Gorica", lat:45.9556, lon:13.6481},
      {name:"Jesenice", lat:46.4366, lon:14.0600},
      {name:"Trbovlje", lat:46.1497, lon:15.0533},
      {name:"Krško", lat:45.9594, lon:15.4856},
      {name:"Brežice", lat:45.9044, lon:15.5917},
      {name:"Domžale", lat:46.1373, lon:14.5958},
      {name:"Kamnik", lat:46.2259, lon:14.6121},
      {name:"Škofja Loka", lat:46.1650, lon:14.3069},
      {name:"Idrija", lat:46.0037, lon:14.0276},
      {name:"Postojna", lat:45.7769, lon:14.2167},
      {name:"Logatec", lat:45.9140, lon:14.2250},
      {name:"Radovljica", lat:46.3444, lon:14.1742},
      {name:"Bled", lat:46.3692, lon:14.1136},
      {name:"Sežana", lat:45.7060, lon:13.8736},
      {name:"Izola", lat:45.5369, lon:13.6619},
      {name:"Piran", lat:45.5280, lon:13.5700},
      {name:"Ajdovščina", lat:45.8867, lon:13.9106},
      {name:"Tolmin", lat:46.1850, lon:13.7320},
      {name:"Grosuplje", lat:45.9553, lon:14.6583},
      {name:"Kočevje", lat:45.6430, lon:14.8633},
    ],
    2: [
      {name:"Litija", lat:46.0578, lon:14.8225},
      {name:"Zagorje ob Savi", lat:46.1347, lon:14.9969},
      {name:"Žalec", lat:46.2519, lon:15.1642},
      {name:"Laško", lat:46.1540, lon:15.2364},
      {name:"Sevnica", lat:46.0078, lon:15.3156},
      {name:"Trebnje", lat:45.9044, lon:15.0211},
      {name:"Črnomelj", lat:45.5719, lon:15.1897},
      {name:"Ilirska Bistrica", lat:45.5706, lon:14.2406},
      {name:"Ribnica", lat:45.7389, lon:14.7272},
      {name:"Medvode", lat:46.1422, lon:14.4197},
      {name:"Vrhnika", lat:45.9633, lon:14.2933},
      {name:"Cerknica", lat:45.7939, lon:14.3627},
      {name:"Lenart", lat:46.5750, lon:15.8330},
      {name:"Ruše", lat:46.5400, lon:15.5150},
      {name:"Radlje ob Dravi", lat:46.6140, lon:15.2280},
      {name:"Slovenska Bistrica", lat:46.3928, lon:15.5747},
      {name:"Rogaška Slatina", lat:46.2370, lon:15.6390},
      {name:"Šentjur", lat:46.2170, lon:15.3970},
      {name:"Dravograd", lat:46.5883, lon:15.0194},
    ],
    3: [
      {name:"Lendava", lat:46.5611, lon:16.4500},
      {name:"Ormož", lat:46.4115, lon:16.1543},
      {name:"Ravne na Koroškem", lat:46.5461, lon:14.9694},
      {name:"Slovenj Gradec", lat:46.5103, lon:15.0803},
      {name:"Mežica", lat:46.5219, lon:14.8525},
      {name:"Zreče", lat:46.3760, lon:15.3790},
      {name:"Šoštanj", lat:46.3800, lon:15.0500},
      {name:"Mengeš", lat:46.1642, lon:14.5717},
      {name:"Cerklje na Gorenjskem", lat:46.2542, lon:14.4881},
      {name:"Komenda", lat:46.2030, lon:14.5410},
      {name:"Lukovica", lat:46.1690, lon:14.6970},
      {name:"Moravče", lat:46.1360, lon:14.7440},
      {name:"Žiri", lat:46.0420, lon:14.1070},
      {name:"Tržič", lat:46.3630, lon:14.3080},
      {name:"Nazarje", lat:46.3170, lon:14.9550},
      {name:"Mozirje", lat:46.3390, lon:14.9580},
      {name:"Gornji Grad", lat:46.2950, lon:14.8060},
      {name:"Šmarje pri Jelšah", lat:46.2350, lon:15.5190},
      {name:"Podčetrtek", lat:46.1580, lon:15.6010},
      {name:"Metlika", lat:45.6481, lon:15.3144},
    ],
    4: [
      {name:"Bohinjska Bistrica", lat:46.2725, lon:13.9461},
      {name:"Kobarid", lat:46.2470, lon:13.5790},
      {name:"Bovec", lat:46.3380, lon:13.5520},
      {name:"Komen", lat:45.8150, lon:13.7480},
      {name:"Ivančna Gorica", lat:45.9380, lon:14.8040},
      {name:"Šentjernej", lat:45.8430, lon:15.3370},
      {name:"Prevalje", lat:46.5450, lon:14.9200},
      {name:"Loška Dolina", lat:45.6500, lon:14.5050},
      {name:"Loški Potok", lat:45.6340, lon:14.6270},
      {name:"Radeče", lat:46.0680, lon:15.1830},
      {name:"Gorišnica", lat:46.4120, lon:16.0130},
      {name:"Cirkulane", lat:46.3300, lon:15.9940},
      {name:"Makole", lat:46.3170, lon:15.6660},
      {name:"Kidričevo", lat:46.4020, lon:15.7940},
      {name:"Braslovče", lat:46.2830, lon:15.0370},
      {name:"Solčava", lat:46.4200, lon:14.6930},
      {name:"Železniki", lat:46.2240, lon:14.1690},
      {name:"Dobrova", lat:46.0450, lon:14.3830},
      {name:"Dobrepolje", lat:45.8540, lon:14.7080},
      {name:"Šentrupert", lat:45.9870, lon:15.0950},
    ],
    5: [
      {name:"Osilnica", lat:45.5290, lon:14.6990},
      {name:"Kostel", lat:45.5010, lon:14.9100},
      {name:"Kuzma", lat:46.8350, lon:16.0800},
      {name:"Hodoš", lat:46.8310, lon:16.3210},
      {name:"Dobrovnik", lat:46.6370, lon:16.3520},
      {name:"Križevci", lat:46.5750, lon:16.1170},
      {name:"Veržej", lat:46.5840, lon:16.1650},
      {name:"Gornji Petrovci", lat:46.8050, lon:16.2190},
      {name:"Kobilje", lat:46.6840, lon:16.3910},
      {name:"Velika Polana", lat:46.5760, lon:16.3460},
      {name:"Turnišče", lat:46.6160, lon:16.3160},
      {name:"Odranci", lat:46.5840, lon:16.2800},
      {name:"Središče ob Dravi", lat:46.3950, lon:16.2700},
      {name:"Žetale", lat:46.2750, lon:15.7950},
      {name:"Trnovska vas", lat:46.5330, lon:15.8850},
      {name:"Sveti Tomaž", lat:46.4800, lon:16.0790},
      {name:"Markovci", lat:46.3920, lon:15.9400},
      {name:"Ribnica na Pohorju", lat:46.5350, lon:15.2730},
      {name:"Vuzenica", lat:46.5960, lon:15.1650},
      {name:"Bistrica ob Sotli", lat:46.0640, lon:15.6640},
    ],
  },

  obcine: {
    1: [
      {name:"Ljubljana (občina)", lat:46.0569, lon:14.5058},
      {name:"Maribor (občina)", lat:46.5547, lon:15.6459},
      {name:"Kranj (občina)", lat:46.2389, lon:14.3556},
      {name:"Koper (občina)", lat:45.5481, lon:13.7300},
      {name:"Novo mesto (občina)", lat:45.8030, lon:15.1689},
      {name:"Celje (občina)", lat:46.2309, lon:15.2604},
      {name:"Velenje (občina)", lat:46.3592, lon:15.1103},
      {name:"Ptuj (občina)", lat:46.4203, lon:15.8700},
      {name:"Murska Sobota (občina)", lat:46.6625, lon:16.1667},
      {name:"Nova Gorica (občina)", lat:45.9556, lon:13.6481},
      {name:"Krško (občina)", lat:45.9594, lon:15.4856},
      {name:"Brežice (občina)", lat:45.9044, lon:15.5917},
      {name:"Domžale (občina)", lat:46.1373, lon:14.5958},
      {name:"Kamnik (občina)", lat:46.2259, lon:14.6121},
      {name:"Škofja Loka (občina)", lat:46.1650, lon:14.3069},
      {name:"Postojna (občina)", lat:45.7769, lon:14.2167},
      {name:"Logatec (občina)", lat:45.9140, lon:14.2250},
      {name:"Jesenice (občina)", lat:46.4366, lon:14.0600},
      {name:"Trbovlje (občina)", lat:46.1497, lon:15.0533},
      {name:"Kranjska Gora (občina)", lat:46.4847, lon:13.7895},
    ],
    2: [
      {name:"Sežana (občina)", lat:45.7060, lon:13.8736},
      {name:"Ajdovščina (občina)", lat:45.8867, lon:13.9106},
      {name:"Vipava (občina)", lat:45.8469, lon:13.9622},
      {name:"Tolmin (občina)", lat:46.1850, lon:13.7320},
      {name:"Izola (občina)", lat:45.5369, lon:13.6619},
      {name:"Piran (občina)", lat:45.5280, lon:13.5700},
      {name:"Grosuplje (občina)", lat:45.9553, lon:14.6583},
      {name:"Litija (občina)", lat:46.0578, lon:14.8225},
      {name:"Zagorje ob Savi (občina)", lat:46.1347, lon:14.9969},
      {name:"Žalec (občina)", lat:46.2519, lon:15.1642},
      {name:"Laško (občina)", lat:46.1540, lon:15.2364},
      {name:"Sevnica (občina)", lat:46.0078, lon:15.3156},
      {name:"Kočevje (občina)", lat:45.6430, lon:14.8633},
      {name:"Ilirska Bistrica (občina)", lat:45.5706, lon:14.2406},
      {name:"Ribnica (občina)", lat:45.7389, lon:14.7272},
      {name:"Medvode (občina)", lat:46.1422, lon:14.4197},
      {name:"Radovljica (občina)", lat:46.3444, lon:14.1742},
      {name:"Bled (občina)", lat:46.3692, lon:14.1136},
      {name:"Cerknica (občina)", lat:45.7939, lon:14.3627},
      {name:"Črnomelj (občina)", lat:45.5719, lon:15.1897},
    ],
    3: [
      {name:"Dravograd (občina)", lat:46.5883, lon:15.0194},
      {name:"Slovenj Gradec (občina)", lat:46.5103, lon:15.0803},
      {name:"Ravne na Koroškem (občina)", lat:46.5461, lon:14.9694},
      {name:"Mežica (občina)", lat:46.5219, lon:14.8525},
      {name:"Lenart (občina)", lat:46.5750, lon:15.8330},
      {name:"Ruše (občina)", lat:46.5400, lon:15.5150},
      {name:"Zreče (občina)", lat:46.3760, lon:15.3790},
      {name:"Radlje ob Dravi (občina)", lat:46.6140, lon:15.2280},
      {name:"Mozirje (občina)", lat:46.3390, lon:14.9580},
      {name:"Prevalje (občina)", lat:46.5450, lon:14.9200},
      {name:"Tržič (občina)", lat:46.3630, lon:14.3080},
      {name:"Ivančna Gorica (občina)", lat:45.9380, lon:14.8040},
      {name:"Šentjur (občina)", lat:46.2170, lon:15.3970},
      {name:"Rogaška Slatina (občina)", lat:46.2370, lon:15.6390},
      {name:"Gornja Radgona (občina)", lat:46.6720, lon:15.9930},
      {name:"Šmarje pri Jelšah (občina)", lat:46.2350, lon:15.5190},
      {name:"Šoštanj (občina)", lat:46.3800, lon:15.0500},
      {name:"Podčetrtek (občina)", lat:46.1580, lon:15.6010},
      {name:"Loška Dolina (občina)", lat:45.6500, lon:14.5050},
      {name:"Loški Potok (občina)", lat:45.6340, lon:14.6270},
    ],
    4: [
      {name:"Solčava (občina)", lat:46.4200, lon:14.6930},
      {name:"Železniki (občina)", lat:46.2240, lon:14.1690},
      {name:"Dobrova-Polhov Gradec (občina)", lat:46.0450, lon:14.3830},
      {name:"Šentrupert (občina)", lat:45.9870, lon:15.0950},
      {name:"Dobrepolje (občina)", lat:45.8540, lon:14.7080},
      {name:"Kuzma (občina)", lat:46.8350, lon:16.0800},
      {name:"Hodoš (občina)", lat:46.8310, lon:16.3210},
      {name:"Gorišnica (občina)", lat:46.4120, lon:16.0130},
      {name:"Cirkulane (občina)", lat:46.3300, lon:15.9940},
      {name:"Makole (občina)", lat:46.3170, lon:15.6660},
      {name:"Križevci (občina)", lat:46.5750, lon:16.1170},
      {name:"Dobrovnik (občina)", lat:46.6370, lon:16.3520},
      {name:"Veržej (občina)", lat:46.5840, lon:16.1650},
      {name:"Središče ob Dravi (občina)", lat:46.3950, lon:16.2700},
      {name:"Straža (občina)", lat:45.7800, lon:15.0720},
      {name:"Radeče (občina)", lat:46.0680, lon:15.1830},
      {name:"Bistrica ob Sotli (občina)", lat:46.0640, lon:15.6640},
      {name:"Komen (občina)", lat:45.8150, lon:13.7480},
      {name:"Komenda (občina)", lat:46.2030, lon:14.5410},
      {name:"Lukovica (občina)", lat:46.1690, lon:14.6970},
    ],
    5: [
      {name:"Osilnica (občina)", lat:45.5290, lon:14.6990},
      {name:"Kostel (občina)", lat:45.5010, lon:14.9100},
      {name:"Žetale (občina)", lat:46.2750, lon:15.7950},
      {name:"Solčava — Podolševa", lat:46.4080, lon:14.6610},
      {name:"Sv. Jurij ob Ščavnici (občina)", lat:46.5680, lon:16.0210},
      {name:"Trnovska vas (občina)", lat:46.5330, lon:15.8850},
      {name:"Šmarješke Toplice (občina)", lat:45.8680, lon:15.2340},
      {name:"Ribnica na Pohorju (občina)", lat:46.5350, lon:15.2730},
      {name:"Vuzenica (občina)", lat:46.5960, lon:15.1650},
      {name:"Gornji Petrovci (občina)", lat:46.8050, lon:16.2190},
      {name:"Kobilje (občina)", lat:46.6840, lon:16.3910},
      {name:"Velika Polana (občina)", lat:46.5760, lon:16.3460},
      {name:"Turnišče (občina)", lat:46.6160, lon:16.3160},
      {name:"Odranci (občina)", lat:46.5840, lon:16.2800},
      {name:"Apače (občina)", lat:46.6820, lon:15.9090},
      {name:"Sveti Tomaž (občina)", lat:46.4800, lon:16.0790},
      {name:"Markovci (občina)", lat:46.3920, lon:15.9400},
      {name:"Kidričevo (občina)", lat:46.4020, lon:15.7940},
      {name:"Braslovče (občina)", lat:46.2830, lon:15.0370},
      {name:"Benedikt (občina)", lat:46.6170, lon:15.8880},
    ],
  }
};

// ---------- Game state ----------
let currentMode = 'kraji';
let currentLevel = 1;
let questions = [];
let qIndex = 0;
let score = 0;
let numQuestions = 10;
let currentTarget = null;
let pendingGuess = null; // {lat, lon}

let playerName = '';
let leaderboard = loadBoard(); // array of entries

// ---------- UI events ----------
modeGroup.addEventListener('click', (e) => {
  if(!e.target.classList.contains('seg')) return;
  for (const b of modeGroup.querySelectorAll('.seg')) b.classList.remove('active');
  e.target.classList.add('active');
  currentMode = e.target.dataset.mode;

  // Preklop besedila v UI, da je jasno da si v občinah
  const isObcine = currentMode === 'obcine';
  uiMode.textContent = isObcine ? 'Občine' : 'Kraji';
  seekLabel.textContent = isObcine ? 'Iščeš občino:' : 'Iščeš:';
  findLabel.textContent = isObcine ? 'Poišči občino:' : 'Poišči:';
});

startBtn.addEventListener('click', () => {
  const typed = playerNameInput.value.trim();
  playerName = typed || loadName() || 'Gost';
  saveName(playerName);
  playerNameInput.value = playerName;

  currentLevel = parseInt(difficultySel.value, 10);
  numQuestions = parseInt(numQSel.value, 10);

  startOverlay.classList.remove('show');
  startLevel();
});

resetBtn.addEventListener('click', () => {
  clearGraphics();
  resetGameUI();
  startOverlay.classList.add('show');
});

confirmBtn.addEventListener('click', () => {
  if (!currentTarget || !pendingGuess) return;
  resolveGuess();
});

clearBoardBtn.addEventListener('click', () => {
  if(confirm('Res želiš počistiti scoreboard (lokalno)?')) {
    leaderboard = [];
    saveBoard(leaderboard);
    updateBoard();
  }
});

// ---------- Helpers ----------
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function kmDistance(a, b){
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
const toRad = d => d*Math.PI/180;
const scoreFromKm = (km) => Math.max(0, 5000 - Math.round(km * 25));

function updateBoard(){
  const el = document.getElementById('board');
  el.innerHTML = '';
  if(leaderboard.length === 0){
    const empty = document.createElement('div');
    empty.className = 'rowline';
    empty.innerHTML = `<span>Ni še rezultatov.</span><span class="tag">Začni igro</span>`;
    el.appendChild(empty);
    return;
  }
  const top = leaderboard.slice().sort((a,b)=>b.score-a.score).slice(0,10);
  top.forEach(item => {
    const row = document.createElement('div');
    row.className = 'rowline';
    const time = new Date(item.date).toLocaleString();
    row.innerHTML = `
      <div><strong>${item.player}</strong> • ${item.mode} • L${item.level}</div>
      <div><strong>${item.score}</strong> / ${item.total} <span class="tag">${time}</span></div>`;
    el.appendChild(row);
  });
}

function resetGameUI(){
  score = 0;
  qIndex = 0;
  questions = [];
  currentTarget = null;
  pendingGuess = null;
  uiPlayer.textContent = playerName || (loadName() || '—');
  uiMode.textContent = currentMode === 'obcine' ? 'Občine' : 'Kraji';
  uiLevel.textContent = '–';
  uiQ.textContent = '–/–';
  uiScore.textContent = '0';
  targetName.textContent = '—';
  topTarget.textContent = '—';
  feedback.textContent = '';
  feedback.className = 'feedback';
  confirmBtn.disabled = true;
  resetBtn.disabled = false;
}

function clearGraphics(){
  if(guessMarker){ map.removeLayer(guessMarker); guessMarker = null; }
  if(answerMarker){ map.removeLayer(answerMarker); answerMarker = null; }
  if(linkLine){ map.removeLayer(linkLine); linkLine = null; }
}

// ---------- Game flow ----------
function startLevel(){
  clearGraphics();
  const pool = DATA[currentMode][currentLevel];
  if(!pool || pool.length === 0){
    alert('Za to stopnjo še ni podatkov.');
    return;
  }
  const pick = shuffle(pool).slice(0, numQuestions);
  questions = pick;
  qIndex = 0;
  score = 0;

  uiPlayer.textContent = playerName;
  uiMode.textContent = currentMode === 'obcine' ? 'Občine' : 'Kraji';
  uiLevel.textContent = String(currentLevel);
  uiQ.textContent = `1/${questions.length}`;
  uiScore.textContent = String(score);

  map.fitBounds(slBoundsTight.pad(0.05));
  nextQuestion();
}

function nextQuestion(){
  clearGraphics();
  pendingGuess = null;
  confirmBtn.disabled = true;

  currentTarget = questions[qIndex];
  targetName.textContent = currentTarget.name;
  topTarget.textContent = currentTarget.name;

  const isObcine = currentMode === 'obcine';
  seekLabel.textContent = isObcine ? 'Iščeš občino:' : 'Iščeš:';
  findLabel.textContent = isObcine ? 'Poišči občino:' : 'Poišči:';

  feedback.textContent = 'Klikni na zemljevid, da postaviš marker, nato potrdi.';
  feedback.className = 'feedback';
}

map.on('click', (e) => {
  if(!currentTarget) return;
  pendingGuess = { lat: e.latlng.lat, lon: e.latlng.lng };

  if(guessMarker){ map.removeLayer(guessMarker); }
  guessMarker = L.circleMarker([pendingGuess.lat, pendingGuess.lon], {
    radius: 7, weight: 2, opacity: 1, fillOpacity: 0.9, color: '#7c5cff'
  }).addTo(map);

  confirmBtn.disabled = false;
  feedback.textContent = 'Marker postavljen. Pritisni "Potrdi" za oceno.';
});

function resolveGuess(){
  const g = pendingGuess;
  const t = { lat: currentTarget.lat, lon: currentTarget.lon };

  const distKm = kmDistance(g, t);
  const pts = scoreFromKm(distKm);
  score += pts;

  if(answerMarker){ map.removeLayer(answerMarker); }
  if(linkLine){ map.removeLayer(linkLine); }
  answerMarker = L.circleMarker([t.lat, t.lon], {
    radius: 7, weight: 2, opacity: 1, fillOpacity: 0.9, color: '#5cff8d'
  }).addTo(map);
  linkLine = L.polyline([[g.lat, g.lon], [t.lat, t.lon]], {
    weight: 2, opacity: 0.95, color: '#ffffff'
  }).addTo(map);

  uiScore.textContent = String(score);
  feedback.innerHTML = `Zgrešil si za <strong>${distKm.toFixed(1)} km</strong> → +<strong>${pts}</strong> točk.`;
  feedback.className = pts >= 3500 ? 'feedback ok' : 'feedback bad';

  qIndex += 1;
  uiQ.textContent = `${Math.min(qIndex, questions.length)}/${questions.length}`;

  confirmBtn.disabled = true;
  pendingGuess = null;

  if(qIndex < questions.length){
    setTimeout(nextQuestion, 900);
  } else {
    setTimeout(endLevel, 900);
  }
}

function endLevel(){
  const totalMax = 5000 * questions.length;
  const entry = {
    player: playerName || 'Gost',
    mode: currentMode === 'obcine' ? 'Občine' : 'Kraji',
    level: currentLevel,
    score,
    total: totalMax,
    date: Date.now()
  };
  leaderboard.push(entry);
  saveBoard(leaderboard);
  updateBoard();

  alert(`Konec stopnje!\n${entry.player}, tvoj rezultat: ${score} / ${totalMax}`);
  resetGameUI();
  startOverlay.classList.add('show');
}

// ---------- init ----------
(function init(){
  const saved = loadName();
  if(saved) playerNameInput.value = saved;

  updateBoard();
  resetGameUI();
})();
