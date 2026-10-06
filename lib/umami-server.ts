/**
 * Server-side Umami events, for things that happen off the site: an order is placed on
 * Fourthwall's checkout, so the only place that knows about it is the order webhook.
 *
 * Umami's collect endpoint drops requests without a browser-like User-Agent as bots, so one is
 * sent. Events carry `revenue` + `currency`, which Umami's Revenue report reads.
 */

const UMAMI_SEND_URL = "https://cloud.umami.is/api/send";
const HOSTNAME = "www.thepixelprince.com";
const USER_AGENT = "Mozilla/5.0 (compatible; PixelPrinceServer/1.0; +https://www.thepixelprince.com)";

export interface ServerEvent {
  name: string;
  url: string;
  data?: Record<string, string | number>;
}

/** The request body Umami expects, or null when there is no website id to send to. */
export function umamiPayload(event: ServerEvent, websiteId: string | undefined) {
  if (!websiteId) return null;
  return {
    type: "event",
    payload: {
      website: websiteId,
      hostname: HOSTNAME,
      url: event.url,
      name: event.name,
      ...(event.data ? { data: event.data } : {}),
    },
  };
}

/** Best effort: logs and returns false on any failure, never throws. */
export async function sendUmamiEvent(
  event: ServerEvent,
  websiteId: string | undefined = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
): Promise<boolean> {
  const body = umamiPayload(event, websiteId);
  if (!body) return false;
  try {
    const res = await fetch(UMAMI_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`[UMAMI] ${event.name} rejected: ${res.status}`);
    return res.ok;
  } catch (error) {
    console.error(`[UMAMI] ${event.name} failed:`, error);
    return false;
  }
}

export interface SoldArtwork {
  slug: string;
}

/**
 * One `purchase` per order (revenue for the Revenue report) and one `print_sold` per artwork
 * (counts per print). Revenue is in dollars, the unit Umami's report shows.
 */
export function orderEvents(order: {
  orderId: string;
  friendlyId?: string;
  totalCents?: number;
  currency?: string;
  artworks: SoldArtwork[];
}): ServerEvent[] {
  const slugs = order.artworks.map((a) => a.slug).filter(Boolean);
  const purchase: ServerEvent = {
    name: "purchase",
    url: "/checkout/complete",
    data: {
      order: order.friendlyId ?? order.orderId,
      prints: slugs.join(",") || "unmatched",
      ...(order.totalCents !== undefined
        ? { revenue: order.totalCents / 100, currency: (order.currency ?? "USD").toUpperCase() }
        : {}),
    },
  };
  const perPrint = slugs.map<ServerEvent>((slug) => ({
    name: "print_sold",
    url: `/prints/${slug}`,
    data: { artId: slug },
  }));
  return [purchase, ...perPrint];
}
