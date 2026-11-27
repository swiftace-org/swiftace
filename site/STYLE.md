# Writing Style Guide

This document captures the writing style and patterns observed across the SwiftAce blog posts, to help maintain consistency when generating new content.

## Voice and Tone

### First-Person Perspective

- Write from a personal, first-person perspective ("I", "we", "my")
- Share genuine experiences, decisions, and thought processes
- Be candid about uncertainties, trade-offs, and potential downsides
- Example: "I've decided to ditch Cloudflare in favor of deploying to simple Linux-based cloud virtual machines"

### Direct and Confident

- State opinions directly without excessive hedging
- Use declarative sentences and make clear assertions
- Example: "The fundamentals of business are simple: you make something people want and convince them to pay more than what it costs you to make and sell it."

### Practical Pragmatism

- Focus on real-world applications and concrete examples
- Share specific numbers, metrics, and results (e.g., "~200x reduction", "$5/month", "50,000 lines")
- Acknowledge trade-offs honestly rather than presenting one-sided arguments

## Structure and Organization

### Opening Style

- Start with context or a clear problem statement
- Often begin with a brief introduction to the topic's relevance
- No fluff or lengthy preambles - get to the point quickly
- Example openings:
  - "Forms are an essential component of any web application."
  - "Over the past year, I've been working on reducing the monthly cloud bill for Jovian."

### Section Headers

- Use clear, descriptive H2 and H3 headers
- Headers often follow a numbered list format for tutorials
- Keep headers concise and action-oriented

### Lists and Bullet Points

- Use numbered lists for sequential steps or ranked items
- Use bullet points for non-sequential collections
- Each point should be substantive, not just a phrase

### Closing Style

- End with a brief conclusion or forward-looking statement
- Often include "I hope you found this helpful" or similar
- Sometimes end with a quote or philosophical reflection
- May include footnotes for technical details

## Technical Writing Patterns

### Code Examples

- Include well-formatted code blocks with syntax highlighting
- Provide context before showing code
- Follow code with "Here are some notes about the above code:" explanations if needed
- Use bullet points to explain specific aspects of the code if needed

### Explanatory Notes

- Use nested bullet points for detailed explanations
- Link technical terms to external resources (MDN, ChatGPT explanations, official docs)
- Explain the "why" behind decisions, not just the "what"

### Footnotes

- Use footnotes for supplementary information that would interrupt flow
- Format as numbered superscripts: `<sup>[[1]](#note-1)</sup>`
- Place footnote content at the end under "### Footnotes"

## Formatting Conventions

### Links and References

- Link liberally to external resources for deeper context
- Reference own previous posts when relevant
- Use descriptive link text, not "click here"
- Example: "I've [decided to ditch serverless](/posts/ditching-serverless) for plain old cloud VMs"

### Emphasis

- Use **bold** for key terms or important concepts
- Use _italics_ for introducing new terminology or emphasis
- Use backticks for `code`, `commands`, and `file names`

### Images

- Include screenshots and diagrams to illustrate concepts
- Use Imgur for hosting images
- Add descriptive alt text

### Tips and Notes

- Format tips as: `_**TIP**: Your tip text here._`
- Use blockquotes for important callouts or quotes

## Content Philosophy

### Minimalism and Simplicity

- Advocate for simpler solutions over complex ones
- Question the necessity of tools, frameworks, and features
- Value deletion and removal as much as creation
- Example: "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away"

### Cost Consciousness

- Always consider and discuss costs (monetary and complexity)
- Prefer cheap, simple solutions over expensive, complex ones
- Share specific cost comparisons when relevant

### Independence and Self-Reliance

- Prefer building from scratch when reasonable
- Be skeptical of third-party dependencies and services
- Value portability and avoiding vendor lock-in

### Transparency

- Share failures and challenges, not just successes
- Acknowledge when something "might not work" or has risks
- Revisit and update positions as circumstances change

## Word Choice and Phrasing

### Preferred Phrases

- "Let's walk through..." (for tutorials)
- "Here's how it works:" (before explanations)
- "Here are some notes about..." (after code blocks)
- "I hope you found this helpful/useful"
- "That's it!" (when revealing simple solutions)

### Avoid

- Excessive superlatives or marketing language
- Vague statements without concrete examples
- Overly formal or academic tone
- Unnecessary jargon (or explain it when used)

## Post Types and Templates

### Tutorial Posts

1. Introduction with context and goals
2. Step-by-step numbered sections
3. Code examples with explanations
4. Screenshots showing results
5. Conclusion with next steps
6. Footnotes for technical details

### Opinion/Analysis Posts

1. Clear thesis statement upfront
2. Supporting arguments with evidence
3. Acknowledgment of counterarguments
4. Practical implications
5. Personal conclusion or call to action

### Update/Journey Posts

1. Context about the project
2. What changed and why
3. Specific metrics or results
4. Lessons learned
5. Future plans

## SwiftAce-Specific Context

When writing about SwiftAce or related projects:

- Reference the design principles: robust, fast, cheap, extensible
- Emphasize self-hosting and independence from cloud services
- Connect to the broader vision of democratizing online education
- Link to relevant previous posts for context
- Be honest about the work-in-progress nature of the project
