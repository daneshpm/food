import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Edit3, X, Check, PartyPopper } from 'lucide-react';
import { playSound, SOUNDS } from '../utils/audio';

export type LanguageCode = 'kannada' | 'hindi' | 'english';

export interface UserPersona {
  name: string;
  title: 'King' | 'Queen';
  languages: LanguageCode[];
}

// ==================== KANNADA DIALOGUES ====================
export const KANNADA_KING_DIALOGUES = [
  "😒 Yen guru... finally nenap aytha?",
  "🤨 App open madidya... order elli?",
  "🔥 Oho! Dhurandhar entry aythu!",
  "🍗 Gym mugsi bandya? Protein ready ide.",
  "😂 Fridge reject madtha? Naan idini alva.",
  "😏 Boss... just checking ah? Order madu guru.",
  "🚨 Kitchen alert! VIP customer online.",
  "🤣 Bro... diet tomorrow, biryani today.",
  "🍕 Bhook level: Criminal.",
  "😌 Ninna wait madtha idvi guru.",
  "😎 Welcome back macha... wallet ready idya?",
  '😂 Chef: "Avnu banda? Gas on madi!"'
];

export const KANNADA_QUEEN_DIALOGUES = [
  "👑 Oops... nam Queen bandbitlu!",
  "🌸 Ayyo... finally nenap aytha?",
  "😌 Queen online... kitchen smiling.",
  "💖 App open madidya... nam luck open aythu.",
  "🥹 Chef full waiting madtha idda.",
  "😏 Queen... today cooking cancel okay?",
  "🍰 Pretty Queen deserves tasty food.",
  "😂 Diet ge bye heli banni.",
  "👀 Queen order madidre taste double agutte.",
  '🌹 Kitchen saying "Welcome back Your Highness."',
  "💕 Smile cute ide... now make your tummy happy.",
  "👑 Royal customer detected."
];

export const KANNADA_UNIVERSAL_DIALOGUES = [
  "😒 Yen guru... finally nenap aytha?",
  "🤨 App open madidya... order elli?",
  "😂 Menu bari nodtha idya? Order madu boss!",
  "🍕 Masala Dosa, Biryani, Milkshake... en beku guru?",
  "😭 Hotteyalli sangeetha shuru aytha?",
  "😌 Sakhat food kadiro namma Mintoo alli!",
  "🤤 Ondu click madu... taste guaranteed!",
  "🚨 Sakath hosa offers bandide nodu!",
  "🍟 Diet maadodu naale... eradu idli ivattu!",
  "😂 Kitchen nalli chef ninge kaytha idare.",
  "👀 Nodkond irbeda, bega order maadu!",
  "😂 Wallet swalpa kadme agbuhudu... manassu tumba khushi agutte!",
  "🔥 Warning: Mintoo food order madidre tumba addiction agbuhudu!",
  "😌 Swiggy Yaake? Mintoo ide alva!",
  "🍔 Mood sariyillava? Burger order maadu!",
  "🤣 Nodu beda guru... order maadu!",
  "😎 BTM Layout ge super fast delivery!",
  "😏 Swalpa crunchy, swalpa juicy... full taste!",
  "💸 Hotte tumba khushi, manassu tumba shanti!",
  "🍕 Ninna diet already escape agide!"
];

// ==================== HINDI DIALOGUES ====================
export const HINDI_KING_DIALOGUES = [
  "😒 Ab yaad aaya mai? Chalo... khaana order kar.",
  "Oye hero! Pet yaad aaya ya hum? 😂",
  "😎 Dhurandhar aa gaya! Kitchen alert 🚨",
  "Bhai... fridge ne bhi block kar diya kya? 😂",
  "Aagaye? Ab order bhi kar do. 😌",
  'Chef bola, "Bhai kab aayega?" 🥹',
  "Wallet mana kar raha hai... pet nahi. 😂",
  "Gym khatam? Protein idhar hai. 💪",
  "Oye King! Diet kal se, order aaj se. 😏",
  "Bhook ne complaint file kar di hai. 😭",
  "Legend online! Kitchen ready hai. 🔥"
];

export const HINDI_QUEEN_DIALOGUES = [
  "😒 Ab yaad aayi main? Chalo... maaf kiya, pehle order karo. 😂",
  "Oops... Our Queen is back! 👑✨",
  "Arre wah... Queen ne yaad kiya hume? 😌",
  "Itni der? Chef wait karte karte emotional ho gaya. 🥹",
  "Aap aa gayi... ab kitchen bhi smile kar raha hai. 🌸",
  "Queen online... cravings offline hone wali hain. 🍕",
  "Mood off? Hum aur food dono ready hain. 💖",
  "Pretty Queen deserves pretty food. 💕"
];

