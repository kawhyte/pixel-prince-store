import { COLLECTIONS, matchProductsToCollection, roomLabel } from "@/config/collections";

export interface RoomTile {
  slug: string;
  label: string;
  tagline: string;
  image: string;
}

type Tileable = {
  tags?: string[];
  category?: string;
  rooms?: string[];
  roomTile?: boolean;
  heroImage?: string;
  previewImage?: string;
};

/**
 * The "Find your wall" band on the homepage.
 *
 * Shop prints only. The band sits on a shop-first homepage and every tile is an invitation to buy,
 * so fronting a room with a free download undersells it; free prints have their own section lower
 * down. A room with no shop print behind it shows no tile at all rather than borrowing one, and it
 * reappears on its own the moment a print that suits it is published, with nothing to change in code.
 * Its page stays live and in the sitemap either way.
 *
 * Which print faces a room: one pinned in Studio ("Use as the room tile"), else the newest, since
 * shopPrints arrives newest first. Without the pin every new listing takes over the tile of every
 * room it lands in, which is fine until a print with a weak room photo grabs one.
 *
 * heroImage, not previewImage: Sanity has already cropped it to this box's 4:5, honouring the
 * hotspot. It is also what the dedupe has to compare, since two prints can differ by preview and
 * still render the same hero here.
 */
export function roomTiles<T extends Tileable>(shopPrints: T[]): RoomTile[] {
  const used = new Set<string>();

  return COLLECTIONS.filter((c) => c.room).flatMap((collection) => {
    const matches = matchProductsToCollection(shopPrints, collection);
    const match = [...matches.filter((p) => p.roomTile), ...matches.filter((p) => !p.roomTile)].find((p) => {
      const image = p.heroImage || p.previewImage;
      return image ? !used.has(image) : false;
    });

    const image = match?.heroImage || match?.previewImage;
    if (!image) return [];
    used.add(image);

    return [{
      slug: collection.slug,
      label: roomLabel(collection.room!),
      tagline: collection.tagline,
      image,
    }];
  });
}
