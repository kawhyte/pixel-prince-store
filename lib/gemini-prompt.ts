// Pure, dependency-free builder for the Gemini description prompt.
// No env, no network: unit-testable in isolation.

export interface DescriptionPromptOptions {
  title: string
  category?: string
  tags?: string[]
  keywords?: string[]
}

export function buildDescriptionPrompt(opts: DescriptionPromptOptions): string {
  const { title, category, tags, keywords } = opts

  const lines: string[] = [
    `You are an art curator. Write two descriptions for a digital artwork titled '${title}'.`,
  ]

  if (category) {
    const tagList = tags && tags.length > 0 ? tags.join(', ') : 'none'
    lines.push(
      `This artwork is in the '${category}' category, tagged: ${tagList}.`
    )
  }

  if (keywords && keywords.length > 0) {
    lines.push(
      `Naturally weave in one or two of these search phrases where they fit the artwork. Never force them, never list them, never repeat a phrase twice: ${keywords.join(
        ', '
      )}. Write for a person shopping for wall art, not for a search engine.`
    )
  }

  lines.push(
    `1. A 'short' catchy one-liner (max 15 words).`,
    `2. A 'long' engaging paragraph (approx 50-80 words) describing the visual style and mood.`,
    `Never use em dashes.`,
    `Return ONLY valid JSON format: { "short": "...", "long": "..." }`
  )

  return lines.join('\n')
}

export interface AltTextPromptOptions {
  /** what the product is, so the model does not have to guess the subject */
  title: string
  version?: string
  finish?: string
  category?: string
}

/**
 * Alt text is read by screen readers first and search engines second, and the two want the same
 * thing: an honest, specific sentence. Keyword stuffing is penalised by Google and useless to a
 * person, so the prompt asks for neither.
 */
export function buildAltTextPrompt(opts: AltTextPromptOptions): string {
  const facts = [
    `The product is an art print titled "${opts.title}".`,
    opts.version ? `This is the "${opts.version}" colorway.` : '',
    opts.finish && opts.finish !== 'unframed' ? `It is sold ${opts.finish}.` : '',
    opts.category ? `It belongs in the ${opts.category} category.` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return `You write alt text for an online art print shop that sells in the United States.

${facts}

Look at the image and write ONE sentence of alt text describing what is actually visible.

Rules:
- Describe only what you can see. Never invent a room, an object, a colour or a person that is not there.
- Lead with the subject, then the setting if there is one. Mention the frame or the surroundings only if they are visible.
- Include the print's title naturally, and the words "wall art print" if they fit without forcing.
- Between 60 and 125 characters. Screen readers cut off around there and so does Google.
- Do not start with "Image of", "Photo of", "A picture of" or the title alone.
- No keyword lists, no repetition, no marketing language, no full stop at the end.
- US spelling.

Return only the sentence, with no quotes and no explanation.`
}
