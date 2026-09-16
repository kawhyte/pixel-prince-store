import seoConfig from "@/config/seo.json";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ConditionalNavigation from "@/components/common/Navigation/ConditionalNavigation";
import { getShopSetCount } from "@/sanity/lib/client";
import { primaryNav } from "@/config/nav";
import ConditionalFooter from "@/components/common/Footer/ConditionalFooter";
import { CartProvider } from "@/components/common/Cart/CartProvider";
import CartDrawer from "@/components/common/Cart/CartDrawer";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Set here so every page inherits it, including the handful that declare no metadata of their
  // own. Without it Next resolves a relative og:image against http://localhost:3000, which is both
  // the build warning and a preview image no crawler outside this laptop can fetch.
  metadataBase: new URL(seoConfig.metadataBase),
  title: "The Pixel Prince | Retro gaming and map art prints",
  description: "Retro gaming and map art prints, designed by humans, printed to order and shipped free in the US. Plus a free printable every month.",
 icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/android-chrome-512x512.png',
      },
    ],
  },

};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // One count for the whole site: the Sets link is drawn only when a set exists to sell.
  const setCount = await getShopSetCount();
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();

  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Preconnect to Sanity CDN for faster image loading */}
        <link rel="preconnect" href="https://cdn.sanity.io" />
        <link rel="dns-prefetch" href="https://cdn.sanity.io" />

        {process.env.NEXT_PUBLIC_PINTEREST_DOMAIN_VERIFY && (
          <meta name="p:domain_verify" content={process.env.NEXT_PUBLIC_PINTEREST_DOMAIN_VERIFY} />
        )}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
        {/* The Cloudinary upload widget is NOT loaded here. It is only usable inside Studio's
            asset manager, and in the root layout every visitor to every page paid for the
            request. components/admin/HighResManager.tsx fetches it on the click that needs it
            (lib/cloudinary-widget.ts). */}
      </head>
      <body className="antialiased">
        <CartProvider>
          <ConditionalNavigation primary={primaryNav(setCount)} />
          {children}
          <ConditionalFooter />
          <CartDrawer />
        </CartProvider>
        <Toaster />
        {process.env.NODE_ENV === "production" &&
          process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
            <Script
              src="https://cloud.umami.is/script.js"
              data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
              strategy="afterInteractive"
            />
          )}
      </body>
    </html>
  );
}
