'use client'

import { Card, Button, Stack, Text } from '@sanity/ui'
import { Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useClient, useFormValue } from 'sanity'
import imageUrlBuilder from '@sanity/image-url'
import { toast } from 'sonner'
import { adminFetch } from '@/lib/admin-secret-client'
import { keywordsForCategory } from '@/config/seo-keywords'

interface ImageAsset {
  _type: 'image'
  asset: {
    _ref: string
    _type: 'reference'
  }
}

export function GeminiGenerator() {
  const client = useClient({ apiVersion: '2024-01-01' })
  const [isGenerating, setIsGenerating] = useState(false)

  // Get current form values
  const title = useFormValue(['title']) as string | undefined
  const previewImage = useFormValue(['previewImage']) as ImageAsset | undefined
  const documentId = useFormValue(['_id']) as string | undefined

  const categoryValue = useFormValue(['category'])
  const tagsValue = useFormValue(['tags'])
  const category =
    typeof categoryValue === 'string' ? categoryValue : undefined
  const tags = Array.isArray(tagsValue)
    ? tagsValue.filter((t): t is string => typeof t === 'string')
    : undefined

  // Build image URL
  const builder = imageUrlBuilder(client)
  const urlFor = (source: ImageAsset) => builder.image(source)

  const handleGenerate = useCallback(async () => {
    // Validate required fields
    if (!title) {
      toast.error('Please enter a title first')
      return
    }

    if (!previewImage?.asset?._ref) {
      toast.error('Please upload a preview image first')
      return
    }

    if (!documentId) {
      toast.error('Document ID not found')
      return
    }

    setIsGenerating(true)
    const loadingToast = toast.loading('Generating descriptions with Gemini...')

    try {
      // Resolve the image URL
      const imageUrl = urlFor(previewImage).width(800).url()
      const keywords = keywordsForCategory(category)

      // Call the Next.js API route
      const response = await adminFetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          imageUrl,
          category,
          tags,
          keywords,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error Response:', error)
        throw new Error(error.error || error.details || 'Failed to generate descriptions')
      }

      const result = await response.json()

      // Update the document with the generated descriptions
      await client
        .patch(documentId)
        .set({
          description: result.short,
          longDescription: result.long,
        })
        .commit()

      toast.dismiss(loadingToast)
      toast.success('Descriptions generated successfully!')

      // Non-blocking SEO nudge — never blocks the patch above.
      const generated = `${result.short ?? ''} ${result.long ?? ''}`.toLowerCase()
      const hasKeyword = keywords.some((k) =>
        generated.includes(k.toLowerCase())
      )
      if (!hasKeyword) {
        toast('Generated — no target keyword made it in; consider regenerating')
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to generate descriptions'
      )
      console.error('Error generating descriptions:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [title, previewImage, documentId, category, tags, client, urlFor])

  return (
    <Card padding={4} radius={2} shadow={1} tone="primary">
      <Stack space={3}>
        <Text size={2} weight="semibold">
          AI Assistant
        </Text>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !title || !previewImage}
          tone="primary"
          mode="default"
          text="Generate Descriptions with Gemini"
          icon={Sparkles}
          loading={isGenerating}
        />
        <Text size={1} muted>
          Uses AI to generate short and long descriptions based on the title and
          preview image.
        </Text>
      </Stack>
    </Card>
  )
}
