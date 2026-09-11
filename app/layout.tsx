import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ConditionalNavigation from "@/components/common/Navigation/ConditionalNavigation";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        {/* Cloudinary Upload Widget - Required for High-Res Asset Manager */}
        <script
          src="https://upload-widget.cloudinary.com/global/all.js"
          type="text/javascript"
          async
        />
      </head>
      <body className="antialiased">
        <CartProvider>
          <ConditionalNavigation />
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
