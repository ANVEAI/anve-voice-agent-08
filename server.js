// server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: true }));
app.use(express.json());

// Toggle to see incoming bodies once while debugging (set true, then back to false)
const DEBUG_LOG_BODIES = false;

// Health
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// Constants
const VALID_DIRECTIONS = ['up','down','top','bottom'];
const VALID_ROLES = ['button','link','checkbox','radio','menuitem','tab','option'];
const FIELD_HINTS = [
  'email','e-mail','mail',
  'name','first name','last name','username','user name',
  'password','passcode',
  'search','query','keywords',
  'phone','mobile','number',
  'address','city','state','zip','postcode','postal',
  'message','comments','feedback','note',
  'company','organization','org',
  'subject','title'
];
// Expanded verbs to capture more utterance styles like "spell", "say", etc.
// (Keep search/find/look up handled separately to avoid overfitting email lead-in stripping.)
const VERBS = 'type|enter|fill|set|write|put|input|spell|say|provide|give|update|use|paste';

// Utilities
function cleanText(s) {
  return (s ?? '').toString().trim();
}
function normLower(s) {
  return cleanText(s).toLowerCase();
}
function sanitizeTargetText(s) {
  let t = normLower(s);
  if (!t) return '';
  t = t.replace(/^(on\s+|the\s+)/, '');               // drop leading "on"/"the"
  t = t.replace(/[.?!,:;]+$/g, '');                   // trailing punctuation
  t = t.replace(/\b(button|link|tab|item)\b$/,'');    // trailing type words
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}
function extractNth(t) {
  const ordMap = { first:1, second:2, third:3, fourth:4, fifth:5 };
  const m = (t || '').match(/\b(first|second|third|fourth|fifth|[1-9][0-9]*)\b/);
  if (!m) return undefined;
  return ordMap[m[0]] || parseInt(m[0], 10);
}
function extractQuoted(text) {
  const m = (text || '').match(/["""'''](.+?)["""''']/);
  if (!m) return undefined;
  return (m[1] || '').trim();
}

function logOnce(label, obj) {
  if (!DEBUG_LOG_BODIES) return;
  try {
    console.log(label, JSON.stringify(obj, null, 2));
  } catch {
    console.log(label, obj);
  }
}

// Spoken email normalizer (server-side)
function normalizeSpokenEmailServer(text) {
  if (!text) return text;
  let sOrig = text.toString().trim();
  // remove surrounding quotes/punctuation that sneak in
  sOrig = sOrig.replace(/^[""']|[""']$/g, '').replace(/[，。！？]$/g, '');

  let s = sOrig.toLowerCase();

  // Replace spoken tokens with symbols
  s = s
    .replace(/\bat the rate\b/g, '@')
    .replace(/\bat\b/g, '@')
    .replace(/\bdot\b/g, '.')
    .replace(/\bperiod\b/g, '.')
    .replace(/\bunderscore\b/g, '_')
    .replace(/\bunder\s*score\b/g, '_')
    .replace(/\bdash\b/g, '-')
    .replace(/\bhyphen\b/g, '-')
    .replace(/\bplus\b/g, '+');

  // Collapse split providers/domains
  s = s
    .replace(/\bg\s*mail\b/g, 'gmail')
    .replace(/\bout\s*look\b/g, 'outlook')
    .replace(/\bhot\s*mail\b/g, 'hotmail')
    .replace(/\by\s*ahoo\b/g, 'yahoo')
    .replace(/\bproton\s*mail\b/g, 'protonmail')
    .replace(/\bicloud\b/g, 'icloud');

  // Common TLD phrases
  s = s
    .replace(/\bco\s*dot\s*uk\b/g, 'co.uk')
    .replace(/\bco\s*dot\s*in\b/g, 'co.in')
    .replace(/\bcom\s*dot\s*in\b/g, 'com.in');

  // Remove spaces around separators
  s = s.replace(/\s*@\s*/g, '@')
       .replace(/\s*\.\s*/g, '.')
       .replace(/\s*_\s*/g, '_')
       .replace(/\s*-\s*/g, '-');

  // If still spaced, collapse local and domain segments
  if (s.includes('@')) {
    const [local, domain = ''] = s.split('@');
    s = local.replace(/\s+/g, '') + '@' + domain.replace(/\s+/g, '');
  } else {
    // If ASR said "at", above already handled; still collapse any residual spaces
    s = s.replace(/\s+/g, '');
  }

  // Final touch: fix accidental duplicates like ".." or ".@" sequences
  s = s.replace(/\.{2,}/g, '.')
       .replace(/@+/g, '@')
       .replace(/@\./g, '@');

  // Validate email
  const emailRe = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (emailRe.test(s)) return s;

  // Try to normalize common two-level TLD phrasing (dot co dot uk already handled)
  let s2 = s
    .replace(/\.co\.in\b/g, '.co.in')
    .replace(/\.com\.in\b/g, '.com.in')
    .replace(/\.co\.uk\b/g, '.co.uk');
  if (emailRe.test(s2)) return s2;

  // If invalid, return original untouched
  return sOrig;
}

function sanitizeValueText(s) {
  let t = cleanText(s);
  // Remove trailing common punctuation (Western + CJK) that often trails dictation
  return t.replace(/[，。！？.,!?;:]+$/g, '').trim();
}

// Aggressive removal of common lead-in phrases before an email literal/spoken form
function stripEmailLeadIns(value, transcriptLower) {
  let v = cleanText(value);

  // Remove opening quotes and common separators at the very start
  v = v.replace(/^[""'\s]+/, '');

  // Leading patterns to strip, ordered from most specific to generic.
  const leadIns = [
    // "my email address is", "email id is", "email:", "email as", "set the email to"
    /^\s*(?:my\s+)?(?:e-?mail|mail|email)\s*(?:address|id)?\s*(?:is|=|:|as|to|should be|will be)?\s*/i,
    /^\s*(?:the\s+)?(?:e-?mail|mail|email)\s*(?:address|id)?\s*(?:is|=|:|as|to|should be|will be)?\s*/i,
    // "set/enter/fill/spell ... email (field/box/input)? (is|as|to|:)"
    new RegExp(
      '^\\s*(?:' + VERBS + ')\\s*(?:in(?:to)?\\s+|to\\s+)?(?:the\\s+)?(?:e-?mail|mail|email)(?:\\s+(?:field|box|input))?\\s*(?:is|=|:|as|to)?\\s*',
      'i'
    ),
    // Generic "it is", "it:", "this is", "value is", ":" after verbs
    /^\s*(?:it|this|that|value)\s*(?:is|=|:|as|to)?\s*/i,
    // "as follows:"
    /^\s*(?:as\s+follows)\s*:?\s*/i
  ];

  for (const re of leadIns) {
    v = v.replace(re, '');
  }

  // In case the value still starts with "email as ..." after the first pass.
  v = v.replace(/^\s*email\s+as\s+/i, '');

  // If someone says "spell it: ..." and we extracted after the verb, remove leading "it:" or "it is"
  v = v.replace(/^\s*it\s*(?:is|=|:)?\s*/i, '');

  // Remove trailing location phrase accidentally captured: " ... in the email field"
  v = v.replace(/\s+(?:in|into)\s+(?:the\s+)?(?:e-?mail|mail|email)(?:\s+(?:field|box|input))\b.*$/i, '').trim();

  // Remove lingering quotes or ending punctuation
  v = v.replace(/["""']+$/g, '').replace(/[，。！？]+$/g, '').trim();

  return v;
}

function extractQuotedOrAfterVerb(transcript) {
  // 1) Quoted value takes precedence
  const q = extractQuoted(transcript);
  if (q) return q;

  // 2) Search/Find/Look up phrasing, e.g., "search for laptops", "find headphones", "look up tablets"
  const mSearch = transcript.match(/\b(?:search(?:\s+for)?|find|look\s+up)\b\s+(.+)$/i);
  if (mSearch) {
    let val = mSearch[1] || '';
    // Remove trailing "in the <...> field/box/input" if it got captured
    val = val.replace(/\s+in\s+the\s+.*$/, '').trim();
    return val;
  }

  // 3) Generic fill verbs ("type", "enter", "fill", "set", etc.)
  const reVerb = new RegExp(`\\b(?:${VERBS})\\b\\s+(.+)$`, 'i');
  const m = transcript.match(reVerb);
  if (!m) return '';
  let val = m[1];

  // Remove trailing "in the <...> field/box/input" if it got captured
  val = val.replace(/\s+in\s+the\s+.*$/, '').trim();

  return val;
}

function inferFieldHint(transcript) {
  const t = normLower(transcript);

  // Explicit pattern: "in/into the <hint> field/box/input"
  const m1 = t.match(/\b(in|into)\s+(the\s+)?([a-z0-9 \-_]+?)\s+(field|box|input)\b/);
  if (m1) return m1[3].trim();

  // Also try "for <hint>" pattern (e.g., "search for laptops" indicates search)
  const m2 = t.match(/\bfor\s+([a-z0-9 \-_]+)\b/);
  if (m2) {
    const guess = m2[1].trim();
    for (const hint of FIELD_HINTS) {
      if (guess.includes(hint)) return hint;
    }
  }

  // Fallback: keyword presence
  for (const hint of FIELD_HINTS) {
    if (t.includes(hint)) return hint;
  }
  return '';
}

function inferShouldSubmit(transcript) {
  const t = normLower(transcript);
  return /\b(submit|save|apply|send|go|search|find|look up|sign in|log in)\b/.test(t);
}

// Helper: unwrap payloads that may arrive as JSON string or nested "arguments" string
function unwrapPayload(req) {
  let payload = req.body;
  try {
    if (typeof payload === 'string') payload = JSON.parse(payload);
    if (payload && typeof payload.arguments === 'string') {
      // Vapi sometimes sends the function arguments as a JSON string
      payload = JSON.parse(payload.arguments);
    } else if (payload && payload.message && payload.message.toolCalls?.[0]?.function?.arguments) {
      // Also handle nested formats
      const args = payload.message.toolCalls[0].function.arguments;
      if (typeof args === 'string') {
        payload = JSON.parse(args);
      } else {
        payload = args;
      }
    }
  } catch (e) {
    // keep as-is
  }
  return payload || {};
}

// SCROLL tool
app.post('/tools/scroll', (req, res) => {
  const body = unwrapPayload(req);
  if (DEBUG_LOG_BODIES) logOnce('[scroll] body', body);

  let { sessionId, url, transcript, direction } = body;

  // Tolerate dev placeholders
  if (sessionId === 'user_session' || sessionId === '') sessionId = undefined;
  if (url === 'current_page' || url === '') url = undefined;
  if (!sessionId) sessionId = 'vapi-dev';
  if (!url) url = 'about:blank';

  const t = normLower(transcript);

  // Trust provided valid direction
  if (!VALID_DIRECTIONS.includes(direction)) direction = undefined;

  // If no direction, infer from transcript
  if (!direction) {
    if (/\b(top|header)\b/.test(t)) direction = 'top';
    else if (/\b(bottom|footer|last section|end)\b/.test(t)) direction = 'bottom';
    else if (/\b(up|page up)\b/.test(t)) direction = 'up';
    else if (/\b(down|page down)\b/.test(t)) direction = 'down';
  }

  // Default
  if (!direction) direction = 'down';

  return res.json({
    action: { kind: 'scroll', direction },
    speak: `Scrolling ${direction}`
  });
});

// CLICK tool
app.post('/tools/click', (req, res) => {
  const body = unwrapPayload(req);
  if (DEBUG_LOG_BODIES) logOnce('[click] body', body);

  let { sessionId, url, transcript, targetText, selector, nth, role, strategy } = body;

  // Tolerate dev placeholders
  if (sessionId === 'user_session' || sessionId === '') sessionId = undefined;
  if (url === 'current_page' || url === '') url = undefined;
  if (!sessionId) sessionId = 'vapi-dev';
  if (!url) url = 'about:blank';

  // Normalize basics
  const t = normLower(transcript);
  selector = cleanText(selector);
  if (selector === '') selector = undefined;
  role = normLower(role);
  if (!VALID_ROLES.includes(role)) role = undefined;
  strategy = normLower(strategy);
  nth = Number.isFinite(+nth) ? Math.max(1, parseInt(nth, 10)) : undefined;

  // targetText sources priority: explicit → quoted → heuristic
  targetText = sanitizeTargetText(targetText);
  if (!targetText) {
    const quoted = extractQuoted(transcript);
    if (quoted) targetText = sanitizeTargetText(quoted);
  }
  if (!targetText && t) {
    const m = t.match(/\b(click|open|press|select|choose|tap)\s+(the\s+)?(.+)$/);
    if (m) targetText = sanitizeTargetText(m[3]);
  }

  // nth from transcript if not provided
  if (!nth) nth = extractNth(t);

  // Role inference
  if (!role && !selector && targetText) {
    if (/\b(open|go to|navigate|view)\b/.test(t)) role = 'link';
  }
  if (!role && /\bbutton\b/.test(t)) role = 'button';

  return res.json({
    action: {
      kind: 'click',
      targetText: targetText || undefined,
      selector,
      nth,
      role,
      strategy
    },
    speak: targetText ? `Clicking ${targetText}` : 'Clicking'
  });
});

// FILL tool
app.post('/tools/fill', (req, res) => {
  const body = unwrapPayload(req);
  if (DEBUG_LOG_BODIES) logOnce('[fill] body', body);

  let { sessionId, url, transcript, value, fieldHint, selector, submit } = body;

  // Tolerate dev placeholders
  if (sessionId === 'user_session' || sessionId === '') sessionId = undefined;
  if (url === 'current_page' || url === '') url = undefined;
  if (!sessionId) sessionId = 'vapi-dev';
  if (!url) url = 'about:blank';

  const t = normLower(transcript);
  selector = cleanText(selector);
  if (selector === '') selector = undefined;

  // Value: explicit -> quoted/after-verb -> fallback empty
  value = cleanText(value);
  if (!value) value = extractQuotedOrAfterVerb(transcript);
  value = sanitizeValueText(value);

  // Field hint: explicit -> inferred from transcript
  fieldHint = cleanText(fieldHint) || inferFieldHint(transcript);

  // Email detection signals
  const looksLikeEmailLiteral = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(value);
  const looksLikeEmailSpoken =
    /\b(at|at the rate)\b/i.test(t) ||
    /\bdot\b/i.test(t) ||
    /gmail|outlook|hotmail|yahoo|icloud|protonmail/i.test(t);

  // If email context (hint/keyword/spoken/literal), strip lead-ins and normalize
  const emailContext =
    (fieldHint && /email/i.test(fieldHint)) ||
    /\bemail\b/i.test(t) ||
    looksLikeEmailSpoken ||
    looksLikeEmailLiteral;

  if (emailContext) {
    value = stripEmailLeadIns(value, t);
    value = normalizeSpokenEmailServer(value);
    if (!fieldHint) fieldHint = 'email';
  }

  // Submit intent
  if (typeof submit !== 'boolean') submit = inferShouldSubmit(transcript);

  const speakPreview = value ? (value.length > 40 ? value.slice(0, 40) + '…' : value) : '';

  return res.json({
    action: {
      kind: 'fill',
      value: value || '',          // text to type (may be empty if we truly couldn't extract)
      fieldHint: fieldHint || '',  // what field to target (email/name/search/etc.)
      selector: selector || undefined, // optional CSS selector if provided by LLM
      submit: !!submit             // whether to submit/press Enter after fill
    },
    speak: value ? `Filling ${fieldHint || 'field'} with ${speakPreview}` : `Filling ${fieldHint || 'field'}`
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
