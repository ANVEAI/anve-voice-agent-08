import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface VAPIWebhookPayload {
  message: {
    type: string;
    functionCall?: {
      name: string;
      parameters: Record<string, any>;
    };
    toolCalls?: Array<{
      function: {
        name: string;
        arguments: string | Record<string, any>;
      };
    }>;
  };
  call?: {
    id: string;
    metadata?: {
      sessionId?: string;
    };
  };
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
    const payload: VAPIWebhookPayload = await req.json();
    console.log('[vapi-webhook] Received payload:', JSON.stringify(payload, null, 2));

    // Handle both function-call and tool-calls message types
    let functionCall = null;
    
    if (payload.message.type === 'function-call' && payload.message.functionCall) {
      functionCall = payload.message.functionCall;
    } else if (payload.message.type === 'tool-calls' && payload.message.toolCalls && payload.message.toolCalls.length > 0) {
      // Handle tool-calls format - take the first tool call
      const toolCall = payload.message.toolCalls[0];
      if (toolCall?.function) {
        functionCall = {
          name: toolCall.function.name,
          parameters: typeof toolCall.function.arguments === 'string' 
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments
        };
      }
    }
    
    if (!functionCall) {
      console.log('[vapi-webhook] Ignoring message - no function call found:', payload.message.type);
      return new Response(JSON.stringify({ result: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, parameters } = functionCall;
    const callId = payload.call?.id || 'unknown';
    
    // Robust session ID extraction with fallback to call ID
    let sessionId = null;
    
    // Check if session_id is valid (not placeholder, default, or empty)
    const isValidSessionId = parameters.session_id && 
      parameters.session_id !== 'default' && 
      parameters.session_id !== '{{call.id}}' && 
      parameters.session_id.trim() !== '';
    
    if (isValidSessionId) {
      sessionId = parameters.session_id;
    } else if (payload.call?.id) {
      // Always fall back to actual call ID from payload
      sessionId = payload.call.id;
    } else if (payload.call?.metadata?.sessionId) {
      sessionId = payload.call.metadata.sessionId;
    }

    console.log('[vapi-webhook] DEBUG - Processing function call:', { name, parameters, callId, sessionId });
    console.log('[vapi-webhook] DEBUG - Session ID extraction:', {
      parametersSessionId: parameters.session_id,
      callId: payload.call?.id,
      metadataSessionId: payload.call?.metadata?.sessionId,
      finalSessionId: sessionId,
      timestamp: new Date().toISOString()
    });

    // Validate session ID is present and valid
    if (!sessionId) {
      console.error('[vapi-webhook] ERROR - No valid session ID found! Available data:', {
        parameters: parameters,
        call: payload.call,
        fullPayload: payload
      });
      return new Response(JSON.stringify({ 
        error: 'No valid session ID found - commands cannot be routed to specific user',
        details: 'Ensure session_id parameter is provided or call.id is available'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate function call and prepare command
    let command;
    switch (name) {
      case 'scroll_page':
        if (!parameters.direction || !['up', 'down', 'top', 'bottom'].includes(parameters.direction)) {
          throw new Error('Invalid scroll direction');
        }
        command = {
          action: 'scroll',
          direction: parameters.direction,
          timestamp: new Date().toISOString(),
          callId,
          sessionId
        };
        break;

      case 'click_element':
        if (!parameters.target_text) {
          throw new Error('Missing target_text for click');
        }
        command = {
          action: 'click',
          targetText: parameters.target_text,
          selector: parameters.selector || null,
          nth: parameters.nth || null,
          role: parameters.role || null,
          timestamp: new Date().toISOString(),
          callId,
          sessionId
        };
        break;

      case 'fill_field':
        if (!parameters.value) {
          throw new Error('Missing value for fill');
        }
        command = {
          action: 'fill',
          value: parameters.value,
          fieldHint: parameters.field_hint || 'text',
          selector: parameters.selector || null,
          submit: parameters.submit || false,
          timestamp: new Date().toISOString(),
          callId,
          sessionId
        };
        break;

      case 'toggle_element':
        if (!parameters.target) {
          throw new Error('Missing target for toggle');
        }
        command = {
          action: 'toggle',
          target: parameters.target,
          timestamp: new Date().toISOString(),
          callId,
          sessionId
        };
        break;

      default:
        throw new Error(`Unknown function: ${name}`);
    }

    console.log('[vapi-webhook] DEBUG - Broadcasting command:', command);

    // Broadcast to session-specific channel
    const channelName = `voice-commands-${sessionId}`;
    console.log('[vapi-webhook] DEBUG - Broadcasting to session channel:', channelName);
    console.log('[vapi-webhook] DEBUG - Broadcast details:', {
      sessionId: sessionId,
      channelName: channelName,
      commandAction: command.action,
      timestamp: new Date().toISOString()
    });
    
    const channel = supabase.channel(channelName);
    const broadcastResult = await channel.send({
      type: 'broadcast',
      event: 'voice_command',
      payload: command
    });

    console.log('[vapi-webhook] DEBUG - Broadcast result:', broadcastResult);
    console.log('[vapi-webhook] DEBUG - Command broadcasted successfully to channel:', channelName);

    // Return success response to VAPI
    return new Response(JSON.stringify({ 
      result: `Executed ${command.action} command successfully`,
      command: command.action,
      timestamp: command.timestamp
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[vapi-webhook] Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      result: 'Command failed to execute'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});