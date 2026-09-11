'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Flex, Stack, Text } from '@sanity/ui';
import { set, useClient, useFormValue, type ImageValue, type ObjectInputProps } from 'sanity';
import { MIN_SHOP_IMAGE_WIDTH } from '../lib/image-rules';
import { adminFetch } from '@/lib/admin-secret-client';

interface AssetFacts {
  width?: number
  height?: number
  size?: number
  originalFilename?: string
  usedIn?: number
}

/** 1536 -> "1.5 MB". Sanity reports bytes. */
function readableSize(bytes: number | undefined): string | null {
  if (typeof bytes !== 'number' || bytes <= 0) return null
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * The normal image field, plus the facts you would otherwise open the media browser to find:
 * how big the file is, and how many documents use it. Sanity keeps both on the asset rather
 * than on the field, so they have to be looked up.
 */
export function ImageWithDetails(props: ObjectInputProps) {
  const assetId = (props.value as ImageValue | undefined)?.asset?._ref
  const client = useClient({ apiVersion: '2025-11-27' })
  // Keyed by asset id rather than cleared on change, so nothing is set synchronously in the
  // effect and a stale answer for a previous image can never be shown.
  const [loaded, setLoaded] = useState<{ id: string; facts: AssetFacts } | null>(null)
  const facts = loaded && loaded.id === assetId ? loaded.facts : null

  useEffect(() => {
    if (!assetId) return
    let live = true
    client
      .fetch<AssetFacts>(
        `{
          "width": *[_id == $id][0].metadata.dimensions.width,
          "height": *[_id == $id][0].metadata.dimensions.height,
          "size": *[_id == $id][0].size,
          "originalFilename": *[_id == $id][0].originalFilename,
          "usedIn": count(*[references($id)])
        }`,
        { id: assetId }
      )
      .then((result) => {
        if (live) setLoaded({ id: assetId, facts: result })
      })
      .catch(() => {
        // the field still works without the extra line
      })
    return () => {
      live = false
    }
  }, [assetId, client])

  const parts: string[] = []
  if (facts?.width && facts?.height) parts.push(`${facts.width} × ${facts.height} px`)
  const size = readableSize(facts?.size)
  if (size) parts.push(size)
  if (typeof facts?.usedIn === 'number') {
    parts.push(facts.usedIn === 1 ? 'used here only' : `used in ${facts.usedIn} places`)
  }
  const tooSmall = typeof facts?.width === 'number' && facts.width < MIN_SHOP_IMAGE_WIDTH

  // The button only appears where there is an alt field to write into.
  const hasAltField = props.schemaType.fields.some((field) => field.name === 'alt')
  const title = (useFormValue(['title']) as string | undefined) ?? ''
  const category = useFormValue(['category']) as string | undefined
  const [writing, setWriting] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const writeAlt = useCallback(async () => {
    if (!assetId || !title) return
    setWriting(true)
    setProblem(null)
    try {
      const url = await client.fetch<string | null>(`*[_id == $id][0].url`, { id: assetId })
      if (!url) throw new Error('That image has no URL yet. Save and try again.')
      const response = await adminFetch('/api/gemini/alt-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: `${url}?w=1024`, title, category }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`)
      props.onChange(set(data.alt, ['alt']))
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setWriting(false)
    }
  }, [assetId, title, category, client, props])

  return (
    <Stack space={3}>
      {props.renderDefault(props)}
      {(parts.length > 0 || (hasAltField && assetId)) && (
        <Flex align="center" gap={3} wrap="wrap">
          {parts.length > 0 && (
            <Text size={1} muted={!tooSmall} style={tooSmall ? { color: 'var(--card-badge-caution-fg-color)' } : undefined}>
              {parts.join(' · ')}
              {tooSmall ? ' · too small for the shop page' : ''}
            </Text>
          )}
          {hasAltField && assetId && (
            <Button
              mode="ghost"
              tone="primary"
              fontSize={1}
              padding={2}
              text={writing ? 'Looking at the image...' : 'Write alt text with AI'}
              disabled={writing || !title}
              onClick={writeAlt}
            />
          )}
        </Flex>
      )}
      {problem && (
        <Text size={1} style={{ color: 'var(--card-badge-critical-fg-color)' }}>
          {problem}
        </Text>
      )}
    </Stack>
  )
}
