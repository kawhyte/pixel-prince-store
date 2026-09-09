import { type SchemaTypeDefinition } from 'sanity'
import { product } from './product'
import { printOffer } from './printOffer'
import { subscriber } from './subscriber'
import { post } from './post'
import { blogImage } from './blogImage'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [product, printOffer, subscriber, post, blogImage],
}
