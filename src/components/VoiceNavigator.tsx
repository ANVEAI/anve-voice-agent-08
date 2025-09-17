import { useEffect } from 'react';

const VoiceNavigator = () => {
  useEffect(() => {
    // Check if script is already loaded
    if ((window as any).voiceNav) {
      return;
    }

    // Create and inject the voice navigation script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.text = `
(function() {
  'use strict';

  // ------------- Helpers for intent ----------------
  function isScrollIntent(text) {
    const t = (text || "").toLowerCase();
    if (/(scroll|page up|page down|go to (top|bottom|footer|header|last section)|\\btop\\b|\\bbottom\\b|\\bup\\b|\\bdown\\b|footer|header|last section)/.test(t)) return true;
    if (/\\b(hi|hello|hey|how are you|what's up|good (morning|afternoon|evening))\\b/.test(t)) return false;
    return false;
  }

  // Initialize session ID for voice navigator
  if (!window.voiceNavigatorSessionId) {
    window.voiceNavigatorSessionId = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Email-ish detection and completion heuristics
  const EMAIL_TLD_WORDS = '(com|net|org|io|ai|co|in|uk|us|dev|app|edu|gov)';
  function isEmailish(s) {
    const t = (s||'').toLowerCase();
    return /\\b(email|mail)\\b/.test(t) || /@|\\bat\\b|\\bat the rate\\b|\\bdot\\b/.test(t);
  }
  function seemsCompleteEmailPhrase(s) {
    const t = (s||'').toLowerCase();
    // Literal email present
    if (/@[a-z0-9.-]+\\.[a-z]{2,}/i.test(t)) return true;
    // Spoken with "at ... dot tld"
    if (/\\bat\\b/.test(t) && new RegExp(\`\\\\bdot\\\\s+\${EMAIL_TLD_WORDS}\\\\b\`).test(t)) return true;
    // Spoken without "at" but with vendor + dot tld (e.g., "harsha direct mail dot com")
    if (new RegExp(\`\\\\b(gmail|outlook|hotmail|yahoo|proton\\\\s*mail|icloud|direct\\\\s*mail)\\\\b.*\\\\bdot\\\\s+\${EMAIL_TLD_WORDS}\\\\b\`).test(t)) return true;
    return false;
  }
  // Very small fallback normalizer ONLY used when server returns unusable email
  function fallbackNormalizeSpokenEmail(orig) {
    if (!orig) return null;
    let s = String(orig).trim();

    // lowercased working copy
    let w = s.toLowerCase();

    // Join common providers
    w = w
      .replace(/\\bg\\s*mail\\b/g, 'gmail')
      .replace(/\\bproton\\s*mail\\b/g, 'protonmail')
      .replace(/\\bdirect\\s*mail\\b/g, 'directmail')
      .replace(/\\bhot\\s*mail\\b/g, 'hotmail')
      .replace(/\\by\\s*ahoo\\b/g, 'yahoo');

    // Spoken symbols
    w = w
      .replace(/\\bat the rate\\b/g, '@')
      .replace(/\\bat\\b/g, '@')
      .replace(/\\bperiod\\b/g, '.')
      .replace(/\\bdot\\b/g, '.')
      .replace(/\\bunderscore\\b/g, '_')
      .replace(/\\bunder\\s*score\\b/g, '_')
      .replace(/\\bdash\\b/g, '-')
      .replace(/\\bhyphen\\b/g, '-')
      .replace(/\\bplus\\b/g, '+');

    // Remove spaces around punctuation
    w = w.replace(/\\s*@\\s*/g, '@').replace(/\\s*\\.\\s*/g, '.').replace(/\\s*_\\s*/g, '_').replace(/\\s*-\\s*/g, '-');

    // If no '@' but looks like "local provider . tld", insert @
    if (!w.includes('@')) {
      const m = w.match(/^(.+?)\\s+(gmail|outlook|hotmail|yahoo|protonmail|icloud|directmail)\\s*\\.\\s*([a-z]{2,})(?:\\s*\\.\\s*([a-z]{2,}))?$/i);
      if (m) {
        const local = m[1].replace(/\\s+/g, '').replace(/\\.{2,}/g, '.');
        const domain = [m[2], m[3], m[4]].filter(Boolean).join('.').toLowerCase();
        w = \`\${local}@\${domain}\`;
      } else {
        // Otherwise, collapse spaces (keeps any existing @)
        w = w.replace(/\\s+/g, '');
      }
    } else {
      // Remove spaces around parts
      const parts = w.split('@');
      w = parts[0].replace(/\\s+/g, '') + '@' + parts.slice(1).join('@').replace(/\\s+/g, '');
    }

    // Cleanup duplication artifacts
    w = w.replace(/\\.{2,}/g, '.').replace(/@+/g, '@').replace(/@\\./g, '@');

    const emailRe = /^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$/i;
    return emailRe.test(w) ? w : null;
  }

  const VAPI_CONFIG = {
    assistant: "f2c32094-2fa9-478d-906d-73832eb377cb",
    apiKey: "ef2b1fa3-3c5c-47c5-9472-56431ee8ac95",
    position: "bottom-right",
    theme: "light",
    mode: "voice"
  };

  // Supabase Edge Functions URL
  const BACKEND_URL = "https://oiglypzvfxuiiqkmwzyr.supabase.co/functions/v1";

  // Demo log
  function wireDemoClickLogs() {
    const grid = document.getElementById('click-grid');
    const log = document.getElementById('click-log');
    if (!grid || !log) return;
    grid.addEventListener('click', (e) => {
      const el = e.target.closest('a,button');
      if (!el) return;
      const label = (el.innerText || el.textContent || '').trim();
      log.textContent = \`Clicked: \${label}\`;
    });
  }

  class UniversalVoiceNavigator {
    constructor() {
      this.vapiWidget = null;
      this.isInitialized = false;
      this.statusEl = null;
      this.callActive = false;
      this.assistantSpeaking = false;
      this.lastProcessedTranscript = '';
      this.sessionId = 'voice_' + Date.now();

      // Email phrase buffer
      this.emailBuf = '';
      this.emailBufTimer = null;

      this.init();
    }

    init() {
      this.createStatusIndicator();
      this.updateStatus("Loading voice navigation...");
      this.loadVapiSDK();
      wireDemoClickLogs();
    }

    createStatusIndicator() {
      const statusEl = document.createElement('div');
      statusEl.id = 'voice-nav-status';
      statusEl.style.cssText = \`
        position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.9);
        color: white; padding: 12px 16px; border-radius: 8px; font-family: system-ui, sans-serif;
        font-size: 14px; z-index: 10000; max-width: 300px; backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        transition: all 0.3s ease; cursor: pointer;
      \`;
      statusEl.innerHTML = \`
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span id="voice-status-text">Initializing...</span>
          <span style="margin-left:10px;cursor:pointer;opacity:0.7;"
                onclick="this.parentElement.parentElement.style.display='none'">✕</span>
        </div>
      \`;
      document.body.appendChild(statusEl);
      this.statusEl = document.getElementById('voice-status-text');
    }

    loadVapiSDK() {
      if (window.vapiSDK) {
        this.initializeVapi();
        return;
      }
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js";
      script.async = true;
      script.onload = () => this.initializeVapi();
      script.onerror = () => this.updateStatus("❌ Voice SDK failed to load");
      document.head.appendChild(script);
    }

    initializeVapi() {
      try {
        this.vapiWidget = window.vapiSDK.run({
          apiKey: VAPI_CONFIG.apiKey,
          assistant: VAPI_CONFIG.assistant,
          config: { position: VAPI_CONFIG.position, theme: VAPI_CONFIG.theme, mode: VAPI_CONFIG.mode },
          metadata: { sessionId: this.sessionId, url: window.location.href }
        });
        this.setupVapiEventListeners();
        this.isInitialized = true;
        this.updateStatus("🎤 Click the voice button to start!");
      } catch (e) {
        console.error('Vapi initialization error:', e);
        this.updateStatus("❌ Voice setup failed");
      }
    }

    setupVapiEventListeners() {
      this.vapiWidget.on("call-start", () => {
        this.callActive = true;
        this.assistantSpeaking = false;
        this.updateStatus("🎤 Voice active - say your command!");
      });

      this.vapiWidget.on("call-end", () => {
        this.callActive = false;
        this.assistantSpeaking = false;
        this.updateStatus("🔄 Voice ended");
      });

      this.vapiWidget.on("speech-start", () => {
        this.assistantSpeaking = true;
        this.updateStatus("🤖 Assistant responding...");
      });

      this.vapiWidget.on("speech-end", () => {
        this.assistantSpeaking = false;
        this.updateStatus("🎤 Ready for your command");
      });

      // Final transcripts
      this.vapiWidget.on("message", (message) => {
        if (message.type === "transcript" && message.transcriptType === "final") {
          this.handleTranscript(message);
        }
      });

      this.vapiWidget.on("error", (err) => {
        console.error('Vapi error:', err);
        this.updateStatus("❌ Voice error");
        this.callActive = false;
      });
    }

    async callScrollTool(transcript, explicitDirection) {
      try {
        const res = await fetch(\`\${BACKEND_URL}/tools-scroll\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            url: window.location.href,
            transcript,
            direction: explicitDirection
          })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.warn('Scroll tool HTTP error', res.status, text);
          return null;
        }
        return await res.json();
      } catch (e) {
        console.error('callScrollTool error', e);
        return null;
      }
    }

    async callClickTool(transcript) {
      try {
        const res = await fetch(\`\${BACKEND_URL}/tools-click\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            url: window.location.href,
            transcript
          })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.warn('Click tool HTTP error', res.status, text);
          return null;
        }
        return await res.json();
      } catch (e) {
        console.error('callClickTool error', e);
        return null;
      }
    }

    async callNormalizeContent(rawValue, fieldHint, transcript) {
      try {
        const res = await fetch(\`\${BACKEND_URL}/normalize-content\`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2x5cHp2Znh1aWlxa213enlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0ODk1MjgsImV4cCI6MjA3MzA2NTUyOH0.B38gApkvcjYpumFqpX_L6epFIqpZ61-rt_4lYaCXLzI'
          },
          body: JSON.stringify({
            rawValue,
            fieldHint,
            transcript
          })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.warn('Normalize content HTTP error', res.status, text);
          return null;
        }
        return await res.json();
      } catch (e) {
        console.error('callNormalizeContent error', e);
        return null;
      }
    }

    async callFillTool(transcript) {
      try {
        const res = await fetch(\`\${BACKEND_URL}/tools-fill\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            url: window.location.href,
            transcript
          })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.warn('Fill tool HTTP error', res.status, text);
          return null;
        }
        return await res.json();
      } catch (e) {
        console.error('callFillTool error', e);
        return null;
      }
    }

    async callIntentClassifier(transcript) {
      try {
        const res = await fetch('https://oiglypzvfxuiiqkmwzyr.supabase.co/functions/v1/classify-intent', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ2x5cHp2Znh1aWlxa213enlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0ODk1MjgsImV4cCI6MjA3MzA2NTUyOH0.B38gApkvcjYpumFqpX_L6epFIqpZ61-rt_4lYaCXLzI'
          },
          body: JSON.stringify({
            transcript,
            sessionId: window.voiceNavigatorSessionId || 'default',
            currentUrl: window.location.href
          })
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.warn('Intent classifier HTTP error', res.status, text);
          return null;
        }
        return await res.json();
      } catch (e) {
        console.error('callIntentClassifier error', e);
        return null;
      }
    }

    executeIntentAction(intent, action, transcript, confidence) {
      switch (intent) {
        case 'scroll':
          this.updateStatus(\`👤 Scroll (\${Math.round(confidence * 100)}%): "\${transcript}"\`);
          const direction = action.direction || 'down';
          console.log('Executing scroll:', direction);
          this.scrollPage(direction);
          this.updateStatus(\`✅ Scrolled \${direction}\`);
          break;

        case 'click':
          this.updateStatus(\`👤 Click (\${Math.round(confidence * 100)}%): "\${transcript}"\`);
          if (action.targetText) {
            const r = clickElement({ ...action, transcript });
            this.updateStatus(r.ok ? '✅ Clicked' : '⚠️ No matching element');
          } else {
            this.updateStatus('⚠️ No click target identified');
          }
          break;

        case 'fill':
          this.updateStatus(\`👤 Fill (\${Math.round(confidence * 100)}%): "\${transcript}"\`);
          if (action.value) {
            this.processFillWithNormalization(action, transcript);
          } else {
            this.updateStatus('⚠️ No fill value identified');
          }
          break;

        case 'toggle':
          this.updateStatus(\`👤 Toggle (\${Math.round(confidence * 100)}%): "\${transcript}"\`);
          if (action.target) {
            const r = this.handleToggleAction(action.target);
            this.updateStatus(r.ok ? '✅ Toggled' : '⚠️ Toggle target not found');
          } else {
            this.updateStatus('⚠️ No toggle target identified');
          }
          break;

        default:
          this.updateStatus(\`🎧 Heard: "\${transcript}" (\${intent})\`);
      }
    }

    handleToggleAction(target) {
      // Find toggle elements (checkboxes, radio buttons, switches)
      const toggleElements = Array.from(document.querySelectorAll('input[type="checkbox"], input[type="radio"], [role="switch"]'));
      
      const targetLower = target.toLowerCase();
      const scoredElements = toggleElements.map(el => {
        const label = this.getElementLabel(el);
        const score = this.scoreTextMatch(label, targetLower);
        return { element: el, score };
      }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

      if (scoredElements.length > 0) {
        const el = scoredElements[0].element;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          el.click();
        }, 120);
        return { ok: true };
      }
      
      return { ok: false };
    }

    getElementLabel(el) {
      // Get label text for form elements
      const id = el.id;
      if (id) {
        const label = document.querySelector(\`label[for="\${id}"]\`);
        if (label) return (label.textContent || '').trim();
      }
      
      const parent = el.closest('label');
      if (parent) return (parent.textContent || '').trim();
      
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel.trim();
      
      return '';
    }

    scoreTextMatch(text, target) {
      if (!text || !target) return 0;
      const textLower = text.toLowerCase();
      
      if (textLower === target) return 100;
      if (textLower.includes(target)) return 80;
      
      const words = target.split(/\\s+/);
      const matchedWords = words.filter(word => textLower.includes(word));
      return (matchedWords.length / words.length) * 60;
    }

    // ---------- Email buffering logic ----------
    queueEmailFragment(fragment) {
      const t = (fragment || '').trim();
      if (!t) return;

      // Append to buffer
      this.emailBuf = [this.emailBuf, t].filter(Boolean).join(' ').trim();

      // If looks complete, flush immediately
      if (seemsCompleteEmailPhrase(this.emailBuf)) {
        this.flushEmailBuffer('complete');
        return;
      }

      // Otherwise wait briefly for continuation
      clearTimeout(this.emailBufTimer);
      this.emailBufTimer = setTimeout(() => this.flushEmailBuffer('timeout'), 1200);
    }

    async processFillWithNormalization(action, transcript) {
      try {
        this.updateStatus('🔄 Normalizing content...');
        
        // Call normalization API
        const normalizationResult = await this.callNormalizeContent(
          action.value, 
          action.fieldHint || 'text', 
          transcript
        );
        
        if (normalizationResult && normalizationResult.normalizedValue) {
          const normalizedAction = { 
            ...action, 
            value: normalizationResult.normalizedValue 
          };
          
          if (normalizationResult.changed) {
            this.updateStatus(\`✨ Corrected: "\${action.value}" → "\${normalizationResult.normalizedValue}"\`);
          }
          
          const r = fillField(normalizedAction);
          this.updateStatus(r.ok ? (r.submitted ? '✅ Filled and submitted' : '✅ Filled') : '⚠️ No matching field');
        } else {
          // Fallback to original if normalization fails
          const r = fillField(action);
          this.updateStatus(r.ok ? (r.submitted ? '✅ Filled and submitted' : '✅ Filled') : '⚠️ No matching field');
        }
      } catch (error) {
        console.error('processFillWithNormalization error:', error);
        // Fallback to original if error occurs
        const r = fillField(action);
        this.updateStatus(r.ok ? (r.submitted ? '✅ Filled and submitted' : '✅ Filled') : '⚠️ No matching field');
      }
    }

    flushEmailBuffer(reason) {
      clearTimeout(this.emailBufTimer);
      this.emailBufTimer = null;
      const phrase = (this.emailBuf || '').trim();
      this.emailBuf = '';
      if (!phrase) return;

      this.updateStatus(\`👤 Fill (email): "\${phrase}"\`);
      this.callFillTool(phrase)
        .then((result) => {
          console.log('[fill] raw response', JSON.stringify(result, null, 2));
          if (result?.action?.kind === 'fill') {
            const act = { ...result.action };

            // Normalize hint to email when emailish
            if (!act.fieldHint || /^(mail)$/i.test(act.fieldHint)) act.fieldHint = 'email';

            // Process with normalization
            this.processFillWithNormalization(act, phrase);
          } else {
            this.updateStatus('ℹ️ No fill action returned');
          }
        })
        .catch(() => this.updateStatus('❌ Fill failed'));
    }

    // Pre-normalize transcript for common ASR issues and synonyms
    preNormalizeTranscript(transcript) {
      if (!transcript) return transcript;
      
      let normalized = transcript.toLowerCase().trim();
      
      // ASR common confusions
      const asrFixes = {
        'bot it': 'got it',
        'bought it': 'got it',
        'bottom': 'got it',
        'body': 'got it',
        'bought': 'got it',
        'back to home': 'go to home',
        'take me back to': 'go to',
        'take me to': 'go to',
        'navigate to': 'go to',
        'bring me to': 'go to',
        'go back': 'go to home',
        'return home': 'go to home',
        'back home': 'go to home',
        'homepage': 'home',
        'home page': 'home'
      };
      
      // Apply ASR fixes first
      for (const [wrong, correct] of Object.entries(asrFixes)) {
        if (normalized.includes(wrong)) {
          normalized = normalized.replace(new RegExp(wrong, 'gi'), correct);
          console.log(\`🔧 ASR fix applied: "\${wrong}" → "\${correct}"\`);
          break; // Apply only the first match to avoid over-correction
        }
      }
      
      return normalized;
    }

    // Check if this is a direct navigation command that should bypass the click tool
    isDirectNavigation(transcript) {
      const navPatterns = [
        /\b(go to|goto|take me to|navigate to|show me)\s+(home|homepage|pricing|plans|features|about|waitlist|signup|sign\s+up|resources|feedback|contact|help|support)(\s+(page|section))?\b/i,
        /\b(home|homepage|pricing|plans|features|about|waitlist|signup|sign\s+up|resources|feedback|contact|help|support)\s*(page|section)?\s*$/i, // Just the page name at the end
        /\bback to\s+(home|homepage|pricing|plans|features|about|waitlist|signup|sign\s+up|resources|feedback|contact|help|support)\b/i,
        /\b(resources|feedback|contact|help|support|pricing|plans|waitlist|signup|home|homepage)(?!\s+(up|down|here|there))\b/i // Match page names but not scroll directions
      ];
      
      return navPatterns.some(pattern => pattern.test(transcript));
    }

    // Extract navigation target from transcript
    extractNavTarget(transcript) {
      const matches = transcript.match(/\b(home|homepage|pricing|plans|features|about|waitlist|signup|sign\s+up|resources|feedback|contact|help|support)\b/i);
      return matches ? matches[1].toLowerCase().replace(/\s+/g, '') : null;
    }

    // Handle direct navigation
    handleDirectNavigation(target) {
      const navMap = {
        'home': { selector: 'a[href="/"], a[href="#"]', text: 'Home' },
        'homepage': { selector: 'a[href="/"], a[href="#"]', text: 'Home' },
        'pricing': { selector: 'a[href="/pricing"]', text: 'Pricing' },
        'plans': { selector: 'a[href="/pricing"]', text: 'Pricing' },
        'features': { selector: 'a[href="#features"]', text: 'Features' },
        'about': { selector: 'a[href="#about"]', text: 'About' },
        'waitlist': { selector: 'a[href="/waitlist"]', text: 'Join the Waitlist' },
        'signup': { selector: 'a[href="/waitlist"]', text: 'Join the Waitlist' },
        'signUp': { selector: 'a[href="/waitlist"]', text: 'Join the Waitlist' },
        'resources': { selector: 'a[href="/feedback"]', text: 'Feedback' },
        'feedback': { selector: 'a[href="/feedback"]', text: 'Feedback' },
        'contact': { selector: 'a[href="/feedback"]', text: 'Feedback' },
        'help': { selector: 'a[href="/feedback"]', text: 'Feedback' },
        'support': { selector: 'a[href="/feedback"]', text: 'Feedback' }
      };
      
      const nav = navMap[target];
      if (!nav) return false;
      
      // Try selector first
      let element = document.querySelector(nav.selector);
      
      // Fallback to text search
      if (!element) {
        const allLinks = Array.from(document.querySelectorAll('a, button'));
        element = allLinks.find(el => {
          const text = (el.innerText || el.textContent || '').trim().toLowerCase();
          return text.includes(nav.text.toLowerCase()) || text === target;
        });
      }
      
      if (element) {
        console.log(\`🚀 Direct navigation to: \${target}\`);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          // Dispatch multiple events for React Router compatibility
          element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
          element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }, 120);
        return true;
      }
      
      return false;
    }

    async handleTranscript(message) {
      const rawTranscript = message.transcript?.trim();
      if (!rawTranscript || rawTranscript.length < 3) return;

      if (rawTranscript === this.lastProcessedTranscript) return;
      this.lastProcessedTranscript = rawTranscript;

      if (!this.callActive) return;
      if (this.assistantSpeaking) return;

      // Pre-normalize the transcript
      const transcript = this.preNormalizeTranscript(rawTranscript);
      const lowerTranscript = transcript.toLowerCase();
      
      console.log(\`🎤 Processing: "\${rawTranscript}" → "\${transcript}"\`);

      // Check for direct navigation first
      if (this.isDirectNavigation(transcript)) {
        const target = this.extractNavTarget(transcript);
        if (target && this.handleDirectNavigation(target)) {
          this.updateStatus(\`✅ Navigated to \${target}\`);
          return;
        }
      }

      // Try LLM intent classification first
      try {
        const intentResult = await this.callIntentClassifier(transcript);
        if (intentResult && intentResult.confidence >= 0.6) {
          console.log('🧠 LLM Intent Result:', intentResult);
          this.executeIntentAction(intentResult.intent, intentResult.action, transcript, intentResult.confidence);
          return;
        }
      } catch (error) {
        console.warn('Intent classifier failed, using fallback:', error);
      }

      // SCROLL first for specific header/footer navigation
      if (isScrollIntent(transcript)) {
        this.updateStatus(\`👤 Processing: "\${transcript}"\`);
        this.callScrollTool(transcript)
          .then((result) => {
            if (result && result.action && result.action.kind === 'scroll') {
              const dir = result.action.direction || 'down';
              console.log('Executing scroll:', dir);
              this.scrollPage(dir);
              this.updateStatus(\`✅ Scrolled \${dir}\`);
            } else {
              this.updateStatus(\`ℹ️ No scroll action for: "\${transcript}"\`);
            }
          })
          .catch((err) => {
            console.error('Scroll tool call failed', err);
            this.updateStatus('❌ Scroll command failed');
          });
        return;
      }

      // CLICK after scroll check
      {
        const isClickish = /\\b(click|open|press|select|choose|tap|go to|take me to|navigate to|goto|got it|dismiss|close|ok)\\b/.test(lowerTranscript);
        if (isClickish) {
          this.updateStatus(\`👤 Click cmd: "\${transcript}"\`);
          this.callClickTool(transcript)
            .then((result) => {
              if (result?.action?.kind === 'click') {
                const r = clickElement({ ...result.action, transcript });
                this.updateStatus(r.ok ? '✅ Clicked' : '⚠️ No matching element');
              } else {
                this.updateStatus('ℹ️ No click action returned');
              }
            })
            .catch(() => this.updateStatus('❌ Click failed'));
          return;
        }
      }

      // Unified FILL handling with email buffering
      {
        const isFillish = /\\b(type|enter|fill|set|write|put|input|search for|look up)\\b/.test(lowerTranscript);
        const emailish = isEmailish(transcript);

        if (emailish) {
          // Buffer email fragments and send a single call
          this.queueEmailFragment(transcript);
          return;
        }

        if (isFillish) {
          // Non-email fill path (name, search, message, etc.)
          this.updateStatus(\`👤 Fill cmd: "\${transcript}"\`);
          this.callFillTool(transcript)
            .then((result) => {
              console.log('[fill] raw response', JSON.stringify(result, null, 2));
              if (result?.action?.kind === 'fill') {
                const act = { ...result.action };
                console.log('[fill] action used', JSON.stringify(act, null, 2));
                const r = fillField({ ...act, transcript });
                this.updateStatus(r.ok ? (r.submitted ? '✅ Filled and submitted' : '✅ Filled') : '⚠️ No matching field');
              } else {
                this.updateStatus('ℹ️ No fill action returned');
              }
            })
            .catch(() => this.updateStatus('❌ Fill failed'));
          return;
        }
      }

      // Non-action assistant-like
      const botIndicators = [
        'i can help','let me help',"i'll navigate",'i understand',
        'taking you to','going to','i found','here are the',
        'would you like','how can i assist','navigating to'
      ];
      if (botIndicators.some(t => lowerTranscript.includes(t))) {
        this.updateStatus(\`🤖 Ignored: "\${transcript}"\`);
        return;
      }

      // No action matched
      this.updateStatus(\`🎧 Heard: "\${transcript}" (no action)\`);
    }

    scrollPage(direction) {
      const scrollAmount = window.innerHeight * 0.8;
      switch(direction) {
        case 'down': window.scrollBy({ top: scrollAmount, behavior: 'smooth' }); break;
        case 'up': window.scrollBy({ top: -scrollAmount, behavior: 'smooth' }); break;
        case 'top': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
        case 'bottom': window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); break;
        default: window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      }
    }

    updateStatus(message) {
      const el = document.getElementById('voice-status-text');
      if (el) el.textContent = message;
      console.log('🎤 Status:', message);
    }
  }

  function initVoiceNav() {
    if (window.voiceNav) return;
    window.voiceNav = new UniversalVoiceNavigator();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVoiceNav);
  } else {
    initVoiceNav();
  }

  // CLICK utilities
  function visibleScore(el) {
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const visible = style.visibility !== 'hidden' && style.display !== 'none' && parseFloat(style.opacity || '1') > 0.05;
    const w = Math.max(0, Math.min(r.width, window.innerWidth - Math.max(0, r.left)));
    const h = Math.max(0, Math.min(r.height, window.innerHeight - Math.max(0, r.top)));
    const area = w * h;
    return (visible ? 2 : 0) + area;
  }

  function queryByRole(role) {
    if (!role) return [];
    const selectors = {
      button: 'button, [role="button"], input[type="button"], input[type="submit"]',
      link: 'a, [role="link"]',
      checkbox: 'input[type="checkbox"], [role="checkbox"]',
      radio: 'input[type="radio"], [role="radio"]',
      menuitem: '[role="menuitem"]',
      tab: '[role="tab"]',
      option: '[role="option"], option',
    };
    return Array.from(document.querySelectorAll(selectors[role] || '')).filter(Boolean);
  }

  function hasText(el, targetText) {
    if (!targetText) return false;
    const needle = targetText.trim().toLowerCase();
    if (!needle) return false;
    const text = (el.innerText || el.textContent || '').trim().toLowerCase();
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    const title = (el.getAttribute('title') || '').toLowerCase();
    const alt = (el.getAttribute('alt') || '').toLowerCase();
    return text.includes(needle) || aria.includes(needle) || title.includes(needle) || alt.includes(needle);
  }

  // Website-specific element mappings for better voice recognition
  const WEBSITE_ELEMENTS = {
    // Hero section buttons - all variations
    'join the waitlist': ['Join the Waitlist', 'join waitlist', 'waitlist', 'Be the first to voice-enable your site'],
    'join waitlist': ['Join the Waitlist', 'Join Waitlist', 'waitlist'],
    'waitlist': ['Join the Waitlist', 'Join Waitlist'],
    'star us on github': ['Star us on GitHub', 'star on github', 'Star on GitHub'],
    'star on github': ['Star on GitHub', 'star us on github'],
    'github': ['Star us on GitHub', 'Star on GitHub'],
    'watch demo': ['Watch Demo', 'demo'],
    'demo': ['Watch Demo'],
    
    // Header navigation
    'home': ['Home', 'Back to Home'],
    'pricing': ['Pricing'],
    'resources': ['Resources'],
    'features': ['Features'],
    'about': ['About'],
    
    // Navigation variations - normalized by preNormalizeTranscript
    'go to home': ['Home', 'Back to Home'],
    'go to pricing': ['Pricing'],
    'go to features': ['Features'],
    'go to about': ['About'],
    'go to waitlist': ['Join the Waitlist', 'Join Waitlist'],
    
    // CTA button variations
    'be the first to voice-enable your site': ['Be the first to voice-enable your site'],
    'be the first': ['Be the first to voice-enable your site'],
    'voice-enable': ['Be the first to voice-enable your site'],
    'voice enable': ['Be the first to voice-enable your site'],
    
    // Popup/Dialog buttons - handled by preNormalizeTranscript  
    'got it': ['Got it!', 'Got it', 'got it'],
    'ok': ['Got it!', 'Got it', 'got it', 'OK'],
    'close': ['Got it!', 'Got it', 'got it', 'Close', '✕'],
    'dismiss': ['Got it!', 'Got it', 'got it', 'Dismiss'],
    
    // Common command variations
    'wait list': ['Join the Waitlist'],
    'get started': ['Join the Waitlist'],
    'sign up': ['Join the Waitlist'],
    'early access': ['Join the Waitlist'],
    'first 200': ['Be the first to voice-enable your site']
  };

  function findClickTargets({ selector, role, targetText }) {
    let candidates = [];
    
    // Enhanced text matching with website-specific mappings
    if (targetText) {
      const searchText = targetText.toLowerCase().trim();
      const mappedTexts = WEBSITE_ELEMENTS[searchText] || [targetText];
      
      console.log('🎯 Searching for:', searchText, 'Mapped to:', mappedTexts);
      
      // Search with all mapped variations
      const allMatches = new Set();
      
      for (const mappedText of mappedTexts) {
        const normalizedMapped = mappedText.toLowerCase();
        
        // Get all clickable elements
        const allClickable = Array.from(document.querySelectorAll([
          'button', 'a', '[role="button"]', '[role="link"]', 
          '[onclick]', 'input[type="button"]', 'input[type="submit"]',
          '.cursor-pointer', '[tabindex]'
        ].join(',')));
        
        allClickable.forEach((element) => {
          const text = (element.innerText || element.textContent || '').trim().toLowerCase();
          const href = (element.href || '').toLowerCase();
          const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
          
          // Debug logging for "got it" searches
          if (searchText.includes('got') || normalizedMapped.includes('got')) {
            console.log('🔍 Checking element for "got it":', {
              tagName: element.tagName,
              text: text.slice(0, 50),
              classes: element.className,
              hasOnClick: !!element.onclick || element.hasAttribute('onclick'),
              inDialog: !!(element.closest('[role="dialog"]') || element.closest('[data-dialog]') || element.closest('.dialog') || element.closest('[data-state="open"]'))
            });
          }
          
          // Exact match gets highest priority
          if (text === normalizedMapped || text === searchText) {
            console.log('🎯 Exact match found:', element.tagName, text.slice(0, 50));
            allMatches.add(element);
            return;
          }
          
          // Navigation links get priority
          if (href.includes(normalizedMapped) || href.endsWith(\`/\${normalizedMapped}\`) || 
              href.includes(searchText) || href.endsWith(\`/\${searchText}\`)) {
            allMatches.add(element);
            return;
          }
          
          // Partial matches
          if (text.includes(normalizedMapped) || text.includes(searchText) || 
              ariaLabel.includes(normalizedMapped) || ariaLabel.includes(searchText)) {
            console.log('🎯 Partial match found:', element.tagName, text.slice(0, 50));
            allMatches.add(element);
          }
        });
      }
      
      candidates = Array.from(allMatches);
      
      // If no matches with mappings, try word-based fallback
      if (candidates.length === 0) {
        const words = targetText.toLowerCase().split(' ');
        const allClickable = Array.from(document.querySelectorAll([
          'button', 'a', '[role="button"]', '[role="link"]', 
          '[onclick]', 'input[type="button"]', 'input[type="submit"]',
          '.cursor-pointer', '[tabindex]'
        ].join(',')));
        
        candidates = allClickable.filter((element) => {
          const text = (element.innerText || element.textContent || '').trim().toLowerCase();
          const matchCount = words.filter(word => text.includes(word)).length;
          return matchCount >= Math.ceil(words.length / 2);
        });
      }
      
    } else {
      // No target text specified - use selector/role based search
      if (selector) {
        try { candidates = Array.from(document.querySelectorAll(selector)); } catch {}
      }
      if (!candidates.length && role) {
        candidates = candidates.concat(queryByRole(role));
      }
      if (!candidates.length) {
        const prefer = 'a,button,[role="button"],[role="link"],[tabindex]';
        candidates = candidates.concat(Array.from(document.querySelectorAll(prefer)));
      }
    }
    
    // Sort candidates by relevance and visibility
    if (targetText) {
      candidates.sort((a, b) => {
        const aText = (a.innerText || a.textContent || '').trim().toLowerCase();
        const bText = (b.innerText || b.textContent || '').trim().toLowerCase();
        const target = targetText.toLowerCase();
        
        // For "got it" specifically, prioritize buttons with exact text match
        if (target === 'got it' || target === 'got it!') {
          // Prioritize dialog buttons first
          const aInDialog = a.closest('[role="dialog"]') || a.closest('[data-dialog]') || a.closest('.dialog');
          const bInDialog = b.closest('[role="dialog"]') || b.closest('[data-dialog]') || b.closest('.dialog');
          
          if (aInDialog && !bInDialog) return -1;
          if (bInDialog && !aInDialog) return 1;
          
          const aIsGotItButton = a.tagName === 'BUTTON' && (aText === 'got it!' || aText === 'got it');
          const bIsGotItButton = b.tagName === 'BUTTON' && (bText === 'got it!' || bText === 'got it');
          
          if (aIsGotItButton && !bIsGotItButton) return -1;
          if (bIsGotItButton && !aIsGotItButton) return 1;
          
          // If both are "got it" buttons, prefer the one with shorter text (more specific)
          if (aIsGotItButton && bIsGotItButton) {
            return aText.length - bText.length;
          }
        }
        
        // Exact match gets highest priority
        const aExact = aText === target ? 1000 : 0;
        const bExact = bText === target ? 1000 : 0;
        
        // Prioritize elements with shorter text content (more specific)
        const aTextLength = aText.length;
        const bTextLength = bText.length;
        const aShortText = aTextLength <= 20 ? 300 : 0; // Short text bonus
        const bShortText = bTextLength <= 20 ? 300 : 0;
        
        // Prioritize actual clickable elements over containers
        const aClickable = (['BUTTON', 'A', 'INPUT'].includes(a.tagName) || 
                           a.hasAttribute('role') && ['button', 'link'].includes(a.getAttribute('role'))) ? 500 : 0;
        const bClickable = (['BUTTON', 'A', 'INPUT'].includes(b.tagName) || 
                           b.hasAttribute('role') && ['button', 'link'].includes(b.getAttribute('role'))) ? 500 : 0;
        
        // Penalize DIV containers heavily when there are button alternatives
        const aDivPenalty = a.tagName === 'DIV' ? -2000 : 0;
        const bDivPenalty = b.tagName === 'DIV' ? -2000 : 0;
        
        // Links with href get higher priority than buttons for navigation
        const aIsLink = (a.tagName === 'A' && a.href) ? 100 : 0;
        const bIsLink = (b.tagName === 'A' && b.href) ? 100 : 0;
        
        // Visible elements get priority
        const aVisible = visibleScore(a);
        const bVisible = visibleScore(b);
        
        return (bExact + bShortText + bClickable + bDivPenalty + bIsLink + bVisible) - (aExact + aShortText + aClickable + aDivPenalty + aIsLink + aVisible);
      });
    } else {
      // Filter and sort by visibility only
      candidates = candidates.filter(el => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
      });
      candidates.sort((a,b) => visibleScore(b) - visibleScore(a));
    }
    
    console.log('🎯 Found candidates:', candidates.length, candidates.slice(0, 5).map(el => ({
      text: (el.innerText || el.textContent || '').trim(),
      href: el.href || '',
      tag: el.tagName
    })));
    
    return candidates;
  }

  function normalizeClickArgs(args) {
    const out = { ...(args || {}) };
    if (out.targetText) {
      let t = out.targetText.toLowerCase().trim();
      t = t.replace(/^(on\\s+|the\\s+)/, '');
      t = t.replace(/[.?!,:;]+$/g, '');
      t = t.replace(/\\b(button|link|tab|item)\\b$/,'').trim();
      out.targetText = t;
    }
    const tr = (args?.transcript || '').toLowerCase();
    if (!out.role && !out.selector && out.targetText && /\\b(open|go to|navigate|view)\\b/.test(tr)) {
      out.role = 'link';
    }
    if (!out.role && /\\bbutton\\b/.test(tr)) {
      out.role = 'button';
    }
    return out;
  }

  function clickElement(args) {
    const cleaned = normalizeClickArgs(args);
    const { selector, role, targetText, nth } = cleaned;
    const list = findClickTargets({ selector, role, targetText });
    
    console.log('🔍 CLICK DEBUG - targetText:', targetText);
    console.log('🔍 CLICK DEBUG - all candidates:', list.map((el, idx) => ({ 
      index: idx,
      text: (el.innerText || el.textContent || '').trim().slice(0, 100),
      href: el.href || el.getAttribute('href'),
      tagName: el.tagName,
      hasOnClick: !!el.onclick || el.hasAttribute('onclick'),
      classes: el.className
    })));
    
    console.log('CLICK args (cleaned):', cleaned, 'candidates:', list.map(el => ({ 
      text: (el.innerText || el.textContent || '').trim(),
      href: el.href || el.getAttribute('href'),
      tagName: el.tagName 
    })).slice(0,10));
    
    const index = (nth && nth > 0) ? (nth - 1) : 0;
    const el = list[index];
    if (!el) return { ok:false, reason:'no_match' };

    console.log('🎯 Selected element for click:', { 
      index: index,
      text: (el.innerText || el.textContent || '').trim().slice(0, 100),
      href: el.href || el.getAttribute('href'),
      tagName: el.tagName,
      hasOnClick: !!el.onclick || el.hasAttribute('onclick'),
      classes: el.className
    });

    // For dialog buttons, don't scroll - just click directly
    const isDialogButton = el.closest('[role="dialog"]') || el.closest('.dialog') || el.closest('[data-dialog]') || el.closest('[data-state="open"]');
    if (!isDialogButton) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Enhanced click dispatch for better React Router compatibility
    setTimeout(() => { 
      try {
        // Dispatch mouse events sequence for React Router
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        
        console.log('✅ Enhanced click dispatched for:', {
          text: (el.innerText || el.textContent || '').trim().slice(0, 50),
          href: el.href || 'no-href',
          tagName: el.tagName
        });
      } catch (e) {
        console.error('Enhanced click failed:', e);
        // Fallback to simple click
        try { el.click(); } catch {}
      } 
    }, 120);
    return { ok:true };
  }

  // FILL utilities
  function findLabelTextFor(el) {
    const id = el.id;
    if (id) {
      const lab = document.querySelector(\`label[for="\${CSS.escape(id)}"]\`);
      if (lab) return (lab.innerText || lab.textContent || '').trim();
    }
    const parentLabel = el.closest('label');
    if (parentLabel) return (parentLabel.innerText || parentLabel.textContent || '').trim();
    const lbIds = (el.getAttribute('aria-labelledby') || '').split(/\\s+/).filter(Boolean);
    if (lbIds.length) {
      const txt = lbIds.map(i => {
        const n = document.getElementById(i);
        return n ? (n.innerText || n.textContent || '').trim() : '';
      }).join(' ');
      if (txt) return txt;
    }
    return '';
  }

  function canonicalizeHint(hint) {
    const h = (hint || '').toLowerCase().trim();
    if (h === 'title') return 'subject';
    if (h === 'e-mail' || h === 'mail') return 'email';
    if (h === 'msg') return 'message';
    return h;
  }

  function fieldScore(el, hint) {
    const base = visibleScore(el);
    if (!hint) return base;
    const h = canonicalizeHint(hint);
    let score = base;

    const id = (el.id || '').toLowerCase();
    const name = (el.getAttribute('name') || '').toLowerCase();
    const ph = (el.getAttribute('placeholder') || '').toLowerCase();
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    const lbl = findLabelTextFor(el).toLowerCase();
    const isTextarea = el.tagName.toLowerCase() === 'textarea';
    const isInput = el.tagName.toLowerCase() === 'input';
    const type = (el.getAttribute('type') || '').toLowerCase();

    // Field type priority bonuses/penalties (strong bias)
    const singleValueHints = ['name','email','phone','subject','search','title'];
    const longTextHints = ['message','description','comments','feedback','details','note'];

    if (singleValueHints.includes(h)) {
      if (isInput) score += 20000; // strong bias to inputs
      if (isTextarea) score -= 100000; // very strong penalty to avoid textarea
    }
    if (longTextHints.includes(h)) {
      if (isTextarea) score += 15000;
      if (isInput) score -= 2000;
    }

    // Fine-grained type boosts
    if (h === 'email' && type === 'email') score += 12000;
    if (h === 'search' && (type === 'search' || ph.includes('search'))) score += 8000;
    if ((h === 'name' || h === 'subject' || h === 'title') && (type === 'text' || type === '')) score += 3000;

    const bump = (txt, w) => { if (txt.includes(h)) score += w; };
    bump(id, 5000);
    bump(name, 5000);
    bump(ph, 7000);
    bump(aria, 7000);
    bump(lbl, 9000);

    const synonyms = {
      email: ['e-mail','mail','issue-email','idea-email'],
      name: ['full name','first name','last name','username','user name','issue-name','idea-name'],
      search: ['query','keywords','find'],
      phone: ['mobile','number'],
      message: ['comments','feedback','note'],
      subject: ['title','topic','summary','issue-subject','idea-subject'],
      description: ['details','info','information','issue-description','idea-description'],
      address: ['street','city','state','zip','postal','postcode']
    };

    if (synonyms[h]) {
      const syns = synonyms[h];
      [id,name,ph,aria,lbl].forEach(txt => {
        syns.forEach(s => { if (txt.includes(s)) score += 2500; });
      });
    }

    // Negative scoring for obvious mismatches
    if ((h === 'name' || h === 'email' || h === 'subject' || h === 'phone') && [id,name,lbl].some(txt => txt.includes('description') || txt.includes('message') || txt.includes('details'))) {
      score -= 20000;
    }

    return score;
  }

  function inferHintFromTranscript(transcript) {
    const t = (transcript || '').toLowerCase();
    // "in/into the <hint> field/box/input" pattern
    const m = t.match(/\b(in|into)\s+(the\s+)?([a-z0-9 \-_]+?)\s+(field|box|input)\b/);
    if (m) return (m[3] || '').trim();

    const hints = ['email','name','subject','title','description','message','search','phone','address'];
    for (const h of hints) {
      if (t.includes(h)) return h;
    }
    return '';
  }

  function findFillTargets({ selector, fieldHint, transcript }) {
    // Canonicalize hint early (e.g., title -> subject)
    fieldHint = canonicalizeHint(fieldHint);
    let candidates = [];
    if (selector) {
      try { candidates = Array.from(document.querySelectorAll(selector)); } catch {}
    }
    if (!candidates.length) {
      candidates = candidates.concat(Array.from(document.querySelectorAll([
        'input:not([type="hidden"])',
        'textarea',
        '[contenteditable=""], [contenteditable="true"]'
      ].join(','))));
    }
    // Relaxed visibility
    candidates = candidates.filter(el => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return true;
    });
    // Prefer enabled, not readonly
    candidates = candidates.filter(el => !el.disabled && !el.readOnly);

    // If no explicit hint, try to infer from transcript locally
    if (!fieldHint && transcript) {
      const inferred = inferHintFromTranscript(transcript);
      if (inferred) {
        fieldHint = inferred;
        console.log('[debug] inferred fieldHint from transcript:', fieldHint);
      }
    }

    if (fieldHint) {
      candidates.sort((a,b) => fieldScore(b, fieldHint) - fieldScore(a, fieldHint));
      console.log('[debug] field targeting for hint:', fieldHint);
      candidates.slice(0, 3).forEach((el, i) => {
        console.log('[debug] candidate ' + (i+1) + ':', {
          tag: el.tagName,
          type: el.type || 'N/A',
          id: el.id,
          name: el.getAttribute('name'),
          placeholder: el.getAttribute('placeholder'),
          score: fieldScore(el, fieldHint),
          isTextarea: el.tagName.toLowerCase() === 'textarea',
          isInput: el.tagName.toLowerCase() === 'input'
        });
      });
    } else {
      candidates.sort((a,b) => visibleScore(b) - visibleScore(a));
    }
    return candidates;
  }

  function setElementValue(el, value) {
    if (el.isContentEditable) {
      el.focus();
      el.innerHTML = '';
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      el.appendChild(document.createTextNode(value));
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      return;
    }
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea' || (tag === 'input' && !['checkbox','radio','file','submit','button','image','reset'].includes(el.type))) {
      el.focus();
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function trySubmit(el) {
    const form = el.closest('form');
    if (form) {
      const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
      el.dispatchEvent(ev);
      setTimeout(() => {
        if (!form.__submitted) {
          form.__submitted = true;
          form.requestSubmit ? form.requestSubmit() : form.submit();
        }
      }, 120);
      return true;
    }
    const btn = el.closest('.card, form, section, body').querySelector('button[type="submit"], input[type="submit"], button[aria-label*="search"], button[title*="search"], [role="button"][aria-label*="search"]');
    if (btn) { btn.click(); return true; }
    return false;
  }

  function fillField({ value, fieldHint, selector, submit, transcript }) {
    const list = findFillTargets({ selector, fieldHint, transcript });
    const el = list[0];
    if (!el) return { ok:false };

    // Require a non-empty value from the server to avoid clearing fields
    const hasValue = value != null && String(value).trim() !== '';
    if (!hasValue) {
      console.warn('[fill] empty value from server; aborting');
      return { ok:false };
    }

    // Type exactly what the server (or fallback) returned
    const finalValue = String(value);

    el.scrollIntoView({ behavior:'smooth', block:'center' });
    setTimeout(() => {
      setElementValue(el, finalValue);
      // Optional: verify in dev
      try {
        const typed = el.isContentEditable ? (el.textContent || '') : (el.value ?? '');
        console.log('[fill] typed value', typed);
      } catch {}
      if (submit) trySubmit(el);
    }, 120);

    return { ok:true, submitted: !!submit };
  }

})();
`;

    document.head.appendChild(script);
    console.log('Voice navigation script injected');
  }, []);

  return null;
};

export default VoiceNavigator;
