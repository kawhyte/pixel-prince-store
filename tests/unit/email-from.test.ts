import { describe, it, expect } from 'vitest'
import { normalizeFrom } from '@/lib/email'

const EXPECTED = 'The Pixel Prince <hello@thepixelprince.com>'

describe('normalizeFrom', () => {
  it('strips the quotes a .env value carries', () => {
    // dotenv strips these locally, a hosting dashboard stores them literally, and Resend refuses
    // a from address with quotes in it. That difference sent zero emails from production while
    // every local send worked.
    expect(normalizeFrom('"The Pixel Prince <hello@thepixelprince.com>"')).toBe(EXPECTED)
    expect(normalizeFrom("'The Pixel Prince <hello@thepixelprince.com>'")).toBe(EXPECTED)
  })

  it('leaves a clean value alone', () => {
    expect(normalizeFrom(EXPECTED)).toBe(EXPECTED)
  })

  it('trims surrounding whitespace and newlines', () => {
    expect(normalizeFrom(` ${EXPECTED}\n`)).toBe(EXPECTED)
    expect(normalizeFrom(`"${EXPECTED}" `)).toBe(EXPECTED)
  })

  it('falls back when unset or empty', () => {
    expect(normalizeFrom(undefined)).toBe(EXPECTED)
    expect(normalizeFrom('')).toBe(EXPECTED)
    expect(normalizeFrom('""')).toBe(EXPECTED)
  })

  it('does not strip a quote that is only on one end', () => {
    expect(normalizeFrom('"The Pixel Prince')).toBe('"The Pixel Prince')
  })
})
