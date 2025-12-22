/**
 * Form Handler
 * Detects forms and simulates form submissions for offline functionality
 */

import type { Page } from 'puppeteer';

export interface FormField {
  name: string;
  type: string;
  value: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select/radio/checkbox
}

export interface Form {
  id?: string;
  action: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  fields: FormField[];
  submitButton?: string; // Selector for submit button
}

export interface FormSubmissionResult {
  success: boolean;
  response?: any;
  error?: string;
}

/**
 * Form Handler
 * Handles form detection and submission simulation
 */
export class FormHandler {
  /**
   * Detects all forms on the page
   */
  async detectForms(page: Page): Promise<Form[]> {
    const forms = await page.evaluate(() => {
      const formElements = Array.from(document.querySelectorAll('form'));
      const detectedForms: Form[] = [];

      formElements.forEach((formElement) => {
        const form: Form = {
          action: formElement.action || '',
          method: (formElement.method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE') || 'POST',
          fields: [],
        };

        if (formElement.id) {
          form.id = formElement.id;
        }

        // Detect submit button
        const submitButton = formElement.querySelector('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          form.submitButton = submitButton.id || submitButton.className || '';
        }

        // Detect form fields
        const inputs = Array.from(formElement.querySelectorAll('input, textarea, select'));
        inputs.forEach((input: any) => {
          const field: FormField = {
            name: input.name || '',
            type: input.type || input.tagName.toLowerCase(),
            value: input.value || '',
            required: input.required || false,
          };

          if (input.placeholder) {
            field.placeholder = input.placeholder;
          }

          // Handle select options
          if (input.tagName === 'SELECT') {
            const options = Array.from(input.options).map((opt: any) => opt.value);
            field.options = options;
          }

          // Handle radio/checkbox options
          if (input.type === 'radio' || input.type === 'checkbox') {
            const name = input.name;
            const radios = Array.from(document.querySelectorAll(`input[name="${name}"]`));
            field.options = radios.map((r: any) => r.value);
          }

          if (field.name) {
            form.fields.push(field);
          }
        });

        detectedForms.push(form);
      });

      return detectedForms;
    });

    return forms;
  }

  /**
   * Fills a form with data
   */
  async fillForm(page: Page, formSelector: string, data: Record<string, any>): Promise<void> {
    await page.evaluate(
      (selector, formData) => {
        const form = document.querySelector(selector) as HTMLFormElement;
        if (!form) return;

        for (const [name, value] of Object.entries(formData)) {
          const field = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (field) {
            if (field.tagName === 'SELECT') {
              (field as HTMLSelectElement).value = String(value);
            } else if ((field as HTMLInputElement).type === 'checkbox' || (field as HTMLInputElement).type === 'radio') {
              (field as HTMLInputElement).checked = Boolean(value);
            } else {
              field.value = String(value);
            }

            // Trigger change event
            const event = new Event('change', { bubbles: true });
            field.dispatchEvent(event);
          }
        }
      },
      formSelector,
      data
    );
  }

  /**
   * Simulates form submission
   */
  async simulateSubmission(
    page: Page,
    form: Form,
    data?: Record<string, any>
  ): Promise<FormSubmissionResult> {
    try {
      // Fill form if data provided
      if (data && form.id) {
        await this.fillForm(page, `#${form.id}`, data);
      } else if (data) {
        // Find form by action
        await this.fillForm(page, `form[action="${form.action}"]`, data);
      }

      // Submit form
      if (form.submitButton) {
        await page.click(form.submitButton);
      } else {
        // Find and click submit button
        const submitButton = await page.$('form button[type="submit"], form input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
        } else {
          // Submit via form.submit()
          await page.evaluate((formId) => {
            const form = document.querySelector(formId ? `#${formId}` : 'form') as HTMLFormElement;
            if (form) {
              form.submit();
            }
          }, form.id);
        }
      }

      // Wait for response
      await page.waitForNavigation({ timeout: 10000 }).catch(() => {});

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Captures form data for offline use
   */
  async captureFormData(page: Page): Promise<Record<string, Form>> {
    const forms = await this.detectForms(page);
    const formData: Record<string, Form> = {};

    for (const form of forms) {
      const key = form.id || form.action || `form-${Date.now()}`;
      formData[key] = form;
    }

    return formData;
  }

  /**
   * Generates mock form handler for offline use
   */
  async generateOfflineFormHandler(
    forms: Record<string, Form>,
    outputPath: string
  ): Promise<string> {
    const handlerCode = `
// Offline Form Handler
// Provides form submission simulation for cloned website

const FORM_DATA = ${JSON.stringify(forms, null, 2)};

// Override form submission
document.addEventListener('submit', (event) => {
  event.preventDefault();
  
  const form = event.target;
  if (!form || form.tagName !== 'FORM') return;

  const formId = form.id || form.action;
  const formConfig = FORM_DATA[formId];

  if (formConfig) {
    // Simulate form submission
    console.log('Form submitted:', formConfig);
    
    // Show success message
    alert('Form submitted (offline mode)');
    
    // Optionally redirect
    if (formConfig.action) {
      // Would navigate to action URL in offline mode
    }
  }
}, true);

// Pre-fill forms with default values
document.addEventListener('DOMContentLoaded', () => {
  for (const [formId, formConfig] of Object.entries(FORM_DATA)) {
    const form = document.querySelector(\`#\${formId}\`) || document.querySelector(\`form[action="\${formConfig.action}"]\`);
    if (form) {
      for (const field of formConfig.fields) {
        const input = form.querySelector(\`[name="\${field.name}"]\`);
        if (input && field.value) {
          input.value = field.value;
        }
      }
    }
  }
});
`;

    await require('fs/promises').writeFile(outputPath, handlerCode, 'utf-8');
    return outputPath;
  }
}

