import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/sanity/lib/client";
import { verifyDownloadToken } from "@/lib/download-token";
import { writeClient } from "@/sanity/lib/write-client";
import { buildDownloadZip } from "@/lib/build-download-zip";
import { recordLinkUse } from "@/lib/subscriber-store";

/**
 * Secure API Route for Downloading Free Digital Art
 *
 * This route:
 * 1. Verifies the signed download token (issued via /api/request-download)
 * 2. Streams a server-built ZIP (master PNG + printing guide + license)
 *
 * Query Parameters:
 * - token: signed download token (required in production)
 *
 * DEV MODE: Set DISABLE_DOWNLOAD_LIMIT=true in .env.local to bypass the token
 * requirement and use the old artId query param directly.
 */

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    // Dev bypass keeps the old query-param form working locally
    // Never honoured in production: there it would serve every master file to anyone.
    const downloadLimitDisabled =
      process.env.NODE_ENV !== "production" && process.env.DISABLE_DOWNLOAD_LIMIT === "true";

    let artId: string | null;

    if (token) {
      const claim = await verifyDownloadToken(token);
      if (!claim) {
        return NextResponse.json(
          { error: "This download link is invalid or has expired (links last 72 hours). Request the art again to get a fresh link." },
          { status: 403 }
        );
      }
      // A Sanity hiccup should not block a valid link, so a failed count lets it through.
      const linkUsable = claim.key
        ? await recordLinkUse(claim.email, claim.key).catch((e) => {
            console.error("[CLAIM-ART] link use not recorded", e);
            return true;
          })
        : true;
      if (!linkUsable) {
        return NextResponse.json(
          { error: "This download link has already been used. Request the art again to get a fresh link." },
          { status: 410 }
        );
      }
      artId = claim.artId;
    } else if (downloadLimitDisabled) {
      artId = searchParams.get("artId");
    } else {
      return NextResponse.json(
        { error: "A download token is required. Enter your email on the artwork page to receive a download link." },
        { status: 401 }
      );
    }

    if (!artId) {
      return NextResponse.json(
        { error: "Missing artId parameter" },
        { status: 400 }
      );
    }

    const artPiece = await getProductBySlug(artId);

    if (!artPiece) {
      return NextResponse.json(
        { error: "Invalid artId - art piece not found" },
        { status: 404 }
      );
    }

    // Increment download count in Sanity (fire-and-forget)
    // CRITICAL: This runs in the background and does NOT block the file download
    if (writeClient) {
      try {
        writeClient
          .patch(artPiece._id)
          .setIfMissing({ downloads: 0 }) // Initialize field if it doesn't exist
          .inc({ downloads: 1 })
          .commit()
          .catch((error) => {
            console.error('[CLAIM-ART] Failed to increment download count in Sanity:', error);
          });
      } catch (error) {
        console.error('[CLAIM-ART] Error setting up Sanity download increment:', error);
      }
    } else {
      console.warn('[CLAIM-ART] Write client not available - download count will not be incremented');
    }

    const fileUrl = artPiece.artFile?.cloudinaryUrl || artPiece.artFile?.externalUrl;
    if (!fileUrl) {
      return NextResponse.json(
        { error: "This artwork's file isn't available yet. Please contact support." },
        { status: 404 }
      );
    }

    const safeTitle = artPiece.title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");

    try {
      const zipStream = await buildDownloadZip({ fileUrl, pngName: `${safeTitle}.png` });
      return new NextResponse(zipStream, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${safeTitle}-print.zip"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch (error) {
      console.error(`[CLAIM-ART] Error building ZIP:`, error);
      return NextResponse.json(
        { error: "Unable to build the download. Please try again later or contact support." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[CLAIM-ART] Error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
