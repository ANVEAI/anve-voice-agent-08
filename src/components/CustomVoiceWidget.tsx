import { useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceCommand {
  type: string;
  [key: string]: any;
}

const VAPI_CONFIG = {
  publicKey: '27b4cb1c-417c-46a8-99f1-5caae66ec27c',
  assistantId: '65002353-42ce-4d46-aa9e-2de77cfa317b',
};

const CustomVoiceWidget = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'processing' | 'speaking'>('idle');
  
  const vapiRef = useRef<Vapi | null>(null);
  const sessionIdRef = useRef<string>('');
  const channelRef = useRef<any>(null);
  const { toast } = useToast();

  // Generate unique session ID
  useEffect(() => {
    sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[CustomVoiceWidget] Generated sessionId:', sessionIdRef.current);
  }, []);

  // Initialize Vapi SDK
  useEffect(() => {
    // Check if keys are configured
    if (!VAPI_CONFIG.publicKey || VAPI_CONFIG.publicKey === 'YOUR_VAPI_PUBLIC_KEY_HERE') {
      console.error('[CustomVoiceWidget] Please configure your Vapi Public Key');
      return;
    }
    
    if (!vapiRef.current) {
      vapiRef.current = new Vapi(VAPI_CONFIG.publicKey);
      
      // Set up event listeners
      vapiRef.current.on('call-start', () => {
        console.log('[CustomVoiceWidget] Call started');
        setIsConnected(true);
        setIsLoading(false);
        setStatus('listening');
        toast({
          title: "Voice Assistant Active",
          description: "Listening for your commands...",
        });
      });

      vapiRef.current.on('call-end', () => {
        console.log('[CustomVoiceWidget] Call ended');
        setIsConnected(false);
        setStatus('idle');
        setTranscript('');
        setIsSpeaking(false);
      });

      vapiRef.current.on('speech-start', () => {
        console.log('[CustomVoiceWidget] User speech started');
        setStatus('listening');
      });

      vapiRef.current.on('speech-end', () => {
        console.log('[CustomVoiceWidget] User speech ended');
        setStatus('processing');
      });

      vapiRef.current.on('message', (message: any) => {
        console.log('[CustomVoiceWidget] Message received:', message);
        
        if (message.type === 'transcript' && message.transcriptType === 'partial') {
          setTranscript(message.transcript);
        }
        
        if (message.type === 'function-call') {
          console.log('[CustomVoiceWidget] Function call detected:', message);
          setStatus('processing');
        }
      });

      vapiRef.current.on('error', (error: any) => {
        console.error('[CustomVoiceWidget] Error:', error);
        toast({
          title: "Voice Assistant Error",
          description: error.message || "An error occurred",
          variant: "destructive",
        });
        setIsLoading(false);
        setIsConnected(false);
        setStatus('idle');
      });
    }

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, [toast]);

  // Set up Supabase channel for voice commands
  useEffect(() => {
    if (!sessionIdRef.current) return;

    const channelName = `voice-commands-${sessionIdRef.current}`;
    console.log('[CustomVoiceWidget] Subscribing to channel:', channelName);

    channelRef.current = supabase.channel(channelName);

    channelRef.current
      .on('broadcast', { event: 'voice_command' }, (payload: { payload: VoiceCommand }) => {
        console.log('[CustomVoiceWidget] Received voice command:', payload.payload);
        handleVoiceCommand(payload.payload);
      })
      .subscribe((status: string) => {
        console.log('[CustomVoiceWidget] Channel subscription status:', status);
      });

    return () => {
      if (channelRef.current) {
        console.log('[CustomVoiceWidget] Unsubscribing from channel');
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const handleVoiceCommand = (command: VoiceCommand) => {
    setStatus('processing');
    
    try {
      switch (command.type) {
        case 'scroll':
          handleScroll(command.direction);
          break;
        case 'click':
          handleClick(command);
          break;
        case 'fill':
          handleFill(command);
          break;
        case 'toggle':
          handleToggle(command);
          break;
        default:
          console.warn('[CustomVoiceWidget] Unknown command type:', command.type);
      }
    } catch (error) {
      console.error('[CustomVoiceWidget] Error executing command:', error);
      toast({
        title: "Command Failed",
        description: "Could not execute the voice command",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setStatus('listening'), 500);
    }
  };

  const handleScroll = (direction: string) => {
    const scrollAmount = window.innerHeight * 0.8;
    
    switch (direction?.toLowerCase()) {
      case 'up':
        window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
        break;
      case 'down':
        window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        break;
      case 'top':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'bottom':
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        break;
    }
  };

  const handleClick = (command: any) => {
    const { targetText, selector, role } = command;
    let element: HTMLElement | null = null;

    if (selector) {
      element = document.querySelector(selector);
    } else if (targetText) {
      element = findElementByText(targetText, role);
    }

    if (element) {
      element.click();
      toast({
        title: "Element Clicked",
        description: `Clicked: ${targetText || selector}`,
      });
    }
  };

  const handleFill = (command: any) => {
    const { targetText, value, fieldType } = command;
    const input = findInputField(targetText, fieldType);

    if (input && input instanceof HTMLInputElement) {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      toast({
        title: "Field Filled",
        description: `Entered: ${value}`,
      });
    }
  };

  const handleToggle = (command: any) => {
    const { targetText } = command;
    const element = findElementByText(targetText);
    
    if (element) {
      element.click();
    }
  };

  const findElementByText = (text: string, role?: string): HTMLElement | null => {
    const normalizedText = text.toLowerCase().trim();
    const selectors = role ? [`[role="${role}"]`, role] : ['button', 'a', '[role="button"]', '[role="link"]'];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (el.textContent?.toLowerCase().includes(normalizedText)) {
          return el as HTMLElement;
        }
      }
    }
    return null;
  };

  const findInputField = (targetText?: string, fieldType?: string): HTMLElement | null => {
    if (targetText) {
      const label = Array.from(document.querySelectorAll('label')).find(
        l => l.textContent?.toLowerCase().includes(targetText.toLowerCase())
      );
      if (label) {
        const forAttr = label.getAttribute('for');
        if (forAttr) return document.getElementById(forAttr);
        return label.querySelector('input, textarea') as HTMLElement;
      }
    }
    
    if (fieldType) {
      return document.querySelector(`input[type="${fieldType}"]`) as HTMLElement;
    }
    
    return document.querySelector('input, textarea') as HTMLElement;
  };

  const startCall = async () => {
    if (!vapiRef.current) {
      toast({
        title: "Configuration Required",
        description: "Please configure your Vapi Public Key and Assistant ID in CustomVoiceWidget.tsx",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setStatus('connecting');

    try {
      await vapiRef.current.start(VAPI_CONFIG.assistantId, {
        variableValues: {
          sessionId: sessionIdRef.current,
          url: window.location.href,
        },
      });
    } catch (error) {
      console.error('[CustomVoiceWidget] Failed to start call:', error);
      setIsLoading(false);
      setStatus('idle');
      toast({
        title: "Connection Failed",
        description: "Could not start voice assistant",
        variant: "destructive",
      });
    }
  };

  const endCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <div className="flex flex-col items-end gap-3">
        {/* Status and Transcript Display */}
        {isConnected && (
          <div className="bg-card border border-border rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${
                status === 'listening' ? 'bg-success animate-pulse' : 
                status === 'processing' ? 'bg-warning animate-pulse' : 
                'bg-muted'
              }`} />
              <span className="text-sm font-medium capitalize text-foreground">{status}</span>
            </div>
            {transcript && (
              <p className="text-sm text-muted-foreground mt-2">
                "{transcript}"
              </p>
            )}
          </div>
        )}

        {/* Voice Button */}
        <Button
          onClick={isConnected ? endCall : startCall}
          disabled={isLoading}
          size="lg"
          variant={isConnected ? "destructive" : "hero"}
          className="rounded-full w-16 h-16 shadow-glow"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isConnected ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default CustomVoiceWidget;
