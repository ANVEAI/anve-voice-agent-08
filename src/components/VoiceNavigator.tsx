import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VoiceNavigator = () => {
  useEffect(() => {
    // Create and inject the VAPI Voice Navigator script
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        'use strict';
        
        console.log('[VoiceNavigator] Initializing VAPI Voice Navigator...');
        
        // VAPI Configuration - Replace with your actual values
        const VAPI_CONFIG = {
          publicKey: 'a8487837-e8ae-4bb1-bf89-d6d2fe11de24', // Your VAPI public key
          assistantId: 'f76866d5-c020-41d4-a35c-268f722d81ee', // Your VAPI assistant ID
          position: 'bottom-right',
          theme: 'light'
        };
        
        class VAPIVoiceNavigator {
          constructor() {
            this.vapiInstance = null;
            this.isConnected = false;
            this.supabaseChannel = null;
            this.statusDiv = null;
            this.init();
          }
          
          async init() {
            try {
              await this.loadVAPISDK();
              this.initializeVAPI();
              this.setupSupabaseRealtime();
              this.createStatusUI();
              console.log('[VoiceNavigator] VAPI Voice Navigator initialized successfully');
            } catch (error) {
              console.error('[VoiceNavigator] Failed to initialize:', error);
            }
          }
          
          async loadVAPISDK() {
            return new Promise((resolve, reject) => {
              if (window.vapiSDK) {
                resolve();
                return;
              }
              
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js';
              script.onload = () => {
                console.log('[VoiceNavigator] VAPI SDK loaded');
                resolve();
              };
              script.onerror = () => {
                reject(new Error('Failed to load VAPI SDK'));
              };
              document.head.appendChild(script);
            });
          }
          
          initializeVAPI() {
            if (!window.vapiSDK) {
              throw new Error('VAPI SDK not loaded');
            }
            
            // Generate unique session ID for this user
            this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            
            this.vapiInstance = window.vapiSDK.run({
              apiKey: VAPI_CONFIG.publicKey,
              assistant: VAPI_CONFIG.assistantId,
              config: { 
                position: VAPI_CONFIG.position, 
                theme: VAPI_CONFIG.theme,
                mode: 'voice'
              },
              metadata: { 
                sessionId: this.sessionId,
                url: window.location.href 
              }
            });
            
            this.vapiInstance.on('call-start', () => {
              console.log('[VoiceNavigator] VAPI call started');
              this.isConnected = true;
              this.updateStatus('🎤 Voice active - speak your command', 'listening');
            });
            
            this.vapiInstance.on('call-end', () => {
              console.log('[VoiceNavigator] VAPI call ended');
              this.isConnected = false;
              this.updateStatus('Voice ready - click to start', 'ready');
            });
            
            this.vapiInstance.on('error', (error) => {
              console.error('[VoiceNavigator] VAPI error:', error);
              this.updateStatus('Voice error - try again', 'error');
            });
            
            this.vapiInstance.on('message', (message) => {
              console.log('[VoiceNavigator] VAPI message:', message);
              if (message.type === 'function-call') {
                this.updateStatus('Processing command...', 'processing');
              } else if (message.type === 'conversation-update') {
                // Check if AI responded without calling functions
                const lastMessage = message.conversation?.[message.conversation.length - 1];
                if (lastMessage?.role === 'assistant' && !lastMessage.toolCalls) {
                  console.warn('[VoiceNavigator] AI responded without calling functions. Check VAPI assistant configuration.');
                  this.updateStatus('⚠️ Voice command recognized but not executed', 'warning');
                }
              }
            });
          }
          
          setupSupabaseRealtime() {
            // Get supabase from the global scope (injected by React component)
            console.log('[VoiceNavigator] Checking for supabase client...', typeof window.supabase);
            
            if (!window.supabase) {
              console.error('[VoiceNavigator] Supabase client not available. Available keys:',
                Object.keys(window).filter(k => k.includes('supabase')));
              return;
            }

            console.log('[VoiceNavigator] Supabase client found, setting up realtime...');
            
            // Connect to session-specific Supabase Realtime channel for voice commands
            const channelName = 'voice-commands-' + this.sessionId;
            console.log('[VoiceNavigator] Connecting to session channel:', channelName);
            this.supabaseChannel = window.supabase.channel(channelName);
            
            this.supabaseChannel.on('broadcast', { event: 'voice_command' }, (payload) => {
              console.log('[VoiceNavigator] Received voice command:', payload);
              this.handleVoiceCommand(payload.payload);
            });
            
            this.supabaseChannel.subscribe((status) => {
              console.log('[VoiceNavigator] Supabase channel status:', status);
            });
          }
          
          handleVoiceCommand(command) {
            console.log('[VoiceNavigator] Executing command:', command);
            
            try {
              switch (command.action) {
                case 'scroll':
                  this.scrollPage(command.direction);
                  break;
                case 'click':
                  this.clickElement(command.targetText, command.selector, command.nth, command.role);
                  break;
                case 'fill':
                  this.fillField(command.value, command.fieldHint, command.selector, command.submit);
                  break;
                case 'toggle':
                  this.toggleElement(command.target);
                  break;
                default:
                  console.warn('[VoiceNavigator] Unknown command action:', command.action);
              }
              
              this.updateStatus('Command executed', 'success');
              setTimeout(() => {
                this.updateStatus('Voice ready - click to start', 'ready');
              }, 2000);
              
            } catch (error) {
              console.error('[VoiceNavigator] Error executing command:', error);
              this.updateStatus('Command failed', 'error');
            }
          }
          
          // DOM Manipulation Functions (preserved from original)
          scrollPage(direction) {
            console.log('[VoiceNavigator] Scrolling:', direction);
            
            const scrollAmount = window.innerHeight * 0.8;
            
            switch (direction.toLowerCase()) {
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
          }
          
          clickElement(targetText, selector = null, nth = null, role = null) {
            console.log('[VoiceNavigator] Clicking element:', { targetText, selector, nth, role });
            
            const targets = this.findClickTargets(targetText, selector, role);
            
            if (targets.length === 0) {
              console.warn('[VoiceNavigator] No clickable elements found for:', targetText);
              return;
            }
            
            let targetElement = targets[0].element;
            
            if (nth && nth > 0 && targets[nth - 1]) {
              targetElement = targets[nth - 1].element;
            }
            
            this.simulateClick(targetElement);
          }
          
          fillField(value, fieldHint = 'text', selector = null, submit = false) {
            console.log('[VoiceNavigator] Filling field:', { value, fieldHint, selector, submit });
            
            const targets = this.findFillTargets(fieldHint, selector);
            
            if (targets.length === 0) {
              console.warn('[VoiceNavigator] No fillable fields found');
              return;
            }
            
            const targetElement = targets[0].element;
            this.setFieldValue(targetElement, value);
            
            if (submit) {
              setTimeout(() => {
                const form = targetElement.closest('form');
                if (form) {
                  form.submit();
                } else {
                  const submitBtn = form?.querySelector('button[type="submit"], input[type="submit"]');
                  if (submitBtn) {
                    submitBtn.click();
                  }
                }
              }, 100);
            }
          }
          
          toggleElement(target) {
            console.log('[VoiceNavigator] Toggling element:', target);
            
            const toggles = this.findToggleElements(target);
            
            if (toggles.length === 0) {
              console.warn('[VoiceNavigator] No toggle elements found for:', target);
              return;
            }
            
            this.simulateClick(toggles[0].element);
          }
          
          // Element Finding Functions (preserved from original)
          findClickTargets(targetText, selector = null, role = null) {
            const candidates = [];
            const normalizedTarget = targetText.toLowerCase().trim();
            
            // Find all potentially clickable elements
            const clickableSelectors = [
              'button', 'a', '[role="button"]', '[onclick]', 
              'input[type="button"]', 'input[type="submit"]',
              '[tabindex]:not([tabindex="-1"])', '.clickable'
            ];
            
            if (selector) {
              clickableSelectors.unshift(selector);
            }
            
            if (role) {
              clickableSelectors.unshift(\`[role="\${role}"]\`);
            }
            
            for (const sel of clickableSelectors) {
              try {
                const elements = document.querySelectorAll(sel);
                elements.forEach(el => {
                  if (this.isVisible(el)) {
                    const score = this.calculateTextMatch(el, normalizedTarget);
                    if (score > 0) {
                      candidates.push({ element: el, score });
                    }
                  }
                });
              } catch (e) {
                console.warn('Invalid selector:', sel);
              }
            }
            
            return candidates.sort((a, b) => b.score - a.score);
          }
          
          findFillTargets(fieldHint, selector = null) {
            const candidates = [];
            
            const fillableSelectors = [
              'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])',
              'textarea', 'select', '[contenteditable="true"]'
            ];
            
            if (selector) {
              fillableSelectors.unshift(selector);
            }
            
            for (const sel of fillableSelectors) {
              try {
                const elements = document.querySelectorAll(sel);
                elements.forEach(el => {
                  if (this.isVisible(el) && !el.disabled && !el.readOnly) {
                    const score = this.calculateFieldMatch(el, fieldHint);
                    candidates.push({ element: el, score });
                  }
                });
              } catch (e) {
                console.warn('Invalid selector:', sel);
              }
            }
            
            return candidates.sort((a, b) => b.score - a.score);
          }
          
          findToggleElements(target) {
            const candidates = [];
            const normalizedTarget = target.toLowerCase().trim();
            
            const toggleSelectors = [
              'input[type="checkbox"]', 'input[type="radio"]',
              'button[aria-pressed]', '[role="switch"]', '[role="checkbox"]'
            ];
            
            for (const sel of toggleSelectors) {
              const elements = document.querySelectorAll(sel);
              elements.forEach(el => {
                if (this.isVisible(el)) {
                  const score = this.calculateTextMatch(el, normalizedTarget);
                  if (score > 0) {
                    candidates.push({ element: el, score });
                  }
                }
              });
            }
            
            return candidates.sort((a, b) => b.score - a.score);
          }
          
          // Utility Functions (preserved from original)
          calculateTextMatch(element, target) {
            let score = 0;
            const texts = [
              element.textContent?.toLowerCase() || '',
              element.getAttribute('aria-label')?.toLowerCase() || '',
              element.getAttribute('title')?.toLowerCase() || '',
              element.getAttribute('alt')?.toLowerCase() || '',
              element.value?.toLowerCase() || '',
              element.getAttribute('placeholder')?.toLowerCase() || ''
            ];
            
            for (const text of texts) {
              if (text.includes(target)) {
                score += text === target ? 100 : 50;
              } else if (target.includes(text) && text.length > 2) {
                score += 25;
              }
            }
            
            return score;
          }
          
          calculateFieldMatch(element, fieldHint) {
            let score = this.visibleScore(element);
            
            const hints = [
              element.getAttribute('name')?.toLowerCase() || '',
              element.getAttribute('id')?.toLowerCase() || '',
              element.getAttribute('placeholder')?.toLowerCase() || '',
              element.getAttribute('type')?.toLowerCase() || '',
              element.className.toLowerCase()
            ];
            
            const normalizedHint = fieldHint.toLowerCase();
            
            for (const hint of hints) {
              if (hint.includes(normalizedHint) || normalizedHint.includes(hint)) {
                score += 50;
              }
            }
            
            return score;
          }
          
          isVisible(element) {
            if (!element) return false;
            
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== 'hidden' &&
              style.display !== 'none' &&
              style.opacity !== '0'
            );
          }
          
          visibleScore(element) {
            const rect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            if (rect.top >= 0 && rect.bottom <= viewportHeight &&
                rect.left >= 0 && rect.right <= viewportWidth) {
              return 100; // Fully visible
            } else if (rect.bottom > 0 && rect.top < viewportHeight &&
                       rect.right > 0 && rect.left < viewportWidth) {
              return 50; // Partially visible
            }
            return 10; // Not visible but exists
          }
          
          simulateClick(element) {
            if (!element) return;
            
            element.focus();
            
            const events = ['mousedown', 'mouseup', 'click'];
            events.forEach(eventType => {
              const event = new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true
              });
              element.dispatchEvent(event);
            });
          }
          
          setFieldValue(element, value) {
            if (!element) return;
            
            element.focus();
            
            if (element.tagName === 'SELECT') {
              const options = Array.from(element.options);
              const matchingOption = options.find(opt => 
                opt.text.toLowerCase().includes(value.toLowerCase()) ||
                opt.value.toLowerCase().includes(value.toLowerCase())
              );
              if (matchingOption) {
                element.value = matchingOption.value;
              }
            } else if (element.contentEditable === 'true') {
              element.textContent = value;
            } else {
              element.value = value;
            }
            
            // Trigger input events
            const events = ['input', 'change'];
            events.forEach(eventType => {
              const event = new Event(eventType, { bubbles: true });
              element.dispatchEvent(event);
            });
          }
          
          // UI Status Functions
          createStatusUI() {
            this.statusDiv = document.createElement('div');
            this.statusDiv.id = 'voice-navigator-status';
            this.statusDiv.style.cssText = \`
              position: fixed;
              top: 20px;
              right: 20px;
              background: rgba(0, 0, 0, 0.9);
              color: white;
              padding: 12px 16px;
              border-radius: 8px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              z-index: 10000;
              max-width: 300px;
              transition: all 0.3s ease;
              pointer-events: none;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255,255,255,0.2);
              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            \`;
            
            document.body.appendChild(this.statusDiv);
            this.updateStatus('Voice ready - click to start', 'ready');
          }
          
          updateStatus(message, type = 'info') {
            if (!this.statusDiv) return;
            
            const colors = {
              ready: '#10b981',
              listening: '#3b82f6', 
              processing: '#f59e0b',
              success: '#10b981',
              error: '#ef4444',
              info: '#6b7280',
              warning: '#f59e0b'
            };
            
            this.statusDiv.textContent = message;
            this.statusDiv.style.borderLeft = \`4px solid \${colors[type]}\`;
          }
        }
        
        // Make supabase available globally for the injected script (do not overwrite if already set)
        window.supabase = window.supabase || null; // Preserved if injected earlier
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            window.vapiVoiceNavigator = new VAPIVoiceNavigator();
          });
        } else {
          window.vapiVoiceNavigator = new VAPIVoiceNavigator();
        }
        
      })();
    `;
    
    // Inject supabase client into global scope BEFORE adding the script
    (window as any).supabase = supabase;
    console.log('[VoiceNavigator] Supabase client injected:', !!supabase);
    
    // Add script identifier for cleanup
    script.setAttribute('data-voice-navigator', 'true');
    document.head.appendChild(script);
    
    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[data-voice-navigator]');
      if (existingScript) {
        existingScript.remove();
      }
      
      if ((window as any).vapiVoiceNavigator?.supabaseChannel) {
        (window as any).vapiVoiceNavigator.supabaseChannel.unsubscribe();
      }
      
      const statusDiv = document.getElementById('voice-navigator-status');
      if (statusDiv) {
        statusDiv.remove();
      }
      
      // Clean up global references
      delete (window as any).supabase;
      delete (window as any).vapiVoiceNavigator;
    };
  }, []);

  return null;
};

export default VoiceNavigator;