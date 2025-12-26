# Generation Pipeline - How Websites Are Built

## The Pipeline

### Phase 1: Intake
User provides:
- Business name
- Industry selection (or auto-detect)
- Description
- Services (1-3)
- Contact info (optional)

### Phase 2: Industry DNA Loading
System loads from `industryDNA.ts`:
- Color scheme (primary, secondary, accent, background, text)
- Fonts (heading, body, accent)
- Design aesthetic (modern, classic, bold, etc.)
- Hero style (full-width image, gradient, video-ready)
- Image prompts tailored for Leonardo AI

### Phase 3: AI Image Generation (Leonardo AI)
Generates 4 images:
1. **Hero image** - Main banner/header
2. **Services image** - For services section
3. **About image** - For about section
4. **Team/Action image** - Supporting visual

Each prompt is industry-specific from the DNA profile.

### Phase 4: Copy Generation
Using the industry's "copy DNA":
- Tone (professional, friendly, authoritative, etc.)
- Power words specific to industry
- Words to avoid
- CTA text style
- Tagline generation

### Phase 5: HTML/CSS Generation
`htmlGenerator.ts` builds:
- Responsive HTML structure
- Industry-matched CSS styling
- Embedded images with proper contrast
- Mobile-optimized layout
- Professional typography

### Phase 6: Output
- Files saved to `public/generated/[project-slug]/`
- Index.html + assets ready to deploy
- Preview URL returned to user

---

## Example: F1 Racing Site

### Input:
- Business: "Phoenix Racing Team"
- Industry: "racing"
- Description: F1 racing team

### DNA Applied:
- Colors: Deep black (#0a0a0a), racing red (#dc2626), metallic silver
- Fonts: Bold geometric headings, clean body text
- Aesthetic: High-speed, premium, technical
- Hero: Full-width dramatic with gradient overlay

### Images Generated:
- Hero: F1 car on track, dramatic lighting
- Pit crew action shot
- Team celebration
- Technical car detail

### Result:
Stunning, professional racing website with proper contrast, readable text overlays, and industry-appropriate styling.

---

## Key Success Factors

1. **Industry DNA is everything** - Right colors/fonts/style make or break it
2. **Image prompts must be specific** - Generic prompts = generic results
3. **Text contrast is critical** - Dark overlays on images for readability
4. **Mobile-first** - Test on small screens
5. **Real content** - Avoid lorem ipsum, use industry-relevant copy

---

## Output Location

Generated websites are saved to:
```
public/generated/[project-slug]/
├── index.html
├── styles.css
└── assets/
    ├── hero.jpg
    ├── services.jpg
    ├── about.jpg
    └── team.jpg
```

Preview URL: `http://localhost:5000/generated/[project-slug]/`
