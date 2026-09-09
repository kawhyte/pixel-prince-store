/**
 * Test script to verify Sanity connection and data
 * Run with: npx tsx scripts/test-sanity.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import { getAllProducts } from '../sanity/lib/client'

async function testSanity() {
  console.log('🔍 Testing Sanity connection...\n')

  console.log('Environment Variables:')
  console.log('- Project ID:', process.env.NEXT_PUBLIC_SANITY_PROJECT_ID)
  console.log('- Dataset:', process.env.NEXT_PUBLIC_SANITY_DATASET)
  console.log('- API Version:', process.env.NEXT_PUBLIC_SANITY_API_VERSION)
  console.log()

  try {
    console.log('📦 Fetching products from Sanity...\n')
    const products = await getAllProducts()

    console.log(`✅ Successfully fetched ${products.length} product(s)\n`)

    if (products.length === 0) {
      console.log('⚠️  No products found!')
      console.log('\nPossible reasons:')
      console.log('1. No products have been created in Sanity Studio')
      console.log('2. Products exist but are not PUBLISHED (only drafts)')
      console.log('3. Wrong dataset selected')
      console.log('\n💡 To fix:')
      console.log('- Go to http://localhost:3000/studio')
      console.log('- Check if your product has a green "Published" status')
      console.log('- If it says "Draft", click "Publish" in the bottom right')
    } else {
      console.log('Products found:')
      products.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.title}`)
        console.log(`   - ID: ${product.id}`)
        console.log(`   - Artist: ${product.artist}`)
        console.log(`   - Listing: ${product.listing} · offers: ${product.offers.length}`)
        console.log(`   - Tags: ${product.tags.join(', ')}`)
        console.log(`   - Preview Image: ${product.previewImage ? '✅' : '❌'}`)
      })
    }

    console.log('\n✅ Sanity connection test complete!')
  } catch (error) {
    console.error('❌ Error fetching products:', error)
    console.log('\n💡 Troubleshooting:')
    console.log('1. Check that your .env.local has the correct values')
    console.log('2. Verify you have internet connection (Sanity is cloud-based)')
    console.log('3. Make sure you ran: npx sanity init --env')
  }
}

testSanity()