export const HINDI_UNIVERSAL_DIALOGUES = [
  "Fir aa gaye? Addiction hai na? 😂",
  "App khol hi liya hai... order bhi kar do. 😏",
  "Bhook ka Wi-Fi full signal pe hai. 📶",
  "Aaj diet ka RIP hone wala hai. 😂",
  'Pet: "Order kar." Dil: "Ek aur burger." 🍔',
  "Sirf dekhne aaye ho ya order bhi karoge? 👀",
  "Kitchen aapka wait kar raha tha. 😌",
  "Mood fix in 3...2...1... 🍕"
];

// ==================== ENGLISH DIALOGUES ====================
export const ENGLISH_KING_DIALOGUES = [
  "😒 Oh... NOW you remembered me?",
  "😂 Finally! The legend is back.",
  "🔥 The King has entered. Kitchen, stay calm.",
  "🍔 Bro... your stomach snitched on you.",
  "😏 Just browsing? Nice joke. Order something.",
  "🚨 VIP customer detected!",
  "🍕 Your cravings have been waiting."
];

export const ENGLISH_QUEEN_DIALOGUES = [
  "👑 Oops... Our Queen is back!",
  "💖 Finally! We were getting worried.",
  "🌸 Welcome back, Your Majesty.",
  "😌 Pretty people deserve great food.",
  "🍰 Queen energy detected."
];

export const ENGLISH_UNIVERSAL_DIALOGUES = [
  "😒 Oh... NOW you remember us?",
  "😂 Back again? We knew it.",
  "🍕 Just one bite away from happiness.",
  "👀 Browsing won't fill your stomach.",
  "🤤 Your cravings brought you here.",
  "🚨 Hunger emergency detected."
];

// ==================== DEFAULT POOLS ====================
export const DEFAULT_KING_DIALOGUES = [...KANNADA_KING_DIALOGUES, ...HINDI_KING_DIALOGUES, ...ENGLISH_KING_DIALOGUES];
export const DEFAULT_QUEEN_DIALOGUES = [...KANNADA_QUEEN_DIALOGUES, ...HINDI_QUEEN_DIALOGUES, ...ENGLISH_QUEEN_DIALOGUES];
export const DEFAULT_ANONYMOUS_DIALOGUES = [...KANNADA_UNIVERSAL_DIALOGUES, ...HINDI_UNIVERSAL_DIALOGUES, ...ENGLISH_UNIVERSAL_DIALOGUES];

