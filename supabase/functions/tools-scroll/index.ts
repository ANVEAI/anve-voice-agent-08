import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constants
const VALID_DIRECTIONS = ['up', 'down', 'top', 'bottom'];

// Utilities
function cleanText(s: any): string {
  return (s ?? '').toString().trim();
}

function normLower(s: any): string {
  return cleanText(s).toLowerCase();
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
    console.log('[scroll] Received payload:', payload);

    let { sessionId, url, transcript, direction } = payload;

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

    const response = {
      action: { kind: 'scroll', direction },
      speak: `Scrolling ${direction}`
    };

    console.log('[scroll] Sending response:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[scroll] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
