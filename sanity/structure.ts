import type {StructureResolver} from 'sanity/structure'
import { Gift, FileText, Users, Images, ShoppingBag, Receipt, LayoutGrid } from 'lucide-react'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('The Pixel Prince')
    .items([
      // The superset of the two lists below it. It was called "Artworks" and carried the same gift
      // icon as "Free prints", so it read as a third category rather than as everything.
      S.listItem()
        .title('All artwork')
        .icon(LayoutGrid)
        .child(
          S.documentTypeList('product')
            .title('All artwork (free and shop)')
            .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
        ),
      S.listItem()
        .title('Free prints')
        .icon(Gift)
        .child(
          S.documentList()
            .title('Free prints (download)')
            .filter('_type == "product" && listing != "shop"')
            .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
        ),
      S.listItem()
        .title('Shop prints')
        .icon(ShoppingBag)
        .child(
          S.documentList()
            .title('Shop prints (for sale)')
            .filter('_type == "product" && listing == "shop"')
            .defaultOrdering([{ field: 'title', direction: 'asc' }])
        ),
      S.listItem()
        .title('Blog Posts')
        .icon(FileText)
        .child(
          S.documentTypeList('post')
            .title('Blog Posts')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
        ),
      // Media Library: native Sanity asset browser. sanity-plugin-media needs
      // Sanity v5/v6 and this project is pinned to v4.19.0, so we list the
      // built-in `sanity.imageAsset` documents instead — every uploaded preview
      // & detail image, newest first, with thumbnails. (Print files live on
      // Cloudinary, not here.)
      S.listItem()
        .title('Media Library')
        .icon(Images)
        .child(
          S.documentTypeList('sanity.imageAsset')
            .title('Media Library')
            .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
        ),
      S.divider(),
      S.listItem()
        .title('Subscribers')
        .icon(Users)
        .child(S.documentTypeList('subscriber').title('Subscribers')),
      S.listItem()
        .title('Shop orders')
        .icon(Receipt)
        .child(
          S.documentTypeList('fwOrder')
            .title('Shop orders')
            .defaultOrdering([{ field: 'receivedAt', direction: 'desc' }])
        ),
    ])
