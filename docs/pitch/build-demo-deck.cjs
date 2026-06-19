const path = require('path');
const pptxgen = require('pptxgenjs');

const root = path.resolve(__dirname, '../..');
const out = path.join(__dirname, 'strike5-demo-deck.pptx');
const logo = path.join(root, 'public/strike5-mark.png');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Strike5';
pptx.company = 'Strike5';
pptx.subject = 'Strike5 product demo deck';
pptx.title = 'Strike5';
pptx.lang = 'en-US';
pptx.theme = {
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  lang: 'en-US',
};
pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
pptx.layout = 'WIDE';

const C = {
  bg: '071826',
  panel: '0B2233',
  panel2: '12364D',
  line: '23536F',
  text: 'F4F9FF',
  muted: '9CB7CA',
  cyan: '22D3EE',
  mint: '53D99A',
  red: 'EF4444',
};

function addBg(slide) {
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    line: { color: C.bg, transparency: 100 },
    fill: { color: C.bg },
  });
  slide.addShape(pptx.ShapeType.arc, {
    x: -1.1,
    y: -1.2,
    w: 5.2,
    h: 3.4,
    adjustPoint: 0.15,
    line: { color: C.cyan, transparency: 100 },
    fill: { color: C.cyan, transparency: 86 },
  });
  slide.addShape(pptx.ShapeType.arc, {
    x: 9.4,
    y: 5.6,
    w: 5.2,
    h: 3.4,
    adjustPoint: 0.15,
    line: { color: C.mint, transparency: 100 },
    fill: { color: C.mint, transparency: 90 },
  });
}

function logoLockup(slide, x = 0.6, y = 0.42) {
  slide.addImage({ path: logo, x, y, w: 0.42, h: 0.58 });
  slide.addText('Strike5', {
    x: x + 0.52,
    y: y + 0.05,
    w: 1.7,
    h: 0.36,
    fontFace: 'Arial',
    fontSize: 18,
    bold: true,
    color: C.text,
    margin: 0,
  });
}

function footer(slide, label) {
  slide.addText(label, {
    x: 0.6,
    y: 6.95,
    w: 4.8,
    h: 0.22,
    fontSize: 8.5,
    color: C.muted,
    margin: 0,
  });
  slide.addText('Powered by DeepBook Predict on Sui', {
    x: 8.7,
    y: 6.95,
    w: 4.0,
    h: 0.22,
    fontSize: 8.5,
    color: C.muted,
    align: 'right',
    margin: 0,
  });
}

function title(slide, text, subtitle) {
  slide.addText(text, {
    x: 0.6,
    y: 1.1,
    w: 7.4,
    h: 0.62,
    fontFace: 'Arial',
    fontSize: 29,
    bold: true,
    color: C.text,
    margin: 0,
    fit: 'shrink',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.62,
      y: 1.82,
      w: 6.8,
      h: 0.48,
      fontSize: 14,
      color: C.muted,
      breakLine: false,
      margin: 0,
      fit: 'shrink',
    });
  }
}

function card(slide, x, y, w, h, heading, body, accent = C.cyan) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    line: { color: C.line, transparency: 25, width: 1 },
    fill: { color: C.panel, transparency: 6 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w: 0.045,
    h,
    line: { color: accent, transparency: 100 },
    fill: { color: accent },
  });
  slide.addText(heading, {
    x: x + 0.22,
    y: y + 0.22,
    w: w - 0.42,
    h: 0.28,
    fontSize: 15,
    bold: true,
    color: C.text,
    margin: 0,
    fit: 'shrink',
  });
  slide.addText(body, {
    x: x + 0.22,
    y: y + 0.68,
    w: w - 0.42,
    h: h - 0.82,
    fontSize: 11.5,
    color: C.muted,
    valign: 'top',
    breakLine: false,
    margin: 0,
    fit: 'shrink',
  });
}

