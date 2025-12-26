# Industry DNA - How to Add Industries

## Required Structure

Every industry in `industryDNA.ts` must have:

```typescript
industryId: {
  id: 'industryId',
  name: 'Industry Display Name',
  keywords: ['keyword1', 'keyword2'], // For auto-detection

  design: {
    colorScheme: 'dark' | 'light' | 'vibrant' | 'neutral',
    primaryColor: '#hexcode',      // Main brand color
    secondaryColor: '#hexcode',    // Supporting color
    accentColor: '#hexcode',       // CTAs, highlights
    backgroundColor: '#hexcode',   // Page background
    textColor: '#hexcode',         // Main text

    fonts: {
      heading: 'Font Name',        // e.g., 'Montserrat'
      body: 'Font Name',           // e.g., 'Open Sans'
      accent: 'Font Name',         // Optional special font
    },

    aesthetic: 'modern' | 'classic' | 'bold' | 'elegant' | 'minimal' | 'playful',
    heroStyle: 'full-image' | 'split' | 'gradient' | 'video-ready',
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full',
    shadows: 'none' | 'subtle' | 'medium' | 'dramatic',
  },

  images: {
    hero: 'Detailed Leonardo AI prompt for hero image',
    services: 'Prompt for services section image',
    about: 'Prompt for about section image',
    team: 'Prompt for team/action image',
    style: 'photorealistic' | 'artistic' | 'minimal' | 'dramatic',
  },

  copy: {
    tone: 'professional' | 'friendly' | 'authoritative' | 'casual' | 'luxury',
    powerWords: ['word1', 'word2', 'word3'],
    avoidWords: ['word1', 'word2'],
    ctaText: 'Main CTA button text',
    taglineStyle: 'bold' | 'subtle' | 'question' | 'statement',
  },

  sections: ['hero', 'services', 'about', 'testimonials', 'contact'],
}
```

---

## Design Guidelines by Industry Type

### Professional Services (Legal, Accounting, Consulting)
- Colors: Navy, dark grays, gold accents
- Fonts: Serif headings, clean sans-serif body
- Aesthetic: Classic, trustworthy
- Images: Office settings, handshakes, cityscapes

### Creative/Tech (Agency, Tech Startup, Photography)
- Colors: Bold primaries, high contrast
- Fonts: Modern geometric
- Aesthetic: Cutting-edge, innovative
- Images: Abstract, creative, technology

### Health/Wellness (Medical, Fitness, Spa)
- Colors: Greens, blues, calming tones
- Fonts: Clean, rounded, friendly
- Aesthetic: Clean, calming, professional
- Images: Active people, nature, wellness

### Hospitality (Restaurant, Hotel, Bar)
- Colors: Warm tones, rich colors
- Fonts: Elegant, sometimes decorative
- Aesthetic: Inviting, atmospheric
- Images: Interiors, food, experiences

### Trade/Service (Plumbing, Electrical, Construction)
- Colors: Strong blues, oranges, yellows
- Fonts: Bold, straightforward
- Aesthetic: Trustworthy, skilled
- Images: Workers, tools, finished projects

---

## Image Prompt Best Practices

### DO:
- Be specific about lighting ("golden hour", "dramatic studio lighting")
- Include environment ("modern office", "construction site")
- Specify style ("photorealistic", "editorial photography")
- Add mood ("professional", "energetic", "calming")

### DON'T:
- Use generic prompts ("business people")
- Forget to specify quality ("8K", "professional photography")
- Include text in images (AI struggles with text)
- Request trademarked items

### Example Prompts:
```
// Good:
"Professional law office interior, warm lighting, mahogany desk, leather chairs, city view through window, 8K photography, editorial style"

// Bad:
"lawyer office"
```

---

## Current Industries (10 Complete)

1. Racing
2. Law Firm
3. Restaurant
4. Fitness
5. Real Estate
6. Photography
7. Tech Startup
8. Construction
9. Medical
10. Accounting

## Pending Industries (44 Remaining)

See `feature_list.json` for full list.
