/**
 * Smart Emoji Engine — MiniDora AI Chat
 *
 * 5 unique sprite sheets:
 *   sheet1: 3×5 grid, 1024×1536px — Activity stickers (camera, gaming, books...)
 *   sheet2: 3×5 grid, 1024×1536px — Warm/celebration stickers (love, chef, gifts...)
 *   sheet3: 3×5 grid, 1024×1536px — Emotion stickers (hearts, pizza, party...)
 *   sheet4: 5×5 grid, 1062×1008px — Round face emojis (25 expressions)
 *   sheet5: 3×5 grid, 1024×1536px — Action stickers (money, singing, detective...)
 */

// ─── Types ────────────────────────────────────────────────────

export type EmotionTag =
  | 'happy' | 'excited' | 'love' | 'celebration'
  | 'sad' | 'comfort' | 'confused' | 'thinking'
  | 'idea' | 'question' | 'angry' | 'frustrated'
  | 'neutral' | 'informational' | 'fun' | 'casual'
  | 'success' | 'greeting' | 'sleepy' | 'cool'
  | 'creative' | 'study' | 'tech' | 'food' | 'curious' | 'surprised';

export type ResponseTone =
  | 'happy' | 'excited' | 'sad' | 'comfort' | 'confused'
  | 'idea' | 'question' | 'success' | 'fun' | 'tech'
  | 'food' | 'angry' | 'study' | 'greeting' | 'sleepy'
  | 'cool' | 'neutral';

export interface DoraEmoji {
  id: string;
  sheetIndex: 1 | 2 | 3 | 4 | 5;
  col: number;   // 0-indexed column
  row: number;   // 0-indexed row
  cols: number;  // total columns in sheet
  rows: number;  // total rows in sheet
  emotion: EmotionTag[];
  label: string;
}

// ─── Emoji Map ───────────────────────────────────────────────
// Each sticker precisely mapped to sheet position

