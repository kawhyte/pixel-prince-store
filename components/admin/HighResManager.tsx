'use client';

import React, { useState } from 'react';
import { UploadCloud, AlertCircle, Loader2, Download } from 'lucide-react';
import type {
  AdminHighResUploadProps,
  CustomerDownloadButtonProps,
  HighResAsset,
  CloudinaryUploadResult
} from '@/lib/types/high-res-asset';
import { extractCloudinaryPublicId } from '@/lib/cloudinary-utils';
import { adminFetch } from '@/lib/admin-secret-client';
import { AssetPreviewCard } from '@/sanity/components/AssetPreviewCard';

interface CloudinaryWidgetError {
  message?: string;
}

/**
 * AdminHighResUpload Component
 *
 * Cloudinary-only upload for the artwork's single print file. Files over
 * the 10MB free-plan cap are rejected with a clear re-export instruction.
 * There is no external-link fallback for new uploads.
 */
export function AdminHighResUpload({
  onAssetChange,
  initialAsset
}: AdminHighResUploadProps) {
  // `initialAsset` reflects the persisted Sanity value; `optimisticAsset` covers
  // the gap between a successful upload and that value round-tripping back down.
  const [optimisticAsset, setOptimisticAsset] = useState<HighResAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asset = initialAsset ?? optimisticAsset;

  const deleteFromCloudinary = async (publicId: string) => {
    try {
      const response = await adminFetch('/api/cloudinary/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[HighResManager] Failed to delete from Cloudinary:', result);
        alert(`Failed to delete from Cloudinary: ${result.error || 'Unknown error'}\nCheck console for details.`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[HighResManager] Error deleting from Cloudinary:', error);
      alert(`Error deleting from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  const openCloudinaryWidget = async () => {
    // Replacing an existing asset deletes the old one first
    if (asset?.cloudinaryUrl) {
      const publicId = asset.cloudinaryPublicId || extractCloudinaryPublicId(asset.cloudinaryUrl) || undefined;
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setError('Cloudinary is not configured. Please check environment variables.');
      return;
    }

    if (!window.cloudinary) {
      setError('Cloudinary widget is not loaded. Please refresh the page.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName,
        uploadPreset,
        sources: ['local', 'url'],
        multiple: false,
        maxFileSize: 10485760, // 10MB
        clientAllowedFormats: ['png', 'jpg', 'jpeg', 'tiff', 'psd', 'pdf'],
        folder: 'high-res-assets',
      },
      (error: CloudinaryWidgetError | null, result: CloudinaryUploadResult) => {
        if (error) {
          setIsUploading(false);

          if (error.message && (
            error.message.includes('File size') ||
            error.message.includes('too large') ||
            error.message.includes('exceeds')
          )) {
            setError('Over the 10MB limit. Re-export at 3600×4500 px and try again.');
          } else {
            setError(error.message || 'Upload failed. Please try again.');
          }
          return;
        }

        if (result && result.event === 'success' && result.info) {
          const newAsset: HighResAsset = {
            cloudinaryUrl: result.info.secure_url,
            cloudinaryPublicId: result.info.public_id,
            filename: result.info.original_filename || 'download',
            width: result.info.width,
            height: result.info.height,
            bytes: result.info.bytes,
            uploadedAt: new Date().toISOString(),
          };

          setOptimisticAsset(newAsset);
          setIsUploading(false);
          onAssetChange(newAsset);

          widget.close();
        }
      }
    );

    widget.open();
  };

  if (asset) {
    return (
      <div>
        <AssetPreviewCard asset={asset} onReplace={openCloudinaryWidget} />
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-sage-300 bg-cream p-6">
      <p className="mb-4 text-sm text-soft-charcoal">
        No print file yet. Upload one high-res PNG cropped to 4:5 (under 10MB).
      </p>
      <button
        onClick={openCloudinaryWidget}
        disabled={isUploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sage-500 px-6 py-4 font-semibold text-white transition-all hover:bg-sage-400 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <UploadCloud className="h-5 w-5" />
            Upload print file
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

/**
 * CustomerDownloadButton Component
 *
 * Renders a download button for customers to download high-res files.
 * Works with both Cloudinary URLs and external links.
 */
export function CustomerDownloadButton({
  url,
  filename,
  size = 'md',
  variant = 'primary',
  className = '',
}: CustomerDownloadButtonProps) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-sage-500 text-white hover:bg-sage-400',
    secondary: 'bg-white text-charcoal border-2 border-charcoal hover:bg-charcoal hover:text-white',
  };

  return (
    <a
      href={url}
      download={filename}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all hover:shadow-lg ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      <Download className="h-5 w-5" />
      Download
    </a>
  );
}
