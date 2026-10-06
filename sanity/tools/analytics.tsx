'use client'

import {Box, Button, Card, Container, Heading, Stack, Text} from '@sanity/ui'
import {BarChart3, ExternalLink} from 'lucide-react'
import type {Tool} from 'sanity'

const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

/**
 * The site's Umami dashboard. NEXT_PUBLIC_UMAMI_DASHBOARD_URL wins (paste the address bar from
 * the dashboard); otherwise it is built from the website id, else the Umami home page.
 */
export const UMAMI_DASHBOARD_URL =
  process.env.NEXT_PUBLIC_UMAMI_DASHBOARD_URL ||
  (WEBSITE_ID ? `https://cloud.umami.is/websites/${WEBSITE_ID}` : 'https://cloud.umami.is')

// What each event means, so the dashboard reads without remembering the code.
const EVENTS: [string, string][] = [
  ['purchase', 'An order was placed. Carries revenue, so the Revenue report adds these up.'],
  ['print_sold', 'One per print in an order: which prints actually sell.'],
  ['add_to_cart', 'A print went in the bag, with the finish, version and size chosen.'],
  ['option_picked', 'A finish, version or size was clicked on a print page.'],
  ['checkout_opened', 'Someone went to checkout.'],
  ['email_signup', 'A new subscriber, with the page they signed up on.'],
]

function AnalyticsTool() {
  return (
    <Container width={1} padding={4}>
      <Stack space={5} paddingY={4}>
        <Stack space={3}>
          <Heading size={3}>Analytics</Heading>
          <Text muted size={2}>
            Visits, sales and what buyers click live in Umami. A quick look once a week shows which prints to
            promote and which to retire.
          </Text>
        </Stack>
        <Box>
          <Button
            as="a"
            href={UMAMI_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            tone="primary"
            fontSize={2}
            padding={4}
            icon={BarChart3}
            iconRight={ExternalLink}
            text="Open Umami dashboard"
          />
        </Box>
        <Card padding={4} radius={2} border>
          <Stack space={4}>
            <Text weight="semibold" size={2}>
              Under Events, look for
            </Text>
            {EVENTS.map(([name, meaning]) => (
              <Stack key={name} space={2}>
                <Text size={1} weight="semibold">
                  <code>{name}</code>
                </Text>
                <Text size={1} muted>
                  {meaning}
                </Text>
              </Stack>
            ))}
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}

/** Top-bar Studio tool: one click from editing a print to seeing how it sells. */
export const analyticsTool: Tool = {
  name: 'analytics',
  title: 'Analytics',
  icon: BarChart3,
  component: AnalyticsTool,
}