export const EMOJI_MAP: DoraEmoji[] = [
  // ── Sheet 1: Activity Stickers (3 cols × 5 rows) ──────────
  { id: 's1r0c0', sheetIndex: 1, col: 0, row: 0, cols: 3, rows: 5, emotion: ['fun', 'creative'],       label: 'Photographer' },
  { id: 's1r0c1', sheetIndex: 1, col: 1, row: 0, cols: 3, rows: 5, emotion: ['frustrated', 'sad'],     label: 'Hugging pillow' },
  { id: 's1r0c2', sheetIndex: 1, col: 2, row: 0, cols: 3, rows: 5, emotion: ['sad', 'comfort'],        label: 'Rainy umbrella' },
  { id: 's1r1c0', sheetIndex: 1, col: 0, row: 1, cols: 3, rows: 5, emotion: ['fun', 'excited'],        label: 'Gaming' },
  { id: 's1r1c1', sheetIndex: 1, col: 1, row: 1, cols: 3, rows: 5, emotion: ['casual', 'neutral'],     label: 'Sneezing' },
  { id: 's1r1c2', sheetIndex: 1, col: 2, row: 1, cols: 3, rows: 5, emotion: ['study', 'thinking'],     label: 'Reading books' },
  { id: 's1r2c0', sheetIndex: 1, col: 0, row: 2, cols: 3, rows: 5, emotion: ['confused', 'sad'],       label: 'Scared hiding' },
  { id: 's1r2c1', sheetIndex: 1, col: 1, row: 2, cols: 3, rows: 5, emotion: ['idea', 'thinking'],      label: 'Magic hat idea' },
  { id: 's1r2c2', sheetIndex: 1, col: 2, row: 2, cols: 3, rows: 5, emotion: ['idea', 'success'],       label: 'Lightbulb!' },
  { id: 's1r3c0', sheetIndex: 1, col: 0, row: 3, cols: 3, rows: 5, emotion: ['happy', 'study'],        label: 'Happy with books' },
  { id: 's1r3c1', sheetIndex: 1, col: 1, row: 3, cols: 3, rows: 5, emotion: ['informational', 'thinking'], label: 'Doctor thinking' },
  { id: 's1r3c2', sheetIndex: 1, col: 2, row: 3, cols: 3, rows: 5, emotion: ['curious', 'question'],   label: 'Binoculars' },
  { id: 's1r4c0', sheetIndex: 1, col: 0, row: 4, cols: 3, rows: 5, emotion: ['fun', 'happy'],          label: 'Winking' },
  { id: 's1r4c1', sheetIndex: 1, col: 1, row: 4, cols: 3, rows: 5, emotion: ['happy', 'excited'],      label: 'Big laugh' },
  { id: 's1r4c2', sheetIndex: 1, col: 2, row: 4, cols: 3, rows: 5, emotion: ['informational', 'study'], label: 'Reading paper' },

  // ── Sheet 2: Warm/Celebration Stickers (3 cols × 5 rows) ──
  { id: 's2r0c0', sheetIndex: 2, col: 0, row: 0, cols: 3, rows: 5, emotion: ['love', 'happy'],         label: 'Big heart' },
  { id: 's2r0c1', sheetIndex: 2, col: 1, row: 0, cols: 3, rows: 5, emotion: ['food', 'fun'],           label: 'Chef pancakes' },
  { id: 's2r0c2', sheetIndex: 2, col: 2, row: 0, cols: 3, rows: 5, emotion: ['happy', 'casual'],       label: 'Moon dreaming' },
  { id: 's2r1c0', sheetIndex: 2, col: 0, row: 1, cols: 3, rows: 5, emotion: ['cool', 'fun'],           label: 'Sunglasses cool' },
  { id: 's2r1c1', sheetIndex: 2, col: 1, row: 1, cols: 3, rows: 5, emotion: ['tech', 'informational'], label: 'Tablet study' },
  { id: 's2r1c2', sheetIndex: 2, col: 2, row: 1, cols: 3, rows: 5, emotion: ['happy', 'greeting'],     label: 'Flowers greeting' },
  { id: 's2r2c0', sheetIndex: 2, col: 0, row: 2, cols: 3, rows: 5, emotion: ['excited', 'success'],    label: 'On fire pumped' },
  { id: 's2r2c1', sheetIndex: 2, col: 1, row: 2, cols: 3, rows: 5, emotion: ['tech', 'study'],         label: 'Laptop working' },
  { id: 's2r2c2', sheetIndex: 2, col: 2, row: 2, cols: 3, rows: 5, emotion: ['comfort', 'sleepy'],     label: 'Cozy blanket' },
  { id: 's2r3c0', sheetIndex: 2, col: 0, row: 3, cols: 3, rows: 5, emotion: ['love', 'celebration'],   label: 'Gift & hearts' },
  { id: 's2r3c1', sheetIndex: 2, col: 1, row: 3, cols: 3, rows: 5, emotion: ['fun', 'casual'],         label: 'Popcorn movie' },
  { id: 's2r3c2', sheetIndex: 2, col: 2, row: 3, cols: 3, rows: 5, emotion: ['celebration', 'excited'], label: 'Gifts pile' },
  { id: 's2r4c0', sheetIndex: 2, col: 0, row: 4, cols: 3, rows: 5, emotion: ['food', 'happy'],         label: 'Holding food' },
  { id: 's2r4c1', sheetIndex: 2, col: 1, row: 4, cols: 3, rows: 5, emotion: ['celebration', 'excited'], label: 'Party surrounded' },
  { id: 's2r4c2', sheetIndex: 2, col: 2, row: 4, cols: 3, rows: 5, emotion: ['happy', 'celebration'],  label: 'Super happy' },

  // ── Sheet 3: Emotion Stickers (3 cols × 5 rows) ───────────
  { id: 's3r0c0', sheetIndex: 3, col: 0, row: 0, cols: 3, rows: 5, emotion: ['love', 'happy'],         label: 'Hearts exploding' },
  { id: 's3r0c1', sheetIndex: 3, col: 1, row: 0, cols: 3, rows: 5, emotion: ['success', 'happy'],      label: 'Thumbs up!' },
  { id: 's3r0c2', sheetIndex: 3, col: 2, row: 0, cols: 3, rows: 5, emotion: ['love', 'comfort'],       label: 'Love hug' },
  { id: 's3r1c0', sheetIndex: 3, col: 0, row: 1, cols: 3, rows: 5, emotion: ['sleepy', 'casual'],      label: 'Cozy with bear' },
  { id: 's3r1c1', sheetIndex: 3, col: 1, row: 1, cols: 3, rows: 5, emotion: ['thinking', 'question'],  label: 'Thinking on phone' },
  { id: 's3r1c2', sheetIndex: 3, col: 2, row: 1, cols: 3, rows: 5, emotion: ['confused', 'question'],  label: 'Confused shy' },
  { id: 's3r2c0', sheetIndex: 3, col: 0, row: 2, cols: 3, rows: 5, emotion: ['tech', 'idea'],          label: 'Laptop lightbulb' },
  { id: 's3r2c1', sheetIndex: 3, col: 1, row: 2, cols: 3, rows: 5, emotion: ['excited', 'fun'],        label: 'Unboxing!' },
  { id: 's3r2c2', sheetIndex: 3, col: 2, row: 2, cols: 3, rows: 5, emotion: ['excited', 'surprised'],  label: 'Shocked confetti' },
  { id: 's3r3c0', sheetIndex: 3, col: 0, row: 3, cols: 3, rows: 5, emotion: ['food', 'casual'],        label: 'Pizza time' },
  { id: 's3r3c1', sheetIndex: 3, col: 1, row: 3, cols: 3, rows: 5, emotion: ['cool', 'neutral'],       label: 'Cool shades' },
  { id: 's3r3c2', sheetIndex: 3, col: 2, row: 3, cols: 3, rows: 5, emotion: ['fun', 'happy'],          label: 'Peeping from box' },
  { id: 's3r4c0', sheetIndex: 3, col: 0, row: 4, cols: 3, rows: 5, emotion: ['food', 'fun'],           label: 'Pizza snack' },
  { id: 's3r4c1', sheetIndex: 3, col: 1, row: 4, cols: 3, rows: 5, emotion: ['love', 'celebration'],   label: 'Gift box surprise' },
  { id: 's3r4c2', sheetIndex: 3, col: 2, row: 4, cols: 3, rows: 5, emotion: ['celebration', 'excited'], label: 'Party pizza' },

  // ── Sheet 4: Round Face Emojis (5 cols × 5 rows) ──────────
  // Row 0: neutral, grumpy, angry, shocked, embarrassed
  { id: 's4r0c0', sheetIndex: 4, col: 0, row: 0, cols: 5, rows: 5, emotion: ['neutral', 'greeting'],   label: 'Neutral face' },
  { id: 's4r0c1', sheetIndex: 4, col: 1, row: 0, cols: 5, rows: 5, emotion: ['frustrated', 'sad'],     label: 'Grumpy face' },
  { id: 's4r0c2', sheetIndex: 4, col: 2, row: 0, cols: 5, rows: 5, emotion: ['angry', 'frustrated'],   label: 'Angry steaming' },
  { id: 's4r0c3', sheetIndex: 4, col: 3, row: 0, cols: 5, rows: 5, emotion: ['confused', 'excited'],   label: 'Shocked eyes' },
  { id: 's4r0c4', sheetIndex: 4, col: 4, row: 0, cols: 5, rows: 5, emotion: ['sad', 'confused'],       label: 'Embarrassed blush' },
  // Row 1: thumbs up, thumbs down, love eyes, wink-think, skeptical
  { id: 's4r1c0', sheetIndex: 4, col: 0, row: 1, cols: 5, rows: 5, emotion: ['success', 'happy'],      label: 'Thumbs up face' },
  { id: 's4r1c1', sheetIndex: 4, col: 1, row: 1, cols: 5, rows: 5, emotion: ['sad', 'frustrated'],     label: 'Thumbs down' },
  { id: 's4r1c2', sheetIndex: 4, col: 2, row: 1, cols: 5, rows: 5, emotion: ['love', 'excited'],       label: 'Heart eyes' },
  { id: 's4r1c3', sheetIndex: 4, col: 3, row: 1, cols: 5, rows: 5, emotion: ['thinking', 'idea'],      label: 'Thinking wink' },
  { id: 's4r1c4', sheetIndex: 4, col: 4, row: 1, cols: 5, rows: 5, emotion: ['confused', 'question'],  label: 'Skeptical squint' },
  // Row 2: star eyes, laughing-cry, crying, laptop, sleepy moon
  { id: 's4r2c0', sheetIndex: 4, col: 0, row: 2, cols: 5, rows: 5, emotion: ['excited', 'happy'],      label: 'Star-struck' },
  { id: 's4r2c1', sheetIndex: 4, col: 1, row: 2, cols: 5, rows: 5, emotion: ['fun', 'happy'],          label: 'Laugh-crying' },
  { id: 's4r2c2', sheetIndex: 4, col: 2, row: 2, cols: 5, rows: 5, emotion: ['sad', 'comfort'],        label: 'Crying face' },
  { id: 's4r2c3', sheetIndex: 4, col: 3, row: 2, cols: 5, rows: 5, emotion: ['tech', 'study'],         label: 'Working laptop' },
  { id: 's4r2c4', sheetIndex: 4, col: 4, row: 2, cols: 5, rows: 5, emotion: ['sleepy', 'casual'],      label: 'Sleepy zzz' },
  // Row 3: party, sunglasses, singing, eating noodles, big eyes
  { id: 's4r3c0', sheetIndex: 4, col: 0, row: 3, cols: 5, rows: 5, emotion: ['celebration', 'excited'], label: 'Party hat' },
  { id: 's4r3c1', sheetIndex: 4, col: 1, row: 3, cols: 5, rows: 5, emotion: ['cool', 'fun'],           label: 'Cool shades face' },
  { id: 's4r3c2', sheetIndex: 4, col: 2, row: 3, cols: 5, rows: 5, emotion: ['fun', 'creative'],       label: 'Singing face' },
  { id: 's4r3c3', sheetIndex: 4, col: 3, row: 3, cols: 5, rows: 5, emotion: ['food', 'happy'],         label: 'Eating noodles' },
  { id: 's4r3c4', sheetIndex: 4, col: 4, row: 3, cols: 5, rows: 5, emotion: ['confused', 'question'],  label: 'Big curious eyes' },
  // Row 4 (if exists — 5×5=25)
  // Based on the image: row4 appears blank/unused - skip to avoid empty cells

  // ── Sheet 5: Action Stickers (3 cols × 5 rows) ────────────
  { id: 's5r0c0', sheetIndex: 5, col: 0, row: 0, cols: 3, rows: 5, emotion: ['happy', 'neutral'],      label: 'Sparkle hello' },
  { id: 's5r0c1', sheetIndex: 5, col: 1, row: 0, cols: 3, rows: 5, emotion: ['excited', 'fun'],        label: 'Holding money' },
  { id: 's5r0c2', sheetIndex: 5, col: 2, row: 0, cols: 3, rows: 5, emotion: ['casual', 'comfort'],     label: 'Hot coffee cozy' },
  { id: 's5r1c0', sheetIndex: 5, col: 0, row: 1, cols: 3, rows: 5, emotion: ['fun', 'happy'],          label: 'Taking selfie' },
  { id: 's5r1c1', sheetIndex: 5, col: 1, row: 1, cols: 3, rows: 5, emotion: ['fun', 'creative'],       label: 'Singing mic' },
  { id: 's5r1c2', sheetIndex: 5, col: 2, row: 1, cols: 3, rows: 5, emotion: ['curious', 'thinking'],   label: 'Peeking from wall' },
  { id: 's5r2c0', sheetIndex: 5, col: 0, row: 2, cols: 3, rows: 5, emotion: ['angry', 'frustrated'],   label: 'Rage flames' },
  { id: 's5r2c1', sheetIndex: 5, col: 1, row: 2, cols: 3, rows: 5, emotion: ['sleepy', 'casual'],      label: 'Sleeping ZZZ' },
  { id: 's5r2c2', sheetIndex: 5, col: 2, row: 2, cols: 3, rows: 5, emotion: ['informational', 'study'], label: 'Doctor with soup' },
  { id: 's5r3c0', sheetIndex: 5, col: 0, row: 3, cols: 3, rows: 5, emotion: ['celebration', 'happy'],  label: 'Celebrating yay' },
  { id: 's5r3c1', sheetIndex: 5, col: 1, row: 3, cols: 3, rows: 5, emotion: ['thinking', 'curious'],   label: 'Detective magnifier' },
  { id: 's5r3c2', sheetIndex: 5, col: 2, row: 3, cols: 3, rows: 5, emotion: ['food', 'fun'],           label: 'Chef cooking' },
  { id: 's5r4c0', sheetIndex: 5, col: 0, row: 4, cols: 3, rows: 5, emotion: ['success', 'question'],   label: 'Thumbs up wink' },
  { id: 's5r4c1', sheetIndex: 5, col: 1, row: 4, cols: 3, rows: 5, emotion: ['love', 'celebration'],   label: 'Giving gift' },
  { id: 's5r4c2', sheetIndex: 5, col: 2, row: 4, cols: 3, rows: 5, emotion: ['fun', 'casual'],         label: 'Boat adventure' },
];

