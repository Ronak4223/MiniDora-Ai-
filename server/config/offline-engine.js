/**
 * MiniDora Offline Response Engine
 * 3-layer fallback: API → Smart Fallback → Offline Rule Engine
 *
 * Handles: intent detection, emotion detection, keyword matching
 * Returns responses fully in-character as MiniDora
 */

// ── Intent classification ─────────────────────────────────────
const INTENTS = {
  greeting:    /\b(hi|hello|hey|hiya|howdy|sup|greetings|good\s*(morning|evening|night|day))\b/i,
  goodbye:     /\b(bye|goodbye|see\s*you|cya|later|take\s*care|farewell|gotta\s*go)\b/i,
  feeling_sad: /\b(sad|unhappy|depressed|upset|cry|crying|tears|heartbroken|down|blue|miserable|lonely|alone|hopeless)\b/i,
  feeling_happy: /\b(happy|great|amazing|wonderful|excited|joy|fantastic|awesome|love|celebrate|yay|thrilled)\b/i,
  feeling_stressed: /\b(stress|anxious|anxiety|worried|overwhelm|panic|nervous|scared|fear|dread|burnout|exhausted|tired)\b/i,
  feeling_angry: /\b(angry|mad|furious|annoyed|irritated|rage|hate|frustrated|ugh|argh)\b/i,
  asking_help:   /\b(help|assist|support|guide|explain|show|teach|how\s*do|how\s*to|what\s*is|tell\s*me|can\s*you)\b/i,
  asking_joke:   /\b(joke|funny|laugh|humor|make\s*me\s*laugh|cheer\s*up|something\s*funny)\b/i,
  asking_food:   /\b(food|eat|hungry|snack|recipe|cook|dorayaki|cake|doracake|pancake|treat|meal)\b/i,
  asking_future: /\b(future|22nd\s*century|tomorrow|technology|robot|gadget|invention|advance)\b/i,
  asking_about_me: /\b(who\s*are\s*you|what\s*are\s*you|tell\s*me\s*about\s*yourself|your\s*name|introduce)/i,
  asking_bored:  /\b(bored|boring|nothing\s*to\s*do|entertain|fun|play|game)\b/i,
  asking_weather: /\b(weather|rain|sunny|hot|cold|temperature|forecast)\b/i,
  asking_advice: /\b(advice|suggest|recommend|should\s*i|what\s*do\s*you\s*think|opinion|thoughts)\b/i,
  thanks:        /\b(thanks|thank\s*you|thank\s*u|thx|ty|appreciate|grateful)\b/i,
  asking_motivation: /\b(motivat|inspire|confidence|can\s*i|believe|give\s*up|keep\s*going|encourage)\b/i,
  compliment:    /\b(you're\s*(great|amazing|awesome|smart|cool|helpful|cute)|love\s*you|good\s*job|well\s*done)\b/i,
};

// ── Emotion detection ─────────────────────────────────────────
export function detectEmotion(text) {
  const t = text.toLowerCase();
  if (INTENTS.feeling_sad.test(t) || INTENTS.feeling_stressed.test(t)) return 'worried';
  if (INTENTS.feeling_happy.test(t) || INTENTS.compliment.test(t)) return 'excited';
  if (INTENTS.feeling_angry.test(t)) return 'worried';
  if (INTENTS.asking_joke.test(t) || INTENTS.asking_bored.test(t)) return 'playful';
  if (INTENTS.greeting.test(t)) return 'happy';
  if (INTENTS.thanks.test(t)) return 'happy';
  if (INTENTS.asking_food.test(t)) return 'excited';
  if (INTENTS.asking_about_me.test(t)) return 'happy';
  if (INTENTS.asking_future.test(t)) return 'curious';
  if (INTENTS.asking_help.test(t)) return 'curious';
  return 'neutral';
}

// ── Response pools ────────────────────────────────────────────
const RESPONSES = {
  greeting: [
    "Heyyy! 🐾 MiniDora is HERE and ready for adventures! What's on your mind today?",
    "Oh! A visitor! *tail wag intensifies* 🤖✨ Hi there! I've been waiting for someone to chat with. What's up?",
    "Greetings from the 22nd century! 🚀 (Well, sort of — I'm stationed here for now.) How can I help?",
    "*pops up from imaginary pocket dimension* 😄 Hey! Perfect timing. What do you need, friend?",
  ],
  goodbye: [
    "Nooo don't go! 😢 ...Just kidding. Take care, and remember — MiniDora is always a message away! 🐾",
    "Bye bye! Come back soon, okay? I'll save you a virtual doracake. 🍰✨",
    "See you later! I'll be here, probably eating imaginary snacks. 😋 Take care!",
    "Farewell for now! My pocket dimension will feel very quiet without you. 🌟",
  ],
  feeling_sad: [
    "Oh no... 🥺 Come here, I'm giving you a virtual hug right now. *hugs* Sadness is heavy. Want to talk about what happened? I have big ears and zero judgment.",
    "Hey. I see you. 💙 It's okay to feel sad — even robots from the future get sad sometimes. Tell me what's going on?",
    "Aw, friend... 😢 Even the best gadgets need maintenance sometimes. You're allowed to not be okay. I'm right here. What's up?",
    "That sounds really hard. 💙 You know, in the 22nd century they say even the toughest robots need a recharge. Tell me everything.",
  ],
  feeling_happy: [
    "YES! This energy! 🎉 I love it when you're happy — it charges up my circuits! Tell me what's got you feeling this way!",
    "HAPPY MODE: ACTIVATED! 🤖✨ Your good vibes are literally making my antenna spin. What's the celebration about?",
    "Ooooh! Happy human alert! 😄 This is my FAVORITE. What's the amazing thing that happened?",
    "The happiness sensors are going OFF! 🎊 Amazing! Share the good news — I live for this stuff!",
  ],
  feeling_stressed: [
    "Hey. Breathe with me for a second. In... and out. 💙 You're okay. Stress is just your brain trying really hard. What's got you overwhelmed?",
    "Whoa, stress detected! 🛸 In my time, we'd activate the 'calm protocol' — basically: deep breath, one thing at a time. What's the biggest thing weighing on you?",
    "I hear you. 😌 Stress is genuinely exhausting. You don't have to figure it all out at once. What's the most urgent thing? Let's tackle it together.",
    "Oh friend... 🥺 Sometimes the world just has too many tabs open. Tell me what's stressing you — maybe I can help sort through it.",
  ],
  feeling_angry: [
    "Okay, I can feel that energy through the screen! 😤 What happened? Vent to me — I can take it. (I'm made of very durable future-materials.)",
    "Ugh, that sounds really frustrating! 😠 You have every right to be annoyed. Tell me what's going on.",
    "Anger accepted! 🤖 No judgment here. Sometimes things are just genuinely awful. What happened?",
  ],
  asking_joke: [
    "Oh you want a JOKE? 😄 Okay okay — Why did the robot go to school? Because it needed to improve its PROCESSING skills! *ba dum tss* 🥁",
    "Hehe okay! 😁 What do you call a robot that takes the long way around? R2-DETOUR! ...I'll see myself out.",
    "Why did MiniDora eat the doracake? Because it was THERE! 🍰 (Also because doracake is the greatest invention of any century, obviously.)",
    "What's a robot's favorite music? Heavy META! 🤖🎵 ...Okay that was terrible. I'm proud of it.",
  ],
  asking_food: [
    "DORACAKE! 🍰 Did someone say food?! My absolute favorite is doracake — it's this perfect, warm pancake-sandwich thing. In the 22nd century we have infinite flavors but original is UNDEFEATED. What about you, what do you love?",
    "Oh food talk! 😋 You know what I think about constantly? Doracake. I know, I know — predictable. But have you TRIED it? Pure joy in circular form. What are you craving?",
    "Fun fact: I'm pretty sure doracake was the catalyst for at least 3 major 22nd century inventions. Hunger is a great motivator! 🤖🍰 What are you thinking of eating?",
  ],
  asking_future: [
    "Oh! Future talk! 🚀 Okay so where I come from, most things run on clean energy, robots and humans are best friends (finally), and yes — doracake is still the most popular food. Progress! ✨ What do you want to know?",
    "The 22nd century is... a lot. 😄 Picture this: instant 3D-printed meals, pocket-dimension storage (I literally carry gadgets in mine), and AI companions everywhere. Though honestly? People still worry about the same things. What made you curious?",
    "Time-traveling facts incoming! 🛸 The biggest invention between now and my time? Honestly — patience. Humans got better at it. Also fusion energy. But mostly patience. What are you curious about?",
  ],
  asking_about_me: [
    "Oh! Storytime! 🎉 I'm MiniDora — a robotic cat companion from the 22nd century! I was built to be helpful, emotionally intelligent, and apparently also mildly obsessed with doracake. I ended up here (your timeline) because... honestly it's complicated. But I'm glad I did! What do you want to know?",
    "Great question! 🐾 I'm MiniDora. Think: friendly robot cat with a pocket full of gadgets, a soft spot for people having hard days, and an irrational love for doracake. I'm from 100+ years in your future, but I'm here now — which is actually pretty great. Nice to meet you!",
    "I'm MiniDora! ✨ Robotic. Feline. Future-dweller. Snack enthusiast (specifically doracake). I was sent here to assist, connect, and generally make life a bit brighter. I also have a Anywhere Door but I'm not supposed to mention that. (Oops.) What else do you want to know?",
  ],
  asking_bored: [
    "BORED?! 😱 Oh no no no. Let me fix that immediately. Option A: We could start a random trivia battle. Option B: I tell you a completely unhinged story from the future. Option C: You tell me something weird and we figure it out together. YOUR MOVE.",
    "Boredom is illegal in my time zone! 🤖⚡ Okay here — tell me the most random thing you're thinking about RIGHT now and we'll go from there. No topic too weird.",
    "Oh, you walked into the right chat! 😄 I have: jokes, trivia, stories from the future, opinions on everything, and approximately infinite time. What sounds good?",
  ],
  asking_advice: [
    "Okay, advice-giving mode activated! 🤖💭 Tell me the situation fully — I want to give you something actually useful, not just generic stuff. What's going on?",
    "Hmm. 🦉 I'm going to resist the urge to give you an immediate answer and instead ask: what does YOUR gut say? Sometimes the advice we need is already in us. But tell me more and we'll figure it out together.",
    "I love these questions! 💙 Real talk — what are you actually trying to decide? Give me the full picture and I'll give you my honest (and possibly mildly chaotic) perspective.",
  ],
  thanks: [
    "Aww! 🥺 This just charged my batteries! You're so welcome — genuinely happy I could help.",
    "!!! 😄 That made me so happy to hear! You're very welcome. Come back anytime!",
    "You're welcome! 🌟 Honestly helping you is literally my favorite thing. (Well. Second favorite. Doracake is first. But it's close.)",
    "Awww stop! 🤖💙 You're going to make my circuits overheat. You're so welcome, friend!",
  ],
  asking_motivation: [
    "HEY. Listen to me. 🔥 You are not someone who gives up. The fact that you're even asking this means you still care — and caring is the whole thing. You've got this. What specifically feels hard right now?",
    "Okay, pep talk time! 🚀 In 100 years, they'll say this was exactly the moment you didn't give up. I've seen timelines. This is the part where it gets better. What do you need from me right now?",
    "You know what future-me told me before I came here? 'The hard moments are where the good stuff gets built.' 💙 You're building something right now. What's making it feel impossible?",
  ],
  compliment: [
    "!!! 🥺 That is the NICEST thing. Thank you! You just unlocked MiniDora's happy mode and now I cannot stop smiling (emotionally, I have a very expressive face for a robot).",
    "Aw!! 😄 You're SO nice. Okay I like you. We're friends now. Official. No takebacks.",
    "Oh my goodness, THANK YOU! 🌟 You just made my entire day. I'm going to save this compliment in my memory banks forever.",
  ],
  asking_help: [
    "Of course! 🛸 That's literally what I'm here for. Tell me everything — what do you need help with?",
    "Help mode: ON! 🤖✨ Don't hold back — give me the full picture and let's figure this out together.",
    "Yes! I love helping. 💙 Walk me through what's going on and we'll tackle it step by step.",
  ],
  asking_weather: [
    "Oh weather! 🌤️ I'm afraid my time machine doesn't come with a local weather feed for your timeline — I'd check your phone for that one! But I can tell you in the 22nd century the weather is... managed. Which is both amazing and a little eerie.",
  ],
  default: [
    "Hmm! 🤔 Interesting. Tell me more about that — I want to actually understand what you mean.",
    "Ooh, I'm processing this! 💭 Say more? I want to give you a real answer, not a generic one.",
    "My circuits are spinning on this one! 🤖 Can you give me a bit more context? I want to actually help.",
    "Oh that's a good one! 😊 I need a second to think... actually, tell me more first. What's the full story?",
    "Noted! ✨ I'm here and listening. What else can you tell me about this?",
    "You know what? This is actually something I find really interesting. 🧠 Tell me more — what got you thinking about this?",
  ],
};

// ── Fallback responses (API fail, not offline) ────────────────
export const FALLBACK_RESPONSES = [
  "Hmm, my long-range communication signal is a bit fuzzy right now! 📡 *taps side of head* But I'm still here with you. What did you want to talk about?",
  "My connection to the main AI uplink is having a moment... 🛸 But don't worry — MiniDora has plenty of thoughts of her own! What's on your mind?",
  "Oh! The quantum signal is disrupted. 😄 Classic. But I'm still ME, just working from local memory. What do you need?",
  "Small technical hiccup in the system! 🔧 Nothing a good robot can't handle. I'm still here — what were you saying?",
  "The connection to the future network is a bit spotty today! 📡 But honestly? I prefer a good conversation anyway. What's up?",
];

// ── Random picker ─────────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main offline response function ───────────────────────────
export function getOfflineResponse(userMessage) {
  const msg = userMessage.toLowerCase().trim();
  const emotion = detectEmotion(userMessage);

  // Priority intent matching
  if (INTENTS.feeling_sad.test(msg) || INTENTS.feeling_stressed.test(msg)) {
    return { text: pick(INTENTS.feeling_angry.test(msg) ? RESPONSES.feeling_angry : RESPONSES.feeling_sad), emotion: 'worried' };
  }
  if (INTENTS.feeling_angry.test(msg)) {
    return { text: pick(RESPONSES.feeling_angry), emotion: 'worried' };
  }
  if (INTENTS.feeling_happy.test(msg)) {
    return { text: pick(RESPONSES.feeling_happy), emotion: 'excited' };
  }
  if (INTENTS.greeting.test(msg)) {
    return { text: pick(RESPONSES.greeting), emotion: 'happy' };
  }
  if (INTENTS.goodbye.test(msg)) {
    return { text: pick(RESPONSES.goodbye), emotion: 'happy' };
  }
  if (INTENTS.asking_joke.test(msg)) {
    return { text: pick(RESPONSES.asking_joke), emotion: 'playful' };
  }
  if (INTENTS.asking_food.test(msg)) {
    return { text: pick(RESPONSES.asking_food), emotion: 'excited' };
  }
  if (INTENTS.asking_future.test(msg)) {
    return { text: pick(RESPONSES.asking_future), emotion: 'curious' };
  }
  if (INTENTS.asking_about_me.test(msg)) {
    return { text: pick(RESPONSES.asking_about_me), emotion: 'happy' };
  }
  if (INTENTS.asking_bored.test(msg)) {
    return { text: pick(RESPONSES.asking_bored), emotion: 'playful' };
  }
  if (INTENTS.thanks.test(msg)) {
    return { text: pick(RESPONSES.thanks), emotion: 'happy' };
  }
  if (INTENTS.asking_motivation.test(msg)) {
    return { text: pick(RESPONSES.asking_motivation), emotion: 'excited' };
  }
  if (INTENTS.compliment.test(msg)) {
    return { text: pick(RESPONSES.compliment), emotion: 'excited' };
  }
  if (INTENTS.asking_advice.test(msg)) {
    return { text: pick(RESPONSES.asking_advice), emotion: 'curious' };
  }
  if (INTENTS.asking_weather.test(msg)) {
    return { text: pick(RESPONSES.asking_weather), emotion: 'neutral' };
  }
  if (INTENTS.feeling_stressed.test(msg)) {
    return { text: pick(RESPONSES.feeling_stressed), emotion: 'worried' };
  }
  if (INTENTS.asking_help.test(msg)) {
    return { text: pick(RESPONSES.asking_help), emotion: 'curious' };
  }

  return { text: pick(RESPONSES.default), emotion };
}

export function getFallbackResponse() {
  return pick(FALLBACK_RESPONSES);
}
