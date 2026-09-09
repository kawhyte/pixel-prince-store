import type {StructureResolver} from 'sanity/structure'
import { Gift, FileText, Users, Images, ShoppingBag } from 'lucide-react'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('The Pixel Prince')
    .items([
      S.listItem()
        .title('Artworks')
        .icon(Gift)
        .child(
          S.documentTypeList('product')
            .title('Artworks')
            .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
        ),
      S.listItem()
        .title('In the shop')
        .icon(ShoppingBag)
        .child(
          S.documentList()
            .title('Artworks with an on-site offer')
            .filter('_type == "product" && count(offers[provider == "fourthwall" && active != false]) > 0')
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
    ])
