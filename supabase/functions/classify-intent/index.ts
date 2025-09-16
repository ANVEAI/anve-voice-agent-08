import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenRouter API configuration
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_NAME = 'google/gemini-2.5-flash-lite';

// Session memory storage
const sessionMemory = new Map();

// Store session context
function updateSessionContext(sessionId: string, transcript: string, action: any) {
  if (!sessionId) return;
  
  const context = sessionMemory.get(sessionId) || { history: [], lastActions: [] };
  
  // Add to conversation history (keep last 3 exchanges)
  context.history.push({ transcript, action, timestamp: Date.now() });
  if (context.history.length > 3) {
    context.history.shift();
  }
  
  // Track last actions by type for pronoun resolution
  if (action && action.kind) {
    context.lastActions[action.kind] = {
      action,
      transcript,
      timestamp: Date.now()
    };
  }
  
  sessionMemory.set(sessionId, context);
}

// Get session context for prompts
function getSessionContext(sessionId: string) {
  if (!sessionId) return null;
  return sessionMemory.get(sessionId) || null;
}

// Clean old sessions (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [sessionId, context] of sessionMemory.entries()) {
    const lastActivity = Math.max(...context.history.map((h: any) => h.timestamp));
    if (lastActivity < oneHourAgo) {
      sessionMemory.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

/**
 * LLM-based Intent Classification
 */
async function classifyWithLLM(transcript: string, sessionId: string, currentUrl?: string) {
  const context = getSessionContext(sessionId);
  
  // Build context string for prompt
  let contextString = '';
  if (context && context.history.length > 0) {
    contextString = '\n\nRecent conversation context:';
    context.history.forEach((item: any, index: number) => {
      contextString += `\n${index + 1}. User said: "${item.transcript}" → Action: ${JSON.stringify(item.action)}`;
    });
    contextString += '\n\nUse this context to resolve pronouns like "it", "that", "this" in the current command.';
  }

  // Add URL context
  let urlContext = '';
  if (currentUrl) {
    const url = new URL(currentUrl);
    const path = url.pathname;
    urlContext = `\n\nCurrent page: ${path}`;
    
    if (path === '/pricing') {
      urlContext += '\nUser is on the pricing page. "Back" or "go back" means navigate to home page "/" or click home links.';
    } else if (path === '/waitlist') {  
      urlContext += '\nUser is on the waitlist page. "Back" or "go back" means navigate to home page "/" or click home links.';
    } else if (path === '/feedback') {
      urlContext += '\nUser is on the feedback page. "Back" or "go back" means navigate to home page "/" or click home links.';
    } else if (path === '/') {
      urlContext += '\nUser is on the home page. "Back" or "go back" typically means scroll to top.';
    }
  }
  
  const systemPrompt = `You are an intelligent voice command classifier for a voice-first web navigation app. Analyze the user's voice command and return a JSON response with the intended action.

WEBSITE CONTEXT:
- This is a voice navigation app with pages: Home (/), Pricing (/pricing), Waitlist (/waitlist), Feedback (/feedback)
- Home page has a voice intro popup with "Got it!" button
- Navigation between pages uses React Router

SPECIAL PATTERNS:
- "close popup/window/dialog" or "got it" → ALWAYS click "Got it!" or close buttons
- "back/go back" on non-home pages → navigate to home page (click home links)
- "back/go back" on home page → scroll to top
- "dismiss/close/ok" with popup visible → click close/dismiss buttons

Available actions:
1. SCROLL: Navigate page (up/down/top/bottom)
2. CLICK: Click buttons, links, tabs, modals, navigation
3. FILL: Fill forms, search, enter text
4. TOGGLE: Toggle switches, checkboxes, radio buttons

Respond with ONLY a JSON object in this exact format:
{
  "type": "scroll|click|fill|toggle|unknown",
  "confidence": 0.0-1.0,
  "action": {
    "kind": "scroll|click|fill|toggle",
    "direction": "up|down|top|bottom" (for scroll),
    "targetText": "text to find" (for click),
    "value": "text to enter" (for fill),
    "fieldHint": "email|name|search|message" (for fill),
    "target": "element to toggle" (for toggle)
  },
  "reasoning": "brief explanation"
}

Examples:
- "close popup" → {"type":"click","confidence":0.95,"action":{"kind":"click","targetText":"Got it!"}}
- "go back" (from /pricing) → {"type":"click","confidence":0.9,"action":{"kind":"click","targetText":"home"}}
- "take me back" (from /pricing) → {"type":"click","confidence":0.9,"action":{"kind":"click","targetText":"home"}}
- "go back" (from /) → {"type":"scroll","confidence":0.8,"action":{"kind":"scroll","direction":"top"}}
- "dismiss" → {"type":"click","confidence":0.9,"action":{"kind":"click","targetText":"Got it!"}}
- "got it" → {"type":"click","confidence":0.95,"action":{"kind":"click","targetText":"Got it!"}}`;

  const userPrompt = `User command: "${transcript}"${contextString}${urlContext}`;

  try {
    console.log('🤖 Calling OpenRouter API for intent classification...');
    console.log('📝 Transcript:', transcript);
    console.log('🔗 Session ID:', sessionId);
    console.log('🌐 Current URL:', currentUrl);
    console.log('🎯 Model:', MODEL_NAME);
    
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://oiglypzvfxuiiqkmwzyr.supabase.co',
        'X-Title': 'Voice Bot Intent Classifier'
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    console.log('📡 OpenRouter API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter API Error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📋 OpenRouter API Response:', JSON.stringify(data, null, 2));
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const responseText = data.choices[0].message.content;
      console.log('🎯 OpenRouter Response Text:', responseText);
      
      // Try to parse JSON from response
      try {
        const result = JSON.parse(responseText);
        console.log('✅ Parsed LLM Result:', JSON.stringify(result, null, 2));
        return result;
      } catch (parseError) {
        console.error('❌ Failed to parse OpenRouter JSON response:', parseError);
        console.error('📄 Raw response:', responseText);
        throw new Error('Invalid JSON response from OpenRouter');
      }
    } else {
      console.error('❌ Unexpected OpenRouter response structure:', data);
      throw new Error('Unexpected response structure from OpenRouter');
    }
  } catch (error) {
    console.error('❌ LLM Classification Error:', error);
    throw error;
  }
}

