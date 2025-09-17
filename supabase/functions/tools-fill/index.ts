import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// LLM Content Processing
async function processContentWithLLM(rawValue: string, fieldHint: string, transcript: string): Promise<string> {
  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openRouterApiKey) {
    console.log('[fill] No OpenRouter API key, falling back to rule-based processing');
    return rawValue;
  }

  try {
    console.log('[fill] Processing content with LLM:', { rawValue, fieldHint, transcript });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://anvevoice.app',
        'X-Title': 'Voice Content Processing',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You are a voice transcription content processor. Your job is to take transcribed voice text and convert it to proper format for form fields.

IMPORTANT: Only return the corrected value, nothing else. No explanations, no quotes, just the clean value.

For EMAIL fields:
- Convert spoken format to proper email: "john at gmail dot com" → "john@gmail.com"
- Fix common speech-to-text errors
- Handle variations like "g mail", "out look", "hot mail", "y ahoo"
- Convert "dot" to ".", "at" to "@"

For PHONE fields:
- Format phone numbers properly
- Convert spoken numbers to digits

For NAME fields:
- Proper capitalization
- Fix common name transcription errors

For other fields:
- Clean up obvious transcription errors
- Maintain original intent but improve formatting`
          },
          {
            role: 'user',
            content: `Field type: ${fieldHint}
Original transcript: "${transcript}"
Extracted value: "${rawValue}"

Please process this value for the ${fieldHint} field:`
          }
        ],
        max_tokens: 150,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error('[fill] OpenRouter API error:', await response.text());
      return rawValue;
    }

    const data = await response.json();
    const processedValue = data.choices[0].message.content.trim();
    
    console.log('[fill] LLM processed value:', { original: rawValue, processed: processedValue });
    return processedValue;

  } catch (error) {
    console.error('[fill] Error processing content with LLM:', error);
    return rawValue;
  }
}

// Constants
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

const VERBS = 'type|enter|fill|set|write|put|input|spell|say|provide|give|update|use|paste';

// Utilities
function cleanText(s: any): string {
  return (s ?? '').toString().trim();
}

function normLower(s: any): string {
  return cleanText(s).toLowerCase();
}

function extractQuoted(text: string): string | undefined {
  const m = (text || '').match(/["""'''](.+?)["""''']/);
  if (!m) return undefined;
  return (m[1] || '').trim();
}

function sanitizeValueText(s: string): string {
  let t = cleanText(s);
  // Remove trailing common punctuation (Western + CJK) that often trails dictation
  return t.replace(/[，。！？.,!?;:]+$/g, '').trim();
}

// Spoken email normalizer (server-side)
function normalizeSpokenEmailServer(text: string): string {
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

// Aggressive removal of common lead-in phrases before an email literal/spoken form
function stripEmailLeadIns(value: string, transcriptLower: string): string {
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

function extractQuotedOrAfterVerb(transcript: string): string {
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

function inferFieldHint(transcript: string): string {
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

function inferShouldSubmit(transcript: string): boolean {
  const t = normLower(transcript);
  return /\b(submit|save|apply|send|go|search|find|look up|sign in|log in)\b/.test(t);
}

// Helper: unwrap payloads that may arrive as JSON string or nested "arguments" string
function unwrapPayload(body: any): any {
  let payload = body;
  try {
    if (typeof payload === 'string') payload = JSON.parse(payload);
    if (payload && typeof payload.arguments === 'string') {
      payload = JSON.parse(payload.arguments);
    } else if (payload && payload.message && payload.message.toolCalls?.[0]?.function?.arguments) {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const payload = unwrapPayload(body);
    console.log('[fill] Received payload:', payload);

    let { sessionId, url, transcript, value, fieldHint, selector, submit } = payload;

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
      
      // Try LLM processing first, fallback to rule-based
      const llmProcessed = await processContentWithLLM(value, 'email', transcript);
      if (llmProcessed && llmProcessed !== value) {
        console.log('[fill] Using LLM processed email:', { original: value, processed: llmProcessed });
        value = llmProcessed;
      } else {
        // Fallback to existing rule-based processing
        value = normalizeSpokenEmailServer(value);
      }
      
      if (!fieldHint) fieldHint = 'email';
    } else if (fieldHint && ['name', 'phone', 'address'].includes(fieldHint.toLowerCase())) {
      // Process other structured fields with LLM
      const llmProcessed = await processContentWithLLM(value, fieldHint, transcript);
      if (llmProcessed && llmProcessed !== value) {
        console.log('[fill] Using LLM processed content:', { fieldHint, original: value, processed: llmProcessed });
        value = llmProcessed;
      }
    }

    // Submit intent
    if (typeof submit !== 'boolean') submit = inferShouldSubmit(transcript);

    const speakPreview = value ? (value.length > 40 ? value.slice(0, 40) + '…' : value) : '';

    const response = {
      action: {
        kind: 'fill',
        value: value || '',          // text to type (may be empty if we truly couldn't extract)
        fieldHint: fieldHint || '',  // what field to target (email/name/search/etc.)
        selector: selector || undefined, // optional CSS selector if provided by LLM
        submit: !!submit             // whether to submit/press Enter after fill
      },
      speak: value ? `Filling ${fieldHint || 'field'} with ${speakPreview}` : `Filling ${fieldHint || 'field'}`
    };

    console.log('[fill] Sending response:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[fill] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
