/**
 * Cloudflare Bypass
 * Detection and bypass for Cloudflare protection (Level 1-3)
 */

import type { Page } from 'puppeteer';
import { CaptchaManager, type CaptchaTask, type CaptchaSolution } from './captchaManager.js';

export interface CloudflareChallenge {
  type: 'javascript' | 'captcha' | 'turnstile' | 'unknown';
  detected: boolean;
  level: 1 | 2 | 3;
  challengeElement?: string;
}

export interface CloudflareBypassOptions {
  captchaApiKey?: string;
  capsolverApiKey?: string;
  anticaptchaApiKey?: string;
  deathbycaptchaApiKey?: string;
  captchaManager?: CaptchaManager;
}

export class CloudflareBypass {
  private captchaManager: CaptchaManager;

  constructor(options: CloudflareBypassOptions = {}) {
    this.captchaManager = options.captchaManager || new CaptchaManager();
    
    // Configure providers if API keys provided
    if (options.captchaApiKey) {
      this.captchaManager.configureProvider('2captcha', {
        apiKey: options.captchaApiKey,
        enabled: true,
      });
    }
    if (options.capsolverApiKey) {
      this.captchaManager.configureProvider('capsolver', {
        apiKey: options.capsolverApiKey,
        enabled: true,
      });
    }
    if (options.anticaptchaApiKey) {
      this.captchaManager.configureProvider('anticaptcha', {
        apiKey: options.anticaptchaApiKey,
        enabled: true,
      });
    }
    if (options.deathbycaptchaApiKey) {
      this.captchaManager.configureProvider('deathbycaptcha', {
        apiKey: options.deathbycaptchaApiKey,
        enabled: true,
      });
    }
  }

  /**
   * Detects if Cloudflare protection is active (faster detection)
   */
  async detectCloudflare(page: Page): Promise<CloudflareChallenge> {
    try {
      const url = page.url();
      
      // Fast detection using URL and title first (no need to load full content)
      const title = await page.title();
      const urlHasChallenge = url.includes('__cf_chl_j_tk') || url.includes('__cf_chl_captcha_tk__');
      const titleHasChallenge = title.includes('Just a moment') || title.includes('Checking your browser');

      if (urlHasChallenge || titleHasChallenge) {
        // Quick positive detection - get more details
        const content = await page.content();
        return this.analyzeChallengeDetails(content, url, title);
      }

      // Check content only if URL/title don't indicate challenge
      const content = await page.content();
      const hasCloudflareIndicators = 
        content.includes('cf-browser-verification') ||
        content.includes('cf-challenge') ||
        content.includes('cloudflare') ||
        content.includes('cf-turnstile');

      if (!hasCloudflareIndicators) {
        return {
          type: 'unknown',
          detected: false,
          level: 1
        };
      }

      return this.analyzeChallengeDetails(content, url, title);
    } catch (error) {
      console.error('Error detecting Cloudflare:', error);
      return {
        type: 'unknown',
        detected: false,
        level: 1
      };
    }
  }

  /**
   * Analyzes challenge details from content
   */
  private analyzeChallengeDetails(
    content: string,
    url: string,
    title: string
  ): CloudflareChallenge {
    // Determine challenge type and level
    let challengeType: CloudflareChallenge['type'] = 'unknown';
    let level: 1 | 2 | 3 = 1;

    // Check for Turnstile first (Level 3 - highest)
    if (content.includes('cf-turnstile') || content.includes('turnstile') || url.includes('__cf_chl_tk')) {
      challengeType = 'turnstile';
      level = 3;
    }
    // Check for CAPTCHA (Level 2)
    else if (content.includes('cf_captcha') || content.includes('g-recaptcha') || url.includes('__cf_chl_captcha_tk__')) {
      challengeType = 'captcha';
      level = 2;
    }
    // Check for JavaScript challenge (Level 1)
    else if (content.includes('cf-browser-verification') || content.includes('jschl_vc') || url.includes('__cf_chl_j_tk')) {
      challengeType = 'javascript';
      level = 1;
    }

    return {
      type: challengeType,
      detected: true,
      level,
      challengeElement: this.findChallengeElement(content, challengeType)
    };
  }