/**
 * Pattern-based Intent Classification (Fallback)
 */
function classifyWithPatterns(text: string, sessionId: string, currentUrl?: string) {
  const context = getSessionContext(sessionId);
  
  // Handle pronouns using session context
  if (context && (text.includes(' it ') || text.includes('it ') || text.endsWith(' it'))) {
    // Look for the most recent toggle action
    if (context.lastActions && context.lastActions.toggle) {
      const lastToggle = context.lastActions.toggle;
      // Replace "it" with the last toggle target
      text = text.replace(/\bit\b/g, lastToggle.action.target || '');
    }
  }

  // Add website-specific patterns
  const urlPath = currentUrl ? new URL(currentUrl).pathname : '/';

  // Handle popup/dialog closing patterns
  if (/\b(close|dismiss|got it|ok)\b/.test(text) && text.match(/\b(popup|window|dialog|modal)\b/)) {
    return {
      type: 'click',
      confidence: 0.9,
      action: { kind: 'click', targetText: 'Got it!' },
      metadata: { source: 'patterns', rule: 'popup-close' }
    };
  }

  // Handle "got it" specifically
  if (/\b(got it|gotit)\b/.test(text)) {
    return {
      type: 'click',
      confidence: 0.95,
      action: { kind: 'click', targetText: 'Got it!' },
      metadata: { source: 'patterns', rule: 'got-it' }
    };
  }

  // Handle back navigation based on current page
  if (/\b(back|go back|take me back|previous|return)\b/.test(text)) {
    if (urlPath !== '/') {
      // On non-home pages, "back" means go home
      return {
        type: 'click',
        confidence: 0.85,
        action: { kind: 'click', targetText: 'home' },
        metadata: { source: 'patterns', rule: 'back-to-home' }
      };
    } else {
      // On home page, "back" means scroll to top
      return {
        type: 'scroll',
        confidence: 0.8,
        action: { kind: 'scroll', direction: 'top' },
        metadata: { source: 'patterns', rule: 'back-to-top' }
      };
    }
  }

  const patterns = {
    scroll: {
      patterns: [
        /\b(scroll|page)\s+(up|down)\b/,
        /\bscroll\s+(to\s+)?(top|bottom)\b/,
        /\b(go|move|jump)\s+(to\s+)?(top|bottom|up|down)\b/,
        /\b(go|take|bring|navigate)\s+(me\s+)?to\s+(the\s+)?(top|bottom|footer|header|end|beginning)\b/,
        /\b(show|display)\s+(me\s+)?(the\s+)?(footer|header|top|bottom)\b/,
        /\b(last|final)\s+section\b/
      ],
      getDirection: (text: string) => {
        if (/\b(up|top|header|beginning|previous)\b/.test(text)) return 'up';
        if (/\b(down|bottom|footer|end|last|final|next)\b/.test(text)) return 'down';
        if (/\btop\b/.test(text)) return 'top';
        if (/\b(bottom|footer|end|last)\b/.test(text)) return 'bottom';
        return 'down';
      }
    },
    click: {
      patterns: [
        /\b(click|press|tap|select|choose)\s+(on\s+)?(the\s+)?(.+)/,
        /\bopen\s+(.+)/,
        /\b(button|link|tab|modal|dialog)\b/,
        /\bsign\s+(in|up)\b/,
        /\b(subscribe|contact|pricing|features|settings|analytics)\b/,
        /\b(close|dismiss|got it|ok)\b/,
        /\b(home|homepage)\b/
      ],
      getTarget: (text: string) => {
        const clickMatch = text.match(/\b(click|press|tap|select|choose)\s+(on\s+)?(the\s+)?(.+)/);
        if (clickMatch) return clickMatch[4].trim();
        const openMatch = text.match(/\bopen\s+(.+)/);
        if (openMatch) return openMatch[1].trim();
        if (/\bsign\s+in\b/.test(text)) return 'sign in';
        if (/\bsign\s+up\b/.test(text)) return 'sign up';
        if (/\b(close|dismiss|ok)\b/.test(text)) return 'Got it!';
        if (/\b(got it|gotit)\b/.test(text)) return 'Got it!';
        if (/\b(home|homepage)\b/.test(text)) return 'home';
        return null;
      }
    },
    fill: {
      patterns: [
        /\b(type|enter|fill|input|write|put)\s+(.+)/,
        /\bsearch\s+(for\s+)?(.+)/,
        /\b(email|mail)\b/,
        /@|\bat\b|\bdot\b/
      ],
      getValue: (text: string) => {
        const typeMatch = text.match(/\b(type|enter|fill|input|write|put)\s+(.+)/);
        if (typeMatch) return typeMatch[2].trim();
        const searchMatch = text.match(/\bsearch\s+(for\s+)?(.+)/);
        if (searchMatch) return searchMatch[2].trim();
        return text;
      },
      getFieldHint: (text: string) => {
        if (/\b(email|mail)\b/.test(text) || /@|\bat\b|\bdot\b/.test(text)) return 'email';
        if (/\bsearch\b/.test(text)) return 'search';
        return null;
      }
    },
    toggle: {
      patterns: [
        /\btoggle\s+(.+)/,
        /\b(enable|disable)\s+(.+)/,
        /\bselect\s+(basic|pro|enterprise)\s+plan\b/
      ],
      getTarget: (text: string) => {
        const toggleMatch = text.match(/\btoggle\s+(.+)/);
        if (toggleMatch) return toggleMatch[1].trim();
        const enableMatch = text.match(/\b(enable|disable)\s+(.+)/);
        if (enableMatch) return enableMatch[2].trim();
        return null;
      }
    }
  };

  for (const [intentType, config] of Object.entries(patterns)) {
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        let action: any = { kind: intentType };
        let confidence = 0.7;

        switch (intentType) {
          case 'scroll':
            action.direction = config.getDirection(text);
            break;
          case 'click':
            const target = config.getTarget(text);
            if (target) action.targetText = target;
            break;
          case 'fill':
            const value = config.getValue(text);
            const fieldHint = config.getFieldHint(text);
            if (value) {
              action.value = value;
              action.fieldHint = fieldHint;
            }
            break;
          case 'toggle':
            const toggleTarget = config.getTarget(text);
            if (toggleTarget) action.target = toggleTarget;
            break;
        }

        return {
          type: intentType,
          confidence,
          action,
          metadata: { source: 'patterns' }
        };
      }
    }
  }

  return {
    type: 'unknown',
    confidence: 0.1,
    action: { kind: 'unknown' },
    metadata: { source: 'patterns' }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, sessionId, currentUrl } = await req.json();
    
    if (!transcript) {
      return new Response(JSON.stringify({ error: "Transcript is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🎤 Processing transcript:', transcript, 'for session:', sessionId);
    console.log('🌐 Current URL:', currentUrl);

    // First try LLM understanding with session context and URL
    const llmResult = await classifyWithLLM(transcript, sessionId, currentUrl);
    
    if (llmResult && llmResult.confidence >= 0.6) {
      // Store successful action in session memory
      updateSessionContext(sessionId, transcript, llmResult.action);
      
      // Use LLM result if confident
      return new Response(JSON.stringify({
        transcript,
        intent: llmResult.type,
        confidence: llmResult.confidence,
        action: llmResult.action,
        metadata: { ...llmResult.metadata, source: 'llm' }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Fallback to pattern matching with session context and URL
      const patternResult = classifyWithPatterns(transcript.toLowerCase().trim(), sessionId, currentUrl);
      return new Response(JSON.stringify({
        transcript,
        intent: patternResult.type,
        confidence: patternResult.confidence,
        action: patternResult.action,
        metadata: { ...patternResult.metadata, source: 'patterns', llmFallback: true }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('❌ Intent classification error:', error);
    // Fallback to pattern matching on error with session context
    const { transcript, sessionId, currentUrl } = await req.json().catch(() => ({ transcript: '', sessionId: '', currentUrl: '' }));
    const patternResult = classifyWithPatterns(transcript.toLowerCase().trim(), sessionId, currentUrl);
    return new Response(JSON.stringify({
      transcript,
      intent: patternResult.type,
      confidence: patternResult.confidence * 0.8, // Lower confidence due to fallback
      action: patternResult.action,
      metadata: { ...patternResult.metadata, source: 'patterns', llmError: true }
    }), {
      status: 200, // Return 200 for graceful fallback
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
