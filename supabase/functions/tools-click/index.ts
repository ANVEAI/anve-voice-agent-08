import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constants
const VALID_ROLES = ['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab', 'option'];

// Utilities
function cleanText(s: any): string {
  return (s ?? '').toString().trim();
}

function normLower(s: any): string {
  return cleanText(s).toLowerCase();
}

function sanitizeTargetText(s: any): string {
  let t = normLower(s);
  if (!t) return '';
  t = t.replace(/^(on\s+|the\s+)/, '');               // drop leading "on"/"the"
  t = t.replace(/[.?!,:;]+$/g, '');                   // trailing punctuation
  t = t.replace(/\b(button|link|tab|item)\b$/,'');    // trailing type words
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

function extractNth(t: string): number | undefined {
  const ordMap: Record<string, number> = { first:1, second:2, third:3, fourth:4, fifth:5 };
  const m = (t || '').match(/\b(first|second|third|fourth|fifth|[1-9][0-9]*)\b/);
  if (!m) return undefined;
  return ordMap[m[0]] || parseInt(m[0], 10);
}

function extractQuoted(text: string): string | undefined {
  const m = (text || '').match(/["""''](.+?)["""'']/);
  if (!m) return undefined;
  return (m[1] || '').trim();
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
    console.log('[click] Received payload:', payload);

    let { sessionId, url, transcript, targetText, selector, nth, role, strategy } = payload;

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
      const m = t.match(/\b(click|open|press|select|choose|tap|go to|take me to|navigate to|goto)\s+(the\s+)?(.+)$/);
      if (m) targetText = sanitizeTargetText(m[3]);
    }

    // nth from transcript if not provided
    if (!nth) nth = extractNth(t);

    // Role inference
    if (!role && !selector && targetText) {
      if (/\b(open|go to|navigate|view)\b/.test(t)) role = 'link';
    }
    if (!role && /\bbutton\b/.test(t)) role = 'button';

    const response = {
      action: {
        kind: 'click',
        targetText: targetText || undefined,
        selector,
        nth,
        role,
        strategy
      },
      speak: targetText ? `Clicking ${targetText}` : 'Clicking'
    };

    console.log('[click] Sending response:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[click] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