function addSlide(pageLabel, build) {
  const slide = pptx.addSlide();
  addBg(slide);
  logoLockup(slide);
  build(slide);
  footer(slide, pageLabel);
}

addSlide('01 / Product', (slide) => {
  slide.addImage({ path: logo, x: 0.7, y: 1.32, w: 1.18, h: 1.62 });
  slide.addText('Strike5', {
    x: 2.1,
    y: 1.28,
    w: 5.2,
    h: 0.72,
    fontFace: 'Arial',
    fontSize: 42,
    bold: true,
    color: C.text,
    margin: 0,
  });
  slide.addText('A short-cycle BTC prediction arena powered by DeepBook Predict on Sui.', {
    x: 2.12,
    y: 2.12,
    w: 6.4,
    h: 0.52,
    fontSize: 17,
    color: C.muted,
    margin: 0,
    fit: 'shrink',
  });
  card(
    slide,
    0.7,
    3.42,
    3.7,
    1.35,
    'Real Predict positions',
    'Orders are priced, minted, redeemed, and settled through DeepBook Predict on Sui testnet.',
    C.cyan,
  );
  card(
    slide,
    4.78,
    3.42,
    3.7,
    1.35,
    'Continuous arena loop',
    'Users can track live PnL, cash out early, or hold to oracle settlement.',
    C.mint,
  );
  card(
    slide,
    8.86,
    3.42,
    3.7,
    1.35,
    'Social trading layer',
    'Streaks, opt-in rankings, and verified posts turn one-off predictions into repeat behavior.',
    C.cyan,
  );
});

addSlide('02 / Market Gap', (slide) => {
  title(
    slide,
    'Prediction markets need more than event boards.',
    'Most prediction apps are slow to settle, fragmented in liquidity, and thin in repeat user behavior.',
  );
  card(slide, 0.7, 2.72, 3.72, 1.55, 'Shallow product loop', 'Users make a pick, wait for settlement, and leave.', C.red);
  card(slide, 4.82, 2.72, 3.72, 1.55, 'Weak liquidity story', 'Order books and isolated markets make it hard to guarantee a smooth trade.', C.cyan);
  card(slide, 8.94, 2.72, 3.72, 1.55, 'Limited composability', 'Social mechanics often sit off-chain and do not map back to real position state.', C.mint);
  slide.addText('Strike5 focuses on the missing product layer: fast user interaction on top of real protocol liquidity.', {
    x: 1.2,
    y: 5.35,
    w: 10.9,
    h: 0.48,
    fontSize: 18,
    bold: true,
    color: C.text,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  });
});

addSlide('03 / Product Loop', (slide) => {
  title(slide, 'A trading loop users can repeat.', 'Every interaction starts with a real Predict quote and ends in position-aware arena state.');
  const steps = [
    ['Connect', 'Sui wallet + PredictManager'],
    ['Choose', 'Above, Below, or Range'],
    ['Quote', 'Cost, payout, live redeem'],
    ['Sign', 'Sui transaction'],
    ['Manage', 'PnL, cash out, settlement'],
    ['Compete', 'Streak, feed, leaderboard'],
  ];
  steps.forEach(([head, body], i) => {
    const x = 0.72 + (i % 3) * 4.12;
    const y = i < 3 ? 2.62 : 4.48;
    card(slide, x, y, 3.55, 1.25, `${i + 1}. ${head}`, body, i % 2 === 0 ? C.cyan : C.mint);
    if (i % 3 !== 2) {
      slide.addText('->', { x: x + 3.62, y: y + 0.42, w: 0.36, h: 0.2, color: C.muted, fontSize: 14, margin: 0 });
    }
  });
});

