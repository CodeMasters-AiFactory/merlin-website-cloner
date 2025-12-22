/**
 * Structured Data Extractor
 * Extracts JSON-LD, Schema.org, Open Graph, and other structured data
 */

import { type Page } from 'puppeteer';
import * as cheerio from 'cheerio';

export interface StructuredData {
  jsonLd: Array<Record<string, any>>;
  schemaOrg: Array<Record<string, any>>;
  openGraph: Record<string, string>;
  twitterCard: Record<string, string>;
  metaTags: Record<string, string>;
}

export interface FormData {
  action: string;
  method: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
}

export interface APIEndpoint {
  url: string;
  method: string;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseType?: string;
}

/**
 * Structured Data Extractor
 */
export class StructuredDataExtractor {
  /**
   * Extracts all structured data from a page
   */
  async extractStructuredData(page: Page): Promise<StructuredData> {
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const result: StructuredData = {
      jsonLd: [],
      schemaOrg: [],
      openGraph: {},
      twitterCard: {},
      metaTags: {}
    };
    
    // Extract JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (content) {
          const data = JSON.parse(content);
          result.jsonLd.push(data);
        }
      } catch (error) {
        // Invalid JSON, skip
      }
    });
    
    // Extract Schema.org microdata
    $('[itemscope]').each((_, el) => {
      const item: Record<string, any> = {};
      const itemType = $(el).attr('itemtype');
      if (itemType) {
        item['@type'] = itemType;
      }
      
      $(el).find('[itemprop]').each((_, propEl) => {
        const prop = $(propEl).attr('itemprop');
        const value = $(propEl).attr('content') || $(propEl).text();
        if (prop && value) {
          item[prop] = value;
        }
      });
      
      if (Object.keys(item).length > 0) {
        result.schemaOrg.push(item);
      }
    });
    
    // Extract Open Graph tags
    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property');
      const content = $(el).attr('content');
      if (property && content) {
        result.openGraph[property] = content;
      }
    });
    
    // Extract Twitter Card tags
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name');
      const content = $(el).attr('content');
      if (name && content) {
        result.twitterCard[name] = content;
      }
    });
    
    // Extract other meta tags
    $('meta[name]').each((_, el) => {
      const name = $(el).attr('name');
      const content = $(el).attr('content');
      if (name && content) {
        result.metaTags[name] = content;
      }
    });
    
    return result;
  }
  
  /**
   * Extracts form data from a page
   */
  async extractForms(page: Page): Promise<FormData[]> {
    const html = await page.content();
    const $ = cheerio.load(html);
    const forms: FormData[] = [];
    
    $('form').each((_, formEl) => {
      const form: FormData = {
        action: $(formEl).attr('action') || '',
        method: $(formEl).attr('method') || 'GET',
        fields: []
      };
      
      $(formEl).find('input, select, textarea').each((_, fieldEl) => {
        const name = $(fieldEl).attr('name');
        const type = $(fieldEl).attr('type') || ($(fieldEl).prop('tagName') || 'input').toLowerCase();
        const required = $(fieldEl).attr('required') !== undefined;
        
        if (name) {
          const field: FormData['fields'][0] = {
            name,
            type,
            required
          };
          
          // Extract options for select/radio/checkbox
          if (type === 'select' || type === 'radio' || type === 'checkbox') {
            field.options = [];
            $(fieldEl).find('option').each((_, optEl: any) => {
              const value = $(optEl).attr('value') || $(optEl).text();
              if (value) {
                field.options!.push(value);
              }
            });
          }
          
          form.fields.push(field);
        }
      });
      
      forms.push(form);
    });
    
    return forms;
  }
  
  /**
   * Discovers API endpoints from network requests
   */
  async discoverAPIEndpoints(page: Page): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];
    
    // Monitor network requests
    page.on('request', (request) => {
      const url = request.url();
      const method = request.method();
      
      // Filter for API-like endpoints (JSON, XML, or API patterns)
      if (url.match(/\.(json|xml|api)/i) || 
          url.includes('/api/') || 
          url.includes('/rest/') ||
          url.includes('/graphql')) {
        endpoints.push({
          url,
          method,
          requestHeaders: request.headers(),
          requestBody: request.postData() ? JSON.parse(request.postData() || '{}') : undefined
        });
      }
    });
    
    // Wait a bit for requests to complete
    await page.waitForTimeout(2000);
    
    return endpoints;
  }
  
  /**
   * Extracts SPA state (React, Vue, Angular) and Redux/Vuex stores
   */
  async extractSPAState(page: Page): Promise<Record<string, any>> {
    const state: Record<string, any> = {};
    
    try {
      // Extract React state and Redux store
      const reactState = await page.evaluate(() => {
        const state: Record<string, any> = {};
        
        // Check for React
        // @ts-ignore
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          state.react = true;
          // @ts-ignore
          const reactFiber = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1);
          if (reactFiber) {
            state.reactVersion = reactFiber.version;
          }
        }
        
        // Check for Redux
        // @ts-ignore
        if (window.__REDUX_DEVTOOLS_EXTENSION__) {
          state.redux = true;
          // Try to get Redux store
          // @ts-ignore
          const reduxDevTools = window.__REDUX_DEVTOOLS_EXTENSION__;
          // @ts-ignore
          if (window.__REDUX_STORE__) {
            // @ts-ignore
            const store = window.__REDUX_STORE__;
            try {
              state.reduxState = store.getState();
            } catch (e) {
              // Store might not be accessible
            }
          }
        }
        
        // Check for React Router
        // @ts-ignore
        if (window.__REACT_ROUTER__) {
          state.reactRouter = true;
        }
        
        // Check for React Query
        // @ts-ignore
        if (window.__REACT_QUERY_DEVTOOLS__) {
          state.reactQuery = true;
        }
        
        return state;
      }).catch(() => ({}));
      
      Object.assign(state, reactState);
      
      // Extract Vue state and Vuex store
      const vueState = await page.evaluate(() => {
        const state: Record<string, any> = {};
        
        // @ts-ignore
        if (window.Vue) {
          state.vue = true;
          // @ts-ignore
          state.vueVersion = window.Vue.version;
        }
        
        // Check for Vuex
        // @ts-ignore
        if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
          state.vuex = true;
          // @ts-ignore
          const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
          // @ts-ignore
          if (hook.store) {
            try {
              // @ts-ignore
              state.vuexState = hook.store.state;
            } catch (e) {
              // Store might not be accessible
            }
          }
        }
        
        // Check for Vue Router
        // @ts-ignore
        if (window.__VUE_ROUTER__) {
          state.vueRouter = true;
        }
        
        return state;
      }).catch(() => ({}));
      
      Object.assign(state, vueState);
      
      // Extract Angular state
      const angularState = await page.evaluate(() => {
        const state: Record<string, any> = {};
        
        // @ts-ignore
        if (window.ng) {
          state.angular = true;
        }
        
        // Check for Angular version
        // @ts-ignore
        if (window.ng?.core) {
          // @ts-ignore
          state.angularVersion = window.ng.core.VERSION?.full;
        }
        
        // Check for NgRx (Angular Redux)
        // @ts-ignore
        if (window.__NGRX_STORE__) {
          state.ngrx = true;
          try {
            // @ts-ignore
            state.ngrxState = window.__NGRX_STORE__.getState();
          } catch (e) {
            // Store might not be accessible
          }
        }
        
        return state;
      }).catch(() => ({}));
      
      Object.assign(state, angularState);
      
      // Extract Next.js state
      const nextState = await page.evaluate(() => {
        const state: Record<string, any> = {};
        
        // @ts-ignore
        if (window.__NEXT_DATA__) {
          state.nextjs = true;
          // @ts-ignore
          state.nextData = window.__NEXT_DATA__;
        }
        
        return state;
      }).catch(() => ({}));
      
      Object.assign(state, nextState);
      
      // Extract Nuxt.js state
      const nuxtState = await page.evaluate(() => {
        const state: Record<string, any> = {};
        
        // @ts-ignore
        if (window.__NUXT__) {
          state.nuxtjs = true;
          // @ts-ignore
          state.nuxtData = window.__NUXT__;
        }
        
        return state;
      }).catch(() => ({}));
      
      Object.assign(state, nuxtState);
      
    } catch (error) {
      // Ignore extraction errors
    }
    
    return state;
  }
}
