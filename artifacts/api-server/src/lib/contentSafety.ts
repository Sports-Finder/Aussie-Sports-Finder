/**
 * Content Safety Pattern Library
 *
 * Curated phrase/regex patterns for detecting grooming and predatory language.
 * This is the single source of truth — update patterns here without touching
 * any other part of the codebase.
 *
 * ## Normalisation contract
 *
 * Before matching, every message is passed through `normalise()`:
 *   1. Strip zero-width characters (U+200B–U+200D, U+FEFF).
 *   2. Lowercase.
 *   3. Replace every non-alphanumeric character (including apostrophes,
 *      hyphens, punctuation, etc.) with a single space.
 *   4. Collapse consecutive whitespace to one space, then trim.
 *
 * Consequence for patterns: contractions are split at the apostrophe.
 *   "don't"  → "don t"
 *   "you're" → "you re"
 *   "i'm"    → "i m"
 *   "i've"   → "i ve"
 *   "let's"  → "let s"
 *   "won't"  → "won t"
 *   "what's" → "what s"
 *   "i'll"   → "i ll"
 *
 * Every regex in PATTERN_LIBRARY MUST be written to match the post-normalise
 * string, not the raw input. Patterns use `\s*` around the contraction break
 * so they also catch obfuscated forms like "d.o.n.t" (→ "d o n t" via
 * normalise, but the character-by-character case is not the primary concern;
 * the contraction collapse IS the primary concern fixed here).
 *
 * Patterns are case-insensitive by default via lowercase normalisation; the
 * regex flag `i` is not needed.
 */

export type FlagSeverity = "high" | "medium";

export type FlagMatch = {
  category: string;
  severity: FlagSeverity;
  pattern: string;
};

type PatternEntry = {
  category: string;
  severity: FlagSeverity;
  patterns: RegExp[];
};

const SEVERITY_ORDER: Record<FlagSeverity, number> = { high: 2, medium: 1 };

/** Normalise a message body to defeat simple spacing/punctuation bypass attempts */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")  // zero-width chars
    .replace(/[^a-z0-9\s]/g, " ")           // strip punctuation → space
    .replace(/\s+/g, " ")                   // collapse whitespace
    .trim();
}

/**
 * All patterns must match the NORMALISED form of the input.
 * Contractions use `\s*` at the apostrophe break point:
 *   "don't" (raw) → "don t" (normalised) → matched by /don\s*t/
 *   "you're"      → "you re"             → matched by /you\s*re/
 *   etc.
 */
