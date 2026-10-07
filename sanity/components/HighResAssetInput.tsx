'use client';

import React, { useCallback } from 'react';
import { set, unset } from 'sanity';
import { ObjectInputProps } from 'sanity';
import { AdminHighResUpload } from '@/components/admin/HighResManager';
import type { HighResAsset } from '@/lib/types/high-res-asset';

/**
 * Sanity Studio Custom Input Component for High-Resolution Asset
 *
 * This component wraps the AdminHighResUpload component and integrates it
 * with Sanity's form system, handling value updates and persistence.
 */
export function HighResAssetInput(props: ObjectInputProps) {
  const { value, onChange } = props;

  // Convert Sanity value to our HighResAsset type
  const currentAsset: HighResAsset | null = value
    ? {
        cloudinaryUrl: value.cloudinaryUrl,
        cloudinaryPublicId: value.cloudinaryPublicId,
        externalUrl: value.externalUrl,
        filename: value.filename,
        width: value.width,
        height: value.height,
        bytes: value.bytes,
        uploadedAt: value.uploadedAt,
      }
    : null;

  /**
   * Handle asset changes from the AdminHighResUpload component
   */
  const handleAssetChange = useCallback(
    (newAsset: HighResAsset | null) => {
      if (newAsset) {
        const patches: Array<ReturnType<typeof set> | ReturnType<typeof unset>> = [
          set(newAsset.filename, ['filename']),
          set(newAsset.uploadedAt || new Date().toISOString(), ['uploadedAt']),
          set(newAsset.cloudinaryUrl, ['cloudinaryUrl']),
          unset(['externalUrl']),
        ];

        if (newAsset.cloudinaryPublicId) {
          patches.push(set(newAsset.cloudinaryPublicId, ['cloudinaryPublicId']));
        }
        if (typeof newAsset.width === 'number') {
          patches.push(set(newAsset.width, ['width']));
        }
        if (typeof newAsset.height === 'number') {
          patches.push(set(newAsset.height, ['height']));
        }
        if (typeof newAsset.bytes === 'number') {
          patches.push(set(newAsset.bytes, ['bytes']));
        }

        onChange(patches);
      } else {
        onChange([
          unset(['cloudinaryUrl']),
          unset(['cloudinaryPublicId']),
          unset(['externalUrl']),
          unset(['filename']),
          unset(['width']),
          unset(['height']),
          unset(['bytes']),
          unset(['uploadedAt']),
        ]);
      }
    },
    [onChange]
  );

  return (
    <div className="pt-4">
      <AdminHighResUpload
        initialAsset={currentAsset}
        onAssetChange={handleAssetChange}
      />
    </div>
  );
}
