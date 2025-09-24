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
    } else if (payload.message.type === 'tool-calls' && payload.message.toolCalls?.length > 0) {
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
    const sessionId = payload.call?.metadata?.sessionId;

    console.log('[vapi-webhook] Processing function call:', { name, parameters, callId, sessionId });

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
          callId
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
          callId
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
          callId
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
          callId
        };
        break;

      default:
        throw new Error(`Unknown function: ${name}`);
    }

    console.log('[vapi-webhook] Broadcasting command:', command);

    // Broadcast command via session-specific Supabase Realtime channel
    if (!sessionId) {
      throw new Error('Missing sessionId in call metadata - commands cannot be routed to specific user');
    }
    
    const channelName = \`voice-commands-\${sessionId}\`;
    console.log('[vapi-webhook] Broadcasting to session channel:', channelName);
    
    const channel = supabase.channel(channelName);
    await channel.send({
      type: 'broadcast',
      event: 'voice_command',
      payload: command
    });

    console.log('[vapi-webhook] Command broadcasted successfully');

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
      error: error.message,
      result: 'Command failed to execute'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});