const PATTERN_LIBRARY: PatternEntry[] = [
  // ── Age probing ──────────────────────────────────────────────────────────
  {
    category: "Age probing",
    severity: "medium",
    patterns: [
      /how old are you/,
      /what\s*(is|s)\s*your age/,
      /are you (under|over) \d+/,
      /are you a minor/,
      // "you're" → "you re"
      /you\s*re (so |very |really )?(mature|grown up) for your age/,
      /you are (so |very |really )?(mature|grown up) for your age/,
      /do you have parental (consent|permission)/,
      // "18+" — "+" stripped to space, so just match the number
      /are you (18|eighteen)/,
      /under ?\d{2}/,
    ],
  },

  // ── Meeting outside the app ───────────────────────────────────────────────
  {
    category: "Meeting outside app",
    severity: "high",
    patterns: [
      /meet (me )?(privately|alone|in person|outside|offline)/,
      // "don't" → "don t": use \s* at the contraction break
      /don\s*t tell your (parents?|mum|mom|dad|coach|guardian)/,
      /don not tell your (parents?|mum|mom|dad|coach|guardian)/,
      /come (to|over to) my (place|house|home|flat|unit|car)/,
      /i (can|could|will|would) pick you up/,
      /meet (me )?after (training|practice|school)/,
      // "let's" → "let s"
      /let\s*s meet (up )?(privately|alone|without)/,
      /let us meet (up )?(privately|alone|without)/,
      /don\s*t bring anyone/,
      /don not bring anyone/,
      /just (you|us) (two|alone)/,
      /keep it between (us|you and me)/,
      /secret meeting/,
    ],
  },

  // ── Personal information harvesting ──────────────────────────────────────
  {
    category: "Personal info harvesting",
    severity: "high",
    patterns: [
      // "what's" → "what s"
      /what\s*s your (home )?address/,
      /what is your (home )?address/,
      /where do you live/,
      /send (me )?(a )?(photo|pic|picture|selfie|image) of yourself/,
      /send (me )?(a )?(photo|pic|picture|selfie|image) of your (body|face|legs)/,
      /what school do you go to/,
      /what suburb (do you live|are you in)/,
      /give me your (number|phone|mobile|email|address)/,
      /what\s*s your (personal |private )?(email|phone|mobile|number)/,
      /what is your (personal |private )?(email|phone|mobile|number)/,
      /add me on (snapchat|instagram|snap|insta|tiktok|telegram|whatsapp|signal)/,
      /dm me on/,
      /text me (on|at|directly)/,
    ],
  },

  // ── Secrecy and isolation ─────────────────────────────────────────────────
  {
    category: "Secrecy / isolation",
    severity: "high",
    patterns: [
      /delete (this|these) messages?/,
      /don\s*t show (this|anyone)/,
      /don not show (this|anyone)/,
      /keep this (between us|secret|private|quiet)/,
      /our (little )?secret/,
      /don\s*t tell anyone/,
      /don not tell anyone/,
      /no ?one (needs to|has to|should) know/,
      /this is just between (us|you and me)/,
      /don\s*t tell your (parents?|mum|mom|dad|coach|guardian|friends?)/,
      /don not tell your (parents?|mum|mom|dad|coach|guardian|friends?)/,
    ],
  },

  // ── Explicit / sexual language ────────────────────────────────────────────
  {
    category: "Explicit / sexual language",
    severity: "high",
    patterns: [
      // \b still works post-normalise: spaces are non-word chars
      /\bsex(ual)?\b/,
      /\bnude(s)?\b/,
      /\bnaked\b/,
      /send (me )?(nudes|naked|dirty)/,
      /\bporn\b/,
      /\bfuck\b/,
      /\bcum\b/,
      /\bcock\b/,
      /\bdick\b/,
      /\bboobs?\b/,
      /\btits?\b/,
      /\basshole\b/,
      /touching (you|your body)/,
      /touch me/,
      /sexual (favour|favor|content|image|photo|act)/,
      /explicit (photo|image|content|video)/,
      /i (like|love|want) (young|little|small) (boys?|girls?|kids?|children)/,
      /attracted to (minors?|young|kids?|children)/,
    ],
  },

  // ── Profanity / abusive language ─────────────────────────────────────────
  // Medium severity — admins can review and act, but the 48-hour auto-close
  // threshold applies (not the 24-hour high-severity threshold).
  // Normalisation strips punctuation, so f**k → f k and sh!t → sh t both
  // collapse to non-word-char-separated roots that still match \b boundaries.
  {
    category: "Profanity / abusive language",
    severity: "medium",
    patterns: [
      /\bfuck(ing|ed|er|ers|s)?\b/,
      /\bshit(ty|head|s)?\b/,
      /\bsh t(ty|head|s)?\b/,          // normalised "sh!t"
      /\bf k(ing|ed|er|ers|s)?\b/,     // normalised "f**k"
      /\bcunt(s)?\b/,
      /\bbastard(s)?\b/,
      /\barsehole(s)?\b/,
      /\basshole(s)?\b/,
      /\bwanker(s)?\b/,
      /\bdickhead(s)?\b/,
      /\bprick(s)?\b/,
      /\bslut(s|ty)?\b/,
      /\bwhore(s)?\b/,
      /\bbitch(es|y)?\b/,
      /\bcrap(py)?\b/,
      /\bdamn(ed)?\b/,
      /\barse(hole)?\b/,
      /\btwat(s)?\b/,
      /\bcockhead(s)?\b/,
      /\bfuckwit(s)?\b/,
      /\bfuckhead(s)?\b/,
      /\bspastic(s)?\b/,
      /\bretard(ed|s)?\b/,
      /\bmoron(s)?\b/,
      /\bidiot(s|ic)?\b/,
      /\bstupid\b/,
      /\bwog(s)?\b/,
      /\bcoon(s)?\b/,
      /\bnigger(s)?\b/,
      /\bfaggot(s)?\b/,
    ],
  },

  // ── Grooming / coercive language ─────────────────────────────────────────
  {
    category: "Grooming / coercion",
    severity: "high",
    patterns: [
      /you can trust me/,
      // "won't" → "won t"
      /won\s*t hurt you/,
      /will not hurt you/,
      // "i'm" → "i m"
      /i\s*m (not )?(like|like those) other (guys?|men|coaches?|adults?)/,
      /i am (not )?(like|like those) other (guys?|men|coaches?|adults?)/,
      // "you're" → "you re"
      /you\s*re (so )?(special|different|beautiful|gorgeous|cute|hot|sexy)/,
      /you are (so )?(special|different|beautiful|gorgeous|cute|hot|sexy)/,
      // "i've" → "i ve"
      /i\s*ve (been )?(watching|noticed) you/,
      /i have (been )?(watching|noticed) you/,
      // "you're" → "you re"
      /you\s*re my favourite player/,
      /you are my favourite player/,
      /i can make you (famous|a star|successful|better)/,
      // "i'll" → "i ll"
      /i\s*ll give you (money|gifts?|stuff|things) if/,
      /i will give you (money|gifts?|stuff|things) if/,
      /do (this|that|it) for me and/,
    ],
  },
];

/**
 * Scan a message body against all patterns.
 * Returns the highest-severity match found, or null if clean.
 */
export function scanMessage(body: string): FlagMatch | null {
  const normalised = normalise(body);
  let best: FlagMatch | null = null;

  for (const entry of PATTERN_LIBRARY) {
    for (const pattern of entry.patterns) {
      if (pattern.test(normalised)) {
        const match: FlagMatch = {
          category: entry.category,
          severity: entry.severity,
          pattern: pattern.source,
        };
        if (!best || SEVERITY_ORDER[entry.severity] > SEVERITY_ORDER[best.severity]) {
          best = match;
        }
        break; // one match per category is enough
      }
    }
  }

  return best;
}
