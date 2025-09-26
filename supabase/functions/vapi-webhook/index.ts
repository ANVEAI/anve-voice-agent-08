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

// Utility function to convert string boolean values to actual booleans
function coerceStringToBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    if (lower === 'auto') return false; // auto defaults to false
  }
  return false;
}

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
    call?: {
      id: string;
      metadata?: {
        sessionId?: string;
      };
    };
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
    const callId = payload.message?.call?.id || payload.call?.id || 'unknown';
    
    // Dual-channel approach: extract both metadata.sessionId and call.id
    const metadataSessionId = payload.message?.call?.metadata?.sessionId || payload.call?.metadata?.sessionId;
    const callIdSession = payload.message?.call?.id || payload.call?.id;
    
    // Determine primary session ID - simplified logic ignoring parameters.session_id
    let primarySessionId = null;
    
    // 1. First priority: metadata.sessionId from frontend (deterministic session handshake)
    if (metadataSessionId && metadataSessionId !== 'default' && metadataSessionId.trim() !== '') {
      primarySessionId = metadataSessionId;
    } 
    // 2. Second priority: Use call.id as fallback
    else if (callIdSession) {
      primarySessionId = callIdSession;
    }
    
    const sessionId = primarySessionId;

    console.log('[vapi-webhook] DEBUG - Processing function call:', { name, parameters, callId, sessionId });
    console.log('[vapi-webhook] DEBUG - Session ID extraction (ignoring parameters.session_id):', {
      messageCallId: payload.message?.call?.id,
      topLevelCallId: payload.call?.id,
      messageMetadataSessionId: payload.message?.call?.metadata?.sessionId,
      topLevelMetadataSessionId: payload.call?.metadata?.sessionId,
      finalSessionId: sessionId,
      parametersSessionIdIgnored: parameters.session_id, // Logged but ignored
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
        const coercedSubmit = coerceStringToBoolean(parameters.submit);
        console.log('[vapi-webhook] DEBUG - Fill field coercion:', { 
          originalSubmit: parameters.submit, 
          coercedSubmit, 
          submitType: typeof parameters.submit 
        });
        command = {
          action: 'fill',
          value: parameters.value,
          fieldHint: parameters.field_hint || 'text',
          selector: parameters.selector || null,
          submit: coercedSubmit,
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

    // Broadcast the command to the primary session channel
    const primaryChannelName = `voice-commands-${sessionId}`;
    console.log('[vapi-webhook] DEBUG - Broadcasting to primary session channel:', primaryChannelName);
    console.log('[vapi-webhook] DEBUG - Primary broadcast details:', {
      sessionId,
      channelName: primaryChannelName,
      commandAction: command.action,
      timestamp: command.timestamp
    });

    const broadcastResult = await supabase
      .channel(primaryChannelName)
      .send({
        type: 'broadcast',
        event: 'voice_command',
        payload: command
      });

    console.log('[vapi-webhook] DEBUG - Primary broadcast result:', broadcastResult ? 'ok' : 'error');
    console.log('[vapi-webhook] DEBUG - Command broadcasted successfully to primary channel:', primaryChannelName);

    // Dual broadcasting: if metadata and call ID are different, broadcast to both channels
    if (metadataSessionId && callIdSession && metadataSessionId !== callIdSession) {
      const secondarySessionId = (sessionId === metadataSessionId) ? callIdSession : metadataSessionId;
      const secondaryChannelName = `voice-commands-${secondarySessionId}`;
      
      console.log('[vapi-webhook] DEBUG - Dual broadcasting to secondary channel:', secondaryChannelName);
      
      const secondaryCommand = { ...command, sessionId: secondarySessionId };
      
      const secondaryBroadcastResult = await supabase
        .channel(secondaryChannelName)
        .send({
          type: 'broadcast',
          event: 'voice_command',
          payload: secondaryCommand
        });

      console.log('[vapi-webhook] DEBUG - Secondary broadcast result:', secondaryBroadcastResult ? 'ok' : 'error');
      console.log('[vapi-webhook] DEBUG - Command broadcasted successfully to secondary channel:', secondaryChannelName);
    }

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