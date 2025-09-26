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
    console.log('[normalize] No OpenRouter API key, returning original value');
    return rawValue;
  }

  try {
    console.log('[normalize] Processing content with LLM:', { rawValue, fieldHint, transcript });

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
            content: `You are a content normalizer that fixes voice-transcribed text for form fields.

CRITICAL: Return ONLY the corrected content, nothing else. No explanations, no quotes, no markdown.

Common voice transcription issues to fix:
- "at" or "at the rate" → "@" in emails
- "dot" or "period" → "." in emails and domains
- "dash" or "hyphen" → "-"
- "underscore" or "under score" → "_"
- Remove spaces in emails, phone numbers, and structured data
- Fix misspelled domains: "g mail"→"gmail", "out look"→"outlook", "hot mail"→"hotmail", "y ahoo"→"yahoo"
- Convert spoken numbers to digits for phone fields

Field types and expected formats:
- EMAIL: user@domain.com (fix spoken email patterns)
- PHONE: clean digits with optional formatting (convert spoken numbers)
- NAME: proper capitalization (first letter of each word)
- SEARCH: clean search query (remove filler words like "um", "uh")
- ADDRESS: proper formatting with commas and spaces
- MESSAGE: natural text (minimal changes, fix obvious errors only)
- COMPANY: proper business name capitalization
- SUBJECT/TITLE: sentence case, proper punctuation

Examples:
- "john at gmail dot com" → "john@gmail.com"
- "five five five one two three four" → "5551234"
- "john smith" → "John Smith"
- "search for um laptops under five hundred" → "laptops under 500"

Process the content but preserve the original meaning and intent.`
          },
          {
            role: 'user',
            content: `Field type: ${fieldHint.toUpperCase()}
Original transcript: "${transcript}"
Extracted value: "${rawValue}"

Normalize this ${fieldHint} content:`
          }
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[normalize] OpenRouter API error:', errorText);
      return rawValue;
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('[normalize] Invalid LLM response structure:', data);
      return rawValue;
    }

    const processedValue = data.choices[0].message.content.trim();
    
    // Validation: ensure processed value isn't empty or just punctuation
    if (!processedValue || processedValue.length < 1 || /^[^a-zA-Z0-9@._-]+$/.test(processedValue)) {
      console.log('[normalize] LLM returned invalid result, using original');
      return rawValue;
    }
    
    console.log('[normalize] LLM processed value:', { 
      fieldType: fieldHint,
      original: rawValue, 
      processed: processedValue,
      transcript: transcript.substring(0, 50) + (transcript.length > 50 ? '...' : '')
    });
    
    return processedValue;

  } catch (error) {
    console.error('[normalize] Error processing content with LLM:', error);
    return rawValue;
  }
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
    const { rawValue, fieldHint, transcript } = await req.json();

    if (!rawValue || !transcript) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: rawValue and transcript are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[normalize] Received request:', { rawValue, fieldHint, transcript });

    const normalizedValue = await processContentWithLLM(
      rawValue, 
      fieldHint || 'text', 
      transcript
    );

    const response = {
      originalValue: rawValue,
      normalizedValue: normalizedValue,
      fieldHint: fieldHint || 'text',
      changed: normalizedValue !== rawValue
    };

    console.log('[normalize] Sending response:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[normalize] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});