addSlide('04 / Architecture', (slide) => {
  title(slide, 'Strike5 sits above DeepBook Predict.', 'The product layer stays lightweight while pricing, settlement, and liquidity remain protocol-native.');
  const nodes = [
    [0.8, 3.02, 2.2, 'Sui Wallet'],
    [3.5, 3.02, 2.4, 'Strike5 App'],
    [6.42, 3.02, 2.65, 'DeepBook Predict'],
    [9.75, 2.15, 2.5, 'OracleSVI'],
    [9.75, 3.35, 2.5, 'PredictManager'],
    [9.75, 4.55, 2.5, 'Vault / PLP'],
  ];
  nodes.forEach(([x, y, w, label], i) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h: 0.68,
      rectRadius: 0.08,
      line: { color: i === 2 ? C.cyan : C.line, width: 1.2 },
      fill: { color: i === 2 ? C.panel2 : C.panel, transparency: 4 },
    });
    slide.addText(label, {
      x: x + 0.12,
      y: y + 0.19,
      w: w - 0.24,
      h: 0.2,
      fontSize: 13,
      bold: true,
      color: C.text,
      align: 'center',
      margin: 0,
      fit: 'shrink',
    });
  });
  const arrows = [
    [3.05, 3.36, 3.45, 3.36],
    [5.95, 3.36, 6.37, 3.36],
    [9.1, 3.36, 9.65, 2.5],
    [9.1, 3.36, 9.65, 3.68],
    [9.1, 3.36, 9.65, 4.86],
  ];
  arrows.forEach(([x1, y1, x2, y2]) => {
    slide.addShape(pptx.ShapeType.line, {
      x: x1,
      y: y1,
      w: x2 - x1,
      h: y2 - y1,
      line: { color: C.cyan, width: 1.5, beginArrowType: 'none', endArrowType: 'triangle' },
    });
  });
  card(slide, 0.8, 5.55, 11.45, 0.72, 'Data truth', 'The UI reconciles indexed position data, oracle state, transaction results, and local pending state before rendering user-facing arena stats.', C.mint);
});

addSlide('05 / Live Demo Cues', (slide) => {
  title(slide, 'What the live app proves.', 'The demo should show the protocol path first, then the arena loop.');
  card(slide, 0.7, 2.45, 3.7, 1.5, 'Trading page', 'Oracle spot, active round, BTC chart, liquidity, wallet state, and quote preview.', C.cyan);
  card(slide, 4.82, 2.45, 3.7, 1.5, 'Position lifecycle', 'Open position, live PnL, early cash-out, settlement, and redeem state.', C.mint);
  card(slide, 8.94, 2.45, 3.7, 1.5, 'Community loop', 'Streak combo, opt-in leaderboard, verified feed, and sealed calls.', C.cyan);
  slide.addText('Narrative rule: first prove the trade is real, then show why users come back.', {
    x: 1.05,
    y: 5.35,
    w: 11.1,
    h: 0.42,
    fontSize: 18,
    bold: true,
    color: C.text,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  });
});

addSlide('06 / Why It Matters', (slide) => {
  title(slide, 'A consumer loop for protocol liquidity.', 'Strike5 converts DeepBook Predict infrastructure into repeatable user behavior.');
  card(slide, 0.78, 2.58, 3.55, 1.4, 'For users', 'Fixed-risk BTC predictions with fast feedback and a clear position lifecycle.', C.cyan);
  card(slide, 4.88, 2.58, 3.55, 1.4, 'For DeepBook Predict', 'More PredictManager activity, more dUSDC usage, and more vault-facing trade flow.', C.mint);
  card(slide, 8.98, 2.58, 3.55, 1.4, 'For Sui DeFi', 'A composable product surface around real oracle, vault, and wallet primitives.', C.cyan);
  slide.addText('Real liquidity. Real settlement. Repeatable arena behavior.', {
    x: 1.1,
    y: 5.18,
    w: 11.1,
    h: 0.56,
    fontFace: 'Arial',
    fontSize: 25,
    bold: true,
    color: C.text,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  });
});

pptx.writeFile({ fileName: out });
