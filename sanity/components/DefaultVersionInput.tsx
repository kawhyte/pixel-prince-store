'use client';

import React, { useCallback, useMemo } from 'react';
import { Select, Stack, Text } from '@sanity/ui';
import { set, unset, useFormValue, type StringInputProps } from 'sanity';

interface OfferLike {
  version?: string;
}

/** Distinct version names on an artwork's offers, in the order the offers are listed. */
export function versionsFromOffers(offers: OfferLike[] | undefined): string[] {
  const out: string[] = [];
  for (const offer of offers ?? []) {
    const version = offer?.version?.trim();
    if (version && !out.includes(version)) out.push(version);
  }
  return out;
}

/**
 * Which version the shop page opens on, chosen from the versions this artwork actually sells
 * rather than typed. The list is read live from the offers above, so it cannot drift and a
 * typo is not possible. Empty means the first version in the offers list wins.
 */
export function DefaultVersionInput(props: StringInputProps) {
  const { value, onChange, elementProps } = props;
  const offers = useFormValue(['offers']) as OfferLike[] | undefined;

  const versions = useMemo(() => versionsFromOffers(offers), [offers]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const next = event.currentTarget.value;
      onChange(next ? set(next) : unset());
    },
    [onChange]
  );

  if (versions.length === 0) {
    return (
      <Text size={1} muted>
        This print comes one way, so there is no version to choose. Add a second version in Fourthwall and re-run the
        import to see options here.
      </Text>
    );
  }

  const stale = value && !versions.includes(value);

  return (
    <Stack space={3}>
      <Select {...elementProps} value={value ?? ''} onChange={handleChange}>
        <option value="">First in the offers list ({versions[0]})</option>
        {versions.map((version) => (
          <option key={version} value={version}>
            {version}
          </option>
        ))}
        {stale && <option value={value}>{value} (no longer on sale)</option>}
      </Select>
      {stale && (
        <Text size={1} style={{ color: 'var(--card-badge-caution-fg-color)' }}>
          {value} is not on sale any more, so the page opens on {versions[0]}. Pick one from the list.
        </Text>
      )}
    </Stack>
  );
}