// ─── Tone → Emotion mapping ───────────────────────────────────

const TONE_TO_EMOTIONS: Record<ResponseTone, EmotionTag[]> = {
  happy:    ['happy', 'excited', 'celebration'],
  excited:  ['excited', 'celebration', 'happy'],
  sad:      ['sad', 'comfort', 'love'],
  comfort:  ['comfort', 'love', 'sad'],
  confused: ['confused', 'question', 'thinking'],
  idea:     ['idea', 'thinking', 'excited'],
  question: ['thinking', 'question', 'curious'],
  success:  ['success', 'celebration', 'excited', 'happy'],
  fun:      ['fun', 'casual', 'excited', 'creative'],
  tech:     ['tech', 'study', 'idea', 'thinking'],
  food:     ['food', 'fun', 'casual'],
  angry:    ['comfort', 'love', 'sad'],        // when user is angry → comfort
  study:    ['study', 'informational', 'thinking', 'idea'],
  greeting: ['greeting', 'happy', 'love'],
  sleepy:   ['sleepy', 'casual', 'comfort'],
  cool:     ['cool', 'fun', 'excited'],
  neutral:  ['neutral', 'informational', 'casual'],
};

// ─── Emotion detection (keyword-based) ───────────────────────

const PATTERNS: Record<ResponseTone, RegExp> = {
  greeting: /\b(hello|hi|hey|welcome|good morning|good evening|good night|greet|nice to meet)\b/i,
  food:     /\b(eat|food|cook|recipe|dorayaki|pancake|pizza|delicious|hungry|meal|taste|snack|drink)\b/i,
  sleepy:   /\b(tired|sleep|rest|nap|zzz|night|late|exhausted|drowsy|bedtime)\b/i,
  angry:    /\b(wrong|terrible|awful|hate|frustrated|annoyed|not working|broken|worst|ridiculous|useless)\b/i,
  sad:      /\b(sorry|sad|difficult|struggle|pain|hurt|worry|afraid|anxious|stressed|tough|lost|stuck)\b/i,
  success:  /\b(done|complete|finished|solved|fixed|worked|works|success|achieved|accomplished|great job|well done|perfect)\b/i,
  happy:    /\b(great|amazing|wonderful|excellent|awesome|congrats|fantastic|brilliant|love it|so glad|enjoy|yay)\b/i,
  fun:      /\b(fun|joke|haha|lol|funny|laugh|play|game|whoa|wow|neat|sweet|cool|awesome)\b/i,
  tech:     /\b(code|program|app|software|function|error|bug|debug|install|run|build|api|server|data|file|repo|git)\b/i,
  study:    /\b(learn|study|read|research|understand|knowledge|explain|teach|topic|information|fact|summary|lecture)\b/i,
  idea:     /\b(idea|suggest|consider|maybe|perhaps|here's|tip|trick|try|approach|solution|could|let me show)\b/i,
  question: /\b(why|how|what|when|where|which|who|can you|could you|explain|understand|tell me)\b/i,
  comfort:  /\b(don't worry|it's okay|no problem|take care|here for you|support|calm|relax|gentle|breathe|you got this)\b/i,
  cool:     /\b(cool|chill|nice|slick|smooth|stylish|swag)\b/i,
  excited:  /\b(exciting|thrilled|can't wait|pumped|stoked|amazing|incredible|unbelievable)\b/i,
  confused: /\b(confused|unsure|unclear|not sure|don't understand|what does|what is|hmm|interesting)\b/i,
  neutral:  /./,  // fallback
};

export function detectTone(userMsg: string, aiResponse: string): ResponseTone {
  const combined = userMsg + ' ' + aiResponse;
  const userOnly = userMsg;

  // Order matters — more specific first
  if (PATTERNS.greeting.test(combined) && aiResponse.length < 220) return 'greeting';
  if (PATTERNS.angry.test(userOnly)) return 'angry';
  if (PATTERNS.sad.test(userOnly)) return 'sad';
  if (PATTERNS.success.test(aiResponse)) return 'success';
  if (PATTERNS.happy.test(aiResponse)) return 'happy';
  if (PATTERNS.fun.test(combined) && !PATTERNS.tech.test(combined)) return 'fun';
  if (PATTERNS.food.test(combined)) return 'food';
  if (PATTERNS.tech.test(combined)) return 'tech';
  if (PATTERNS.study.test(combined)) return 'study';
  if (PATTERNS.sleepy.test(combined)) return 'sleepy';
  if (PATTERNS.idea.test(aiResponse)) return 'idea';
  if (PATTERNS.comfort.test(aiResponse)) return 'comfort';
  if (PATTERNS.confused.test(combined)) return 'confused';
  if (PATTERNS.question.test(userOnly)) return 'question';
  if (PATTERNS.cool.test(combined)) return 'cool';
  return 'neutral';
}

// ─── Feedback state ───────────────────────────────────────────

interface FeedbackState {
  positiveStreak: number;
  negativeStreak: number;
  lastUsedIds: string[];
  reducedMode: boolean;
}

const state: FeedbackState = {
  positiveStreak: 0,
  negativeStreak: 0,
  lastUsedIds: [],
  reducedMode: false,
};

export function recordFeedback(type: 'positive' | 'negative') {
  if (type === 'positive') {
    state.positiveStreak++;
    state.negativeStreak = 0;
    state.reducedMode = false;
  } else {
    state.negativeStreak++;
    state.positiveStreak = 0;
    if (state.negativeStreak >= 2) state.reducedMode = true;
  }
}

// ─── Main selection ───────────────────────────────────────────

export function selectEmoji(
  userMsg: string,
  aiResponse: string,
  isProfessional = false,
): DoraEmoji | null {
  // Skip for very short responses
  if (!aiResponse || aiResponse.trim().length < 25) return null;

  // Professional characters (Atlas, Zero): 35% skip
  if (isProfessional && Math.random() < 0.35) return null;

  // Reduced mode (user gave 👎 twice): 55% skip + prefer calm emojis
  if (state.reducedMode && Math.random() < 0.55) return null;

  const tone = detectTone(userMsg, aiResponse);

  // Neutral short responses: 45% skip
  if (tone === 'neutral' && aiResponse.length < 120 && Math.random() < 0.45) return null;

  const targetEmotions = state.reducedMode
    ? (['comfort', 'neutral', 'informational', 'thinking'] as EmotionTag[])
    : TONE_TO_EMOTIONS[tone];

  // Filter candidates: must match emotion AND not recently used
  let candidates = EMOJI_MAP.filter(e =>
    e.emotion.some(em => targetEmotions.includes(em)) &&
    !state.lastUsedIds.slice(-8).includes(e.id)
  );

  // Fallback: any non-recently-used emoji
  if (candidates.length === 0) {
    candidates = EMOJI_MAP.filter(e => !state.lastUsedIds.slice(-5).includes(e.id));
  }
  if (candidates.length === 0) candidates = EMOJI_MAP;

  // Pick randomly from top matches (don't always pick same first match)
  const pool = candidates.slice(0, Math.min(candidates.length, 8));
  const pick = pool[Math.floor(Math.random() * pool.length)];

  // Track usage
  state.lastUsedIds.push(pick.id);
  if (state.lastUsedIds.length > 12) state.lastUsedIds.shift();

  return pick;
}

export function shouldShowSecondEmoji(aiResponse: string, tone: ResponseTone): boolean {
  if (state.reducedMode) return false;
  const excitedTones: ResponseTone[] = ['happy', 'excited', 'fun', 'success', 'greeting'];
  return excitedTones.includes(tone) && aiResponse.length > 180 && Math.random() < 0.28;
}

export { state as emojiState };