export function getActiveKingDialogues(): string[] {
  try {
    const custom = localStorage.getItem('moms_magic_king_greetings');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_KING_DIALOGUES;
}

export function getActiveQueenDialogues(): string[] {
  try {
    const custom = localStorage.getItem('moms_magic_queen_greetings');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_QUEEN_DIALOGUES;
}

export function getActiveAnonymousDialogues(): string[] {
  try {
    const custom = localStorage.getItem('moms_magic_anon_greetings');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_ANONYMOUS_DIALOGUES;
}

export function getPersonaDialoguePool(title: 'King' | 'Queen', languages: LanguageCode[]): string[] {
  const activeLangs = languages && languages.length > 0 ? languages : ['kannada'];
  const pool: string[] = [];

  if (activeLangs.includes('kannada')) {
    pool.push(...(title === 'King' ? KANNADA_KING_DIALOGUES : KANNADA_QUEEN_DIALOGUES));
    pool.push(...KANNADA_UNIVERSAL_DIALOGUES);
  }
  if (activeLangs.includes('hindi')) {
    pool.push(...(title === 'King' ? HINDI_KING_DIALOGUES : HINDI_QUEEN_DIALOGUES));
    pool.push(...HINDI_UNIVERSAL_DIALOGUES);
  }
  if (activeLangs.includes('english')) {
    pool.push(...(title === 'King' ? ENGLISH_KING_DIALOGUES : ENGLISH_QUEEN_DIALOGUES));
    pool.push(...ENGLISH_UNIVERSAL_DIALOGUES);
  }

  if (pool.length === 0) {
    return title === 'King' ? KANNADA_KING_DIALOGUES : KANNADA_QUEEN_DIALOGUES;
  }
  return Array.from(new Set(pool));
}

export default function FunGreetingBanner() {
  const [persona, setPersona] = React.useState<UserPersona | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [inputName, setInputName] = React.useState('');
  const [selectedTitle, setSelectedTitle] = React.useState<'King' | 'Queen'>('King');
  const [greeting, setGreeting] = React.useState('');
  const [showConfetti, setShowConfetti] = React.useState(false);

  const pickGreeting = React.useCallback((title: 'King' | 'Queen') => {
    const pool = getPersonaDialoguePool(title, ['kannada', 'hindi', 'english']);
    setGreeting(pool[Math.floor(Math.random() * pool.length)]);
  }, []);

  const pickAnonGreeting = React.useCallback(() => {
    const pool = [...DEFAULT_ANONYMOUS_DIALOGUES];
    setGreeting(pool[Math.floor(Math.random() * pool.length)]);
  }, []);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('mintoo_user_persona');
      if (stored) {
        const parsed = JSON.parse(stored);
        const p: UserPersona = {
          name: parsed.name || 'Foodie',
          title: parsed.title === 'Queen' ? 'Queen' : 'King',
          languages: ['kannada', 'hindi', 'english'],
        };
        setPersona(p);
        pickGreeting(p.title);
      } else {
        pickAnonGreeting();
      }
    } catch (_) {
      pickAnonGreeting();
    }
  }, [pickGreeting, pickAnonGreeting]);

  const handleOpenModal = () => {
    playSound(SOUNDS.CLICK);
    if (persona) { setInputName(persona.name); setSelectedTitle(persona.title); }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    const newPersona: UserPersona = { name: inputName.trim(), title: selectedTitle, languages: ['kannada', 'hindi', 'english'] };
    setPersona(newPersona);
    localStorage.setItem('mintoo_user_persona', JSON.stringify(newPersona));
    pickGreeting(selectedTitle);
    setIsModalOpen(false);
    setShowConfetti(true);
    playSound(SOUNDS.ORDER_SUCCESS);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  return (
    <div className="relative w-full my-3">
      {showConfetti && (
        <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
          {[...Array(30)].map((_, i) => (
            <motion.div key={i}
              initial={{ x: 0, y: 0, scale: 0.5, opacity: 1, rotate: 0 }}
              animate={{ x: (Math.random()-0.5)*400, y: (Math.random()-0.5)*400-100, scale: Math.random()*1.5+0.5, opacity: 0, rotate: Math.random()*720 }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              className={`absolute w-3 h-3 rounded-full ${['bg-amber-400','bg-[#F97316]','bg-pink-500','bg-yellow-300'][i%4]}`}
            />
          ))}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[24px] p-4 sm:p-5 border border-amber-500/30 bg-gradient-to-r from-amber-500/20 via-[#F97316]/15 to-[#12121f]/90 backdrop-blur-xl shadow-xl text-left"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
                {persona ? (<>👋 Namaskara, <span className="text-white underline decoration-amber-400 decoration-2">{persona.name}</span>!</>) : <>👋 Welcome to Mintoo!</>}
              </span>
              {persona && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-400/20 border border-amber-400/40 text-amber-300">
                  {persona.title === 'King' ? '👑 King' : '👑 Queen'}
                </span>
              )}
            </div>
            <button onClick={handleOpenModal} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-amber-300 transition-all cursor-pointer" title="Edit Name & Persona">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm sm:text-base font-black italic tracking-tight text-white leading-snug drop-shadow-md">
            "{greeting}"
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 10 }} transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="relative w-full max-w-sm bg-[#161616] border border-amber-500/30 rounded-[28px] p-5 text-left shadow-2xl z-10"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/20 blur-3xl pointer-events-none" />
              <div className="flex items-start justify-between border-b border-white/10 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-black italic uppercase tracking-tight text-white">Set Your Persona 🎉</h3>
                  <p className="text-[11px] font-semibold text-gray-400 mt-0.5">Get personalised greetings every time!</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">Your Name</label>
                  <input type="text" placeholder="e.g. Rahul / Ananya" value={inputName} onChange={e => setInputName(e.target.value)} required
                    className="w-full bg-[#222222] border border-white/15 focus:border-amber-400 rounded-xl py-2.5 px-3.5 outline-none font-bold text-xs text-white placeholder:text-gray-500 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">You Are A...</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['King', 'Queen'] as const).map(t => (
                      <button key={t} type="button" onClick={() => { setSelectedTitle(t); playSound(SOUNDS.CLICK); }}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${selectedTitle === t ? (t === 'King' ? 'bg-gradient-to-b from-amber-500/25 to-[#F97316]/20 border-amber-400 text-white shadow-lg scale-[1.02]' : 'bg-gradient-to-b from-pink-500/25 to-purple-500/20 border-pink-400 text-white shadow-lg scale-[1.02]') : 'bg-[#222222] border-white/10 text-gray-400 hover:border-white/20'}`}>
                        <span className="text-xl">👑</span>
                        <span className="font-black text-xs uppercase tracking-wider">{t}</span>
                        {selectedTitle === t && <span className={`text-[8px] font-bold flex items-center gap-0.5 ${t === 'King' ? 'text-amber-400' : 'text-pink-400'}`}><Check className="w-2.5 h-2.5" /> Selected</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit"
                  className="w-full h-11 bg-gradient-to-r from-amber-400 via-[#F97316] to-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all cursor-pointer mt-1">
                  <PartyPopper className="w-4 h-4 fill-black" />
                  <span>Save & Start Experience</span>
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
