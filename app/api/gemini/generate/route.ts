import { GoogleGenerativeAI } from '@google/generative-ai'
import { GEMINI_DESCRIPTION_MODEL } from '@/config/gemini'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSecret } from '@/lib/admin-auth'
import { buildDescriptionPrompt } from '@/lib/gemini-prompt'

interface GenerateRequest {
  title: string
  imageUrl: string
  category?: string
  tags?: string[]
  keywords?: string[]
}

interface GenerateResponse {
  short: string
  long: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authError = requireAdminSecret(request)
    if (authError) return authError

    const body: GenerateRequest = await request.json()
    const { title, imageUrl } = body

    console.log('Received request:', { title, imageUrl })

    // Validate inputs
    if (!title || !imageUrl) {
      return NextResponse.json(
        { error: 'Title and image URL are required' },
        { status: 400 }
      )
    }

    // Optional SEO context: sanitized, all backward-compatible
    const category =
      typeof body.category === 'string' ? body.category : undefined
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t): t is string => typeof t === 'string').slice(0, 15)
      : undefined
    const keywords = Array.isArray(body.keywords)
      ? body.keywords
          .filter((k): k is string => typeof k === 'string' && k.length <= 60)
          .slice(0, 10)
      : undefined

    let imageHost: string
    try {
      imageHost = new URL(imageUrl).hostname
    } catch {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
    }
    const allowedHosts = ['cdn.sanity.io', 'res.cloudinary.com']
    if (!allowedHosts.includes(imageHost)) {
      return NextResponse.json(
        { error: 'Image URL host not allowed' },
        { status: 400 }
      )
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      )
    }

    // Fetch the image from the URL
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${imageResponse.statusText}` },
        { status: 400 }
      )
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    
    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // *** FIX: Use the specific pinned version ***
    const model = genAI.getGenerativeModel({ model: GEMINI_DESCRIPTION_MODEL })

    const prompt = buildDescriptionPrompt({ title, category, tags, keywords })

    console.log('Calling Gemini API...')

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: imageResponse.headers.get('content-type') || 'image/jpeg',
        },
      },
    ])

    const response = await result.response
    const text = response.text()
    console.log('Gemini response:', text)

    // Parse the JSON response
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
    const generatedContent: GenerateResponse = JSON.parse(cleanedText)

    return NextResponse.json(generatedContent)

  } catch (error) {
    console.error('Error generating descriptions:', error)
    // Return the REAL error message so we can debug
    return NextResponse.json(
      {
        error: 'Failed to generate descriptions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}