  /**
   * Finds the challenge element selector
   */
  private findChallengeElement(content: string, challengeType: CloudflareChallenge['type']): string {
    if (content.includes('cf-browser-verification')) {
      return '#cf-browser-verification';
    }
    if (content.includes('cf-challenge')) {
      return '#challenge-form';
    }
    if (content.includes('cf-turnstile')) {
      return '.cf-turnstile';
    }
    return '';
  }

  /**
   * Bypasses JavaScript challenge (Level 1) - ACTIVE SOLVER
   */
  async bypassJavaScriptChallenge(page: Page): Promise<boolean> {
    try {
      // Wait for challenge form to load
      const challengeForm = await page.waitForSelector('#challenge-form, #cf-browser-verification', {
        timeout: 10000
      }).catch(() => null);

      if (!challengeForm) {
        // No challenge form found, likely already passed
        return true;
      }

      // ENHANCED: Active solving with multiple strategies
      const solved = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          const form = document.querySelector('#challenge-form') as HTMLFormElement;

          if (!form) {
            resolve(false);
            return;
          }

          // Extract challenge parameters (Cloudflare JS challenge uses jschl_vc and pass)
          const jschlVc = (document.querySelector('input[name="jschl_vc"]') as HTMLInputElement)?.value;
          const pass = (document.querySelector('input[name="pass"]') as HTMLInputElement)?.value;
          const r = (document.querySelector('input[name="r"]') as HTMLInputElement)?.value;

          if (!jschlVc || !pass) {
            // Challenge parameters not found, wait for auto-solve
            setTimeout(() => {
              const stillPresent = document.querySelector('#cf-browser-verification');
              resolve(!stillPresent);
            }, 8000);
            return;
          }

          // STRATEGY 1: Extract and execute challenge code actively
          try {
            const scripts = document.querySelectorAll('script');
            let challengeCode = '';
            let answer: number | null = null;

            // Find the challenge script
            for (const script of Array.from(scripts)) {
              const text = script.textContent || '';
              if (text.includes('jschl-answer') || text.includes('jschl_answer') || text.includes('a.value')) {
                challengeCode = text;

                // ACTIVE SOLVING: Extract arithmetic operations
                // Cloudflare typically uses: var a = {}; a.value = (complex math);
                // SECURITY: Use safe math evaluation instead of eval()
                try {
                  // Safe math evaluator - only allows numbers and basic operators
                  const safeMathEval = (expr: string): number | null => {
                    // Remove all whitespace and validate characters
                    const cleaned = expr.replace(/\s/g, '');
                    // Only allow: digits, decimal points, +, -, *, /, (, )
                    if (!/^[0-9+\-*/.()]+$/.test(cleaned)) {
                      return null;
                    }
                    // Use Function with strict validation (safer than eval)
                    try {
                      const result = Function('"use strict"; return (' + cleaned + ')')();
                      return typeof result === 'number' && isFinite(result) ? result : null;
                    } catch {
                      return null;
                    }
                  };

                  // Extract the math expression from challenge
                  const mathPatterns = [
                    /a\.value\s*=\s*([0-9+\-*/.()]+)/,
                    /s\.value\s*=\s*([0-9+\-*/.()]+)/,
                    /jschl_answer\s*=\s*([0-9+\-*/.()]+)/,
                  ];

                  for (const pattern of mathPatterns) {
                    const match = challengeCode.match(pattern);
                    if (match && match[1]) {
                      const result = safeMathEval(match[1]);
                      if (result !== null) {
                        answer = result + window.location.hostname.length;
                        break;
                      }
                    }
                  }
                } catch (e) {
                  console.log('Safe math evaluation failed:', e);
                }

                break;
              }
            }

            // STRATEGY 2: Monitor for auto-filled answer and submit immediately
            const startTime = Date.now();
            const maxWait = 12000; // Extended to 12 seconds for better reliability

            const checkCompletion = () => {
              const answerInput = document.querySelector('input[name="jschl_answer"]') as HTMLInputElement;
              const challengeGone = !document.querySelector('#cf-browser-verification');

              // Success: Challenge disappeared
              if (challengeGone) {
                console.log('Challenge bypassed successfully');
                resolve(true);
                return;
              }

              // ACTIVE INJECTION: If we calculated an answer, inject it
              if (answer !== null && answerInput && !answerInput.value) {
                answerInput.value = String(answer);
                console.log('Injected calculated answer:', answer);
              }

              // Check if answer was auto-filled or manually injected
              if (answerInput && answerInput.value) {
                console.log('Submitting form with answer:', answerInput.value);
                // Submit the form
                form.submit();
                setTimeout(() => resolve(true), 2000);
                return;
              }

              // Continue polling
              if (Date.now() - startTime < maxWait) {
                setTimeout(checkCompletion, 300); // Reduced poll interval for faster response
              } else {
                // FINAL ATTEMPT: Force submission even without answer
                console.log('Timeout reached, forcing submission');
                try {
                  // Try one more calculation attempt
                  if (answerInput && !answerInput.value) {
                    answerInput.value = String(window.location.hostname.length);
                  }
                  form.submit();
                  setTimeout(() => resolve(true), 2000);
                } catch {
                  resolve(false);
                }
              }
            };

            checkCompletion();

          } catch (error) {
            console.error('Challenge solving error:', error);
            // Fallback: wait and check
            setTimeout(() => {
              const stillPresent = document.querySelector('#cf-browser-verification');
              resolve(!stillPresent);
            }, 8000);
          }
        });
      });

      if (solved) {
        // Wait for navigation after form submission
        await page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 15000
        }).catch(() => {
          console.log('Navigation timeout after challenge submit - may still be successful');
        });
      }

      // ENHANCED VERIFICATION: Check multiple indicators
      const stillBlocked = await page.$('#cf-browser-verification, #challenge-form, #cf-challenge-running');
      const hasAccessDenied = await page.$('text=Access denied').catch(() => null);

      const success = !stillBlocked && !hasAccessDenied;
      console.log('JS Challenge bypass result:', success ? 'SUCCESS' : 'FAILED');

      return success;

    } catch (error) {
      console.error('Error bypassing JavaScript challenge:', error);
      return false;
    }
  }

  /**
   * Bypasses CAPTCHA challenge (Level 2) with multi-provider fallback
   */
  async bypassCaptchaChallenge(
    page: Page,
    captchaApiKey?: string
  ): Promise<boolean> {
    try {
      // Find CAPTCHA element
      const captchaElement = await page.$('.g-recaptcha, #cf_captcha');
      if (!captchaElement) {
        return false;
      }

      // Extract site key
      const siteKey = await page.evaluate(() => {
        const recaptcha = document.querySelector('.g-recaptcha');
        return recaptcha?.getAttribute('data-sitekey') || '';
      });

      if (!siteKey) {
        return false;
      }

      // Create CAPTCHA task
      const task: CaptchaTask = {
        siteKey,
        pageUrl: page.url(),
        type: 'recaptcha-v2',
      };

      // Try to solve CAPTCHA using configured providers (CaptchaManager handles priority)
      let solution: CaptchaSolution | null = null;

      try {
        console.log('Attempting CAPTCHA solve with configured providers...');
        solution = await this.captchaManager.solveCaptcha(task);

        if (solution && solution.token) {
          console.log(`✅ CAPTCHA solved successfully with ${solution.provider}`);
        }
      } catch (error) {
        console.warn('CAPTCHA solving failed:', error);
      }

      if (!solution || !solution.token) {
        console.error('All CAPTCHA providers failed');
        return false;
      }

      // Submit the solution
      await page.evaluate((token: string) => {
        const textarea = document.querySelector('textarea[name="g-recaptcha-response"]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = token;
        }

        // Trigger change event
        const event = new Event('change', { bubbles: true });
        textarea?.dispatchEvent(event);

        // Also try to trigger callback if it exists
        if ((window as any).grecaptcha && (window as any).grecaptcha.getResponse) {
          try {
            (window as any).grecaptcha.execute();
          } catch {}
        }
      }, solution.token);

      // Submit the form
      await page.click('button[type="submit"]').catch(() => {
        // If button click fails, try form submit
        page.evaluate(() => {
          const form = document.querySelector('form');
          if (form) form.submit();
        });
      });

      await page.waitForNavigation({ timeout: 30000 }).catch(() => {});

      // Verify CAPTCHA is gone
      const stillBlocked = await page.$('.g-recaptcha, #cf_captcha');
      return !stillBlocked;

    } catch (error) {
      console.error('Error bypassing CAPTCHA challenge:', error);
      return false;
    }
  }

  /**
   * Bypasses Turnstile challenge (Level 3) with multi-provider fallback + token verification
   */
  async bypassTurnstileChallenge(
    page: Page,
    capsolverApiKey?: string
  ): Promise<boolean> {
    try {
      // Find Turnstile element
      const turnstileElement = await page.$('.cf-turnstile, [data-sitekey]');
      if (!turnstileElement) {
        return false;
      }

      // Extract site key
      const siteKey = await page.evaluate(() => {
        const turnstile = document.querySelector('.cf-turnstile, [data-sitekey]');
        return turnstile?.getAttribute('data-sitekey') || '';
      });

      if (!siteKey) {
        return false;
      }

      // Create CAPTCHA task
      const task: CaptchaTask = {
        siteKey,
        pageUrl: page.url(),
        type: 'turnstile',
      };

      // Try to solve Turnstile using configured providers (CaptchaManager handles priority)
      let solution: CaptchaSolution | null = null;

      try {
        console.log('Attempting Turnstile solve with configured providers...');
        solution = await this.captchaManager.solveCaptcha(task);

        if (solution && solution.token) {
          console.log(`✅ Turnstile solved successfully with ${solution.provider}`);
        }
      } catch (error) {
        console.warn('Turnstile solving failed:', error);
      }

      if (!solution || !solution.token) {
        console.warn('No CAPTCHA providers available - falling back to passive wait strategy');
        // Fallback: Wait for user to manually solve or for challenge to auto-solve
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second wait

        // Check if challenge was solved
        const stillHasTurnstile = await page.evaluate(() => {
          return document.querySelector('[name="cf-turnstile-response"]') !== null;
        });

        if (!stillHasTurnstile) {
          console.log('✅ Turnstile challenge resolved (possibly auto-solved)');
          return true;
        }

        console.error('Turnstile challenge still present after passive wait');
        return false;
      }

      // Submit the solution with enhanced token injection
      await page.evaluate((token: string) => {
        const input = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement;
        if (input) {
          input.value = token;

          // Trigger input event
          const inputEvent = new Event('input', { bubbles: true });
          input.dispatchEvent(inputEvent);
        }

        // Try multiple Turnstile injection methods
        const turnstileInput = document.querySelector('input[name="cf-turnstile-response"], textarea[name="cf-turnstile-response"]') as HTMLInputElement;
        if (turnstileInput) {
          turnstileInput.value = token;
        }

        // Try to trigger Turnstile callback if available
        if ((window as any).turnstile) {
          try {
            // Reset Turnstile state
            if ((window as any).turnstile.reset) {
              (window as any).turnstile.reset();
            }
            // Remove the widget to prevent re-verification
            if ((window as any).turnstile.remove) {
              (window as any).turnstile.remove();
            }
          } catch {}
        }

        // Find and click callback if configured
        const callbackAttr = document.querySelector('.cf-turnstile')?.getAttribute('data-callback');
        if (callbackAttr && (window as any)[callbackAttr]) {
          try {
            (window as any)[callbackAttr](token);
          } catch {}
        }
      }, solution.token);

      // Wait for challenge to process
      await page.waitForTimeout(2000);

      // Verify token was accepted
      const tokenVerified = await page.evaluate(() => {
        const input = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement;
        return input && input.value && input.value.length > 0;
      });

      if (!tokenVerified) {
        console.error('Turnstile token injection failed');
        return false;
      }

      // Try to navigate (Turnstile often auto-submits)
      await page.waitForNavigation({
        timeout: 30000,
        waitUntil: 'domcontentloaded'
      }).catch(() => {});

      // Verify Turnstile is gone
      const stillBlocked = await page.$('.cf-turnstile');
      const challengeGone = !stillBlocked;

      if (challengeGone) {
        console.log('✅ Turnstile bypass successful');
      } else {
        console.warn('⚠️ Turnstile element still present after bypass');
      }

      return challengeGone;

    } catch (error) {
      console.error('Error bypassing Turnstile challenge:', error);
      return false;
    }
  }

  /**
   * Solves CAPTCHA using 2Captcha API
   */
  private async solveCaptchaWith2Captcha(
    siteKey: string,
    pageUrl: string,
    apiKey: string
  ): Promise<string | null> {
    try {
      // Create task
      const createResponse = await fetch('http://2captcha.com/in.php', {
        method: 'POST',
        body: new URLSearchParams({
          key: apiKey,
          method: 'userrecaptcha',
          googlekey: siteKey,
          pageurl: pageUrl,
          json: '1'
        })
      });

      const createData = await createResponse.json();
      if (createData.status !== 1) {
        return null;
      }

      const taskId = createData.request;

      // Poll for solution
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const resultResponse = await fetch(
          `http://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`
        );
        const resultData = await resultResponse.json();

        if (resultData.status === 1) {
          return resultData.request;
        }

        if (resultData.request === 'CAPCHA_NOT_READY') {
          continue;
        }

        return null;
      }

      return null;
    } catch (error) {
      console.error('Error solving CAPTCHA with 2Captcha:', error);
      return null;
    }
  }

  /**
   * Solves Turnstile using CapSolver API
   */
  private async solveTurnstileWithCapSolver(
    siteKey: string,
    pageUrl: string,
    apiKey: string
  ): Promise<string | null> {
    try {
      // Create task
      const createResponse = await fetch('https://api.capsolver.com/createTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientKey: apiKey,
          task: {
            type: 'TurnstileTaskProxyLess',
            websiteURL: pageUrl,
            websiteKey: siteKey
          }
        })
      });

      const createData = await createResponse.json();
      if (createData.errorId !== 0) {
        return null;
      }

      const taskId = createData.taskId;

      // Poll for solution
      for (let i = 0; i < 60; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const resultResponse = await fetch('https://api.capsolver.com/getTaskResult', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientKey: apiKey,
            taskId: taskId
          })
        });

        const resultData = await resultResponse.json();

        if (resultData.status === 'ready') {
          return resultData.solution.token;
        }

        if (resultData.status === 'processing') {
          continue;
        }

        return null;
      }

      return null;
    } catch (error) {
      console.error('Error solving Turnstile with CapSolver:', error);
      return null;
    }
  }

  /**
   * Main bypass method - handles all challenge types (enhanced with faster detection)
   */
  async bypass(page: Page, options: {
    captchaApiKey?: string;
    capsolverApiKey?: string;
    anticaptchaApiKey?: string;
    deathbycaptchaApiKey?: string;
  } = {}): Promise<boolean> {
    // Fast detection (checks URL and title first)
    const challenge = await this.detectCloudflare(page);

    if (!challenge.detected) {
      return true; // No Cloudflare protection
    }

    // Configure providers if API keys provided in options
    if (options.captchaApiKey) {
      this.captchaManager.configureProvider('2captcha', {
        apiKey: options.captchaApiKey,
        enabled: true,
      });
    }
    if (options.capsolverApiKey) {
      this.captchaManager.configureProvider('capsolver', {
        apiKey: options.capsolverApiKey,
        enabled: true,
      });
    }
    if (options.anticaptchaApiKey) {
      this.captchaManager.configureProvider('anticaptcha', {
        apiKey: options.anticaptchaApiKey,
        enabled: true,
      });
    }
    if (options.deathbycaptchaApiKey) {
      this.captchaManager.configureProvider('deathbycaptcha', {
        apiKey: options.deathbycaptchaApiKey,
        enabled: true,
      });
    }

    switch (challenge.type) {
      case 'javascript':
        return await this.bypassJavaScriptChallenge(page);
      
      case 'captcha':
        return await this.bypassCaptchaChallenge(page, options.captchaApiKey);
      
      case 'turnstile':
        return await this.bypassTurnstileChallenge(page, options.capsolverApiKey);
      
      default:
        // Try JavaScript challenge bypass as fallback
        return await this.bypassJavaScriptChallenge(page);
    }
  }
}

