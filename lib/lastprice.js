import puppeteer, { Page } from 'puppeteer'

export interface ScrapedProduct {
  title: string
  titleHebrew?: string
  description?: string
  imageUrl: string
  price: number
  discountPrice?: number
  currency: string
  productId: string
  isAvailable: boolean
}

export class LastPriceScraper {
  private browser: any = null

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * Extract product ID from LastPrice URL
   */
  extractProductId(url: string): string | null {
    try {
      // URL format: https://www.lastprice.co.il/p/14420/...
      const match = url.match(/lastprice\.co\.il\/p\/(\d+)/)
      return match ? match[1] : null
    } catch {
      return null
    }
  }

  /**
   * Scrape product from LastPrice URL
   */
  async scrapeProduct(url: string): Promise<ScrapedProduct> {
    const productId = this.extractProductId(url)
    if (!productId) {
      throw new Error('INVALID_URL')
    }

    await this.init()

    const page = await this.browser.newPage()

    try {
      // Set Hebrew locale and user agent
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
      })

      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )

      // Navigate to product page
      console.log('Navigating to LastPrice:', url)
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      })

      // Wait for dynamic content and images to load
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Wait for images to load
      await page.waitForSelector('img', { timeout: 10000 }).catch(() => console.log('No img found'))

      // Scroll to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2)
      })
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Scroll back up
      await page.evaluate(() => {
        window.scrollTo(0, 0)
      })
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Force load all lazy images
      await page.evaluate(() => {
        const images = document.querySelectorAll('img')
        images.forEach(img => {
          if (img.dataset.src) img.src = img.dataset.src
          if (img.dataset.lazySrc) img.src = img.dataset.lazySrc
          if (img.dataset.original) img.src = img.dataset.original
        })
      })
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Try multiple scraping methods
      let product = await this.scrapeFromJsonLd(page, productId)

      if (!product) {
        product = await this.scrapeFromDOM(page, productId)
      }

      if (!product || !product.title) {
        throw new Error('SCRAPING_FAILED')
      }

      // If we have product but no image, try one more aggressive search
      if (!product.imageUrl) {
        console.log('No image found, trying aggressive image search...')
        const aggressiveImage = await this.findAnyLargeImage(page)
        if (aggressiveImage) {
          product.imageUrl = aggressiveImage
          console.log('Found image through aggressive search:', aggressiveImage.substring(0, 80))
        }
      }

      console.log('Scraped LastPrice product:', product)
      return product
    } catch (error: any) {
      console.error('LastPrice Scraping error:', error)

      if (error.message === 'INVALID_URL' || error.message === 'NOT_FOUND' || error.message === 'SCRAPING_FAILED') {
        throw error
      }

      throw new Error('TIMEOUT')
    } finally {
      await page.close()
    }
  }

  /**
   * Aggressive image finder - finds ANY large image on the page
   */
  private async findAnyLargeImage(page: Page): Promise<string | null> {
    try {
      const image = await page.evaluate(() => {
        const allImages = Array.from(document.querySelectorAll('img'))

        // Filter and sort by size
        const validImages = allImages
          .map(img => {
            const src = img.src ||
                       img.getAttribute('data-src') ||
                       img.getAttribute('data-lazy-src') ||
                       img.getAttribute('data-original') ||
                       img.getAttribute('srcset')?.split(',')[0]?.trim().split(' ')[0] ||
                       ''

            if (!src ||
                src.includes('logo') ||
                src.includes('icon') ||
                src.includes('placeholder') ||
                src.includes('loading') ||
                src.includes('spinner') ||
                !src.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
              return null
            }

            const width = img.naturalWidth || img.width || 0
            const height = img.naturalHeight || img.height || 0
            const size = width * height

            return { src, size, width, height }
          })
          .filter(img => img !== null && img.size > 10000) // At least 100x100
          .sort((a, b) => b!.size - a!.size)

        if (validImages.length > 0) {
          return validImages[0]!.src
        }

        return null
      })

      if (image) {
        // Clean up URL
        let cleanImage = image.split('?')[0]
        if (cleanImage.startsWith('//')) {
          cleanImage = 'https:' + cleanImage
        } else if (cleanImage.startsWith('/')) {
          cleanImage = 'https://www.lastprice.co.il' + cleanImage
        }
        return cleanImage
      }
    } catch (error) {
      console.error('Aggressive image search failed:', error)
    }
    return null
  }

  /**
   * Method 1: Try to extract from JSON-LD structured data
   */
  private async scrapeFromJsonLd(page: Page, productId: string): Promise<ScrapedProduct | null> {
    try {
      const jsonLd = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]')
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || '')
            if (data['@type'] === 'Product' || data['@graph']?.some((item: any) => item['@type'] === 'Product')) {
              return data
            }
          } catch (e) {
            continue
          }
        }
        return null
      })

      if (jsonLd) {
        const productData = jsonLd['@type'] === 'Product' ? jsonLd : jsonLd['@graph']?.find((item: any) => item['@type'] === 'Product')

        if (productData) {
          const price = parseFloat(productData.offers?.price || productData.offers?.lowPrice || productData.offers?.highPrice || '0')
          const discountPrice = productData.offers?.priceSpecification?.price ? parseFloat(productData.offers.priceSpecification.price) : undefined

          // Extract image - try multiple sources
          let imageUrl = ''
          
          // Try productData.image first
          if (Array.isArray(productData.image)) {
            const firstImage = productData.image[0]
            if (typeof firstImage === 'string') {
              imageUrl = firstImage
            } else if (typeof firstImage === 'object' && firstImage && 'url' in firstImage) {
              imageUrl = (firstImage as any).url || ''
            }
          } else if (typeof productData.image === 'object' && productData.image && 'url' in productData.image) {
            imageUrl = (productData.image as any).url || ''
          } else if (typeof productData.image === 'string') {
            imageUrl = productData.image
          }

          // Try additional image fields
          if (!imageUrl && productData.image && typeof productData.image === 'object' && '@id' in productData.image) {
            imageUrl = (productData.image as any)['@id'] || ''
          }

          // Try og:image from meta tags as fallback
          if (!imageUrl) {
            const ogImage = await page.evaluate(() => {
              const meta = document.querySelector('meta[property="og:image"]')
              return meta ? meta.getAttribute('content') : ''
            })
            if (ogImage) {
              imageUrl = ogImage
            }
          }

          // Clean up image URL - remove query params that might reduce quality
          if (imageUrl && (imageUrl.includes('_small') || imageUrl.includes('_thumb') || imageUrl.includes('w='))) {
            imageUrl = imageUrl.split('?')[0].replace('_small', '').replace('_thumb', '').replace('_thumbnail', '')
          }

          // Convert relative URLs to absolute
          if (imageUrl) {
            if (imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl
            } else if (imageUrl.startsWith('/')) {
              imageUrl = 'https://www.lastprice.co.il' + imageUrl
            }
          }

          console.log('JSON-LD found - price:', price, 'image:', imageUrl ? 'YES' : 'NO', imageUrl ? `(${imageUrl.substring(0, 50)}...)` : '')

          // Check availability - default to true if we found product data
          const availability = productData.offers?.availability || ''
          const isAvailable = availability === 'https://schema.org/InStock' ||
                            availability === 'InStock' ||
                            availability === 'http://schema.org/InStock' ||
                            !availability // If no availability info, assume available

          return {
            title: productData.name,
            titleHebrew: productData.name,
            description: productData.description || '',
            imageUrl,
            price: discountPrice || price,
            discountPrice: discountPrice && discountPrice < price ? discountPrice : undefined,
            currency: 'ILS',
            productId,
            isAvailable,
          }
        }
      }
    } catch (error) {
      console.log('JSON-LD extraction failed, trying next method')
    }

    return null
  }

  /**
   * Method 2: Extract from DOM selectors
   */
  private async scrapeFromDOM(page: Page, productId: string): Promise<ScrapedProduct | null> {
    try {
      const data = await page.evaluate(() => {
        // Title selectors for LastPrice
        const title =
          document.querySelector('h1.product-title')?.textContent?.trim() ||
          document.querySelector('h1[itemprop="name"]')?.textContent?.trim() ||
          document.querySelector('.product-name h1')?.textContent?.trim() ||
          document.querySelector('h1')?.textContent?.trim() ||
          ''

        // Image selectors for LastPrice - comprehensive list
        const imageSelectors = [
          // LastPrice specific selectors
          '.product-image img',
          '.product-image',
          'img.product-image',
          '.product-gallery img',
          '.product-images img',
          '.product-photos img',
          '.product-photo img',
          '.main-image img',
          'img.main-product-image',
          '.product-slider img',
          '.swiper-slide img',
          '.image-gallery img',
          '.product-media img',
          '[data-product-image] img',
          '[data-image] img',
          // Generic selectors
          'picture img',
          'img[itemprop="image"]',
          'img[src*="product"]',
          'img[src*="item"]',
          'img[src*="14420"]', // Product ID in URL
          'img[alt*="רדיאטור"]', // Product name in alt
          // Try all images and find the largest one
          'img',
        ]

        let imageUrl = ''
        let largestImage = { url: '', size: 0 }
        
        // First pass: try specific selectors
        for (const selector of imageSelectors.slice(0, -1)) {
          const elements = document.querySelectorAll(selector)
          for (const img of Array.from(elements)) {
            const imgEl = img as HTMLImageElement
            if (!imgEl) continue
            
            // Try multiple attributes
            const src = imgEl.src || 
                      imgEl.getAttribute('data-src') || 
                      imgEl.getAttribute('data-lazy-src') ||
                      imgEl.getAttribute('data-original') ||
                      imgEl.getAttribute('srcset')?.split(',')[0]?.trim().split(' ')[0] ||
                      ''
            
            if (src && 
                !src.includes('placeholder') && 
                !src.includes('loading') && 
                !src.includes('spinner') &&
                !src.includes('logo') &&
                !src.includes('icon') &&
                (src.startsWith('http') || src.startsWith('//'))) {
              
              // Check image size
              const width = imgEl.naturalWidth || imgEl.width || 0
              const height = imgEl.naturalHeight || imgEl.height || 0
              const size = width * height
              
              if (size > largestImage.size) {
                largestImage = { url: src, size }
              }
              
              // If it's a specific selector and has good size, use it immediately
              if (selector !== 'img' && size > 200) {
                imageUrl = src
                break
              }
            }
          }
          if (imageUrl) break
        }

        // If no specific image found, use the largest one
        if (!imageUrl && largestImage.url) {
          imageUrl = largestImage.url
        }

        // Try meta tags as fallback
        if (!imageUrl) {
          const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement
          if (ogImage && ogImage.content) {
            imageUrl = ogImage.content
          }
        }

        // Try to get high-res image - clean up URL
        if (imageUrl) {
          // Remove query params that might reduce quality
          imageUrl = imageUrl.split('?')[0]
          // Remove size indicators
          imageUrl = imageUrl.replace(/_small|_thumb|_thumbnail|_medium|_large/gi, '')
          // Make sure it's a full URL
          if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl
          } else if (imageUrl.startsWith('/')) {
            imageUrl = 'https://www.lastprice.co.il' + imageUrl
          }
        }

        // Price selectors for LastPrice
        const priceSelectors = [
          '.product-price .final-price',
          '.product-price .current-price',
          '.price .final-price',
          '[data-price]',
          '.product-price',
          '.price',
          '[itemprop="price"]',
        ]

        let priceText = ''
        let foundSelector = ''
        for (const selector of priceSelectors) {
          const priceElement = document.querySelector(selector)
          if (priceElement) {
            priceText = priceElement.textContent || ''
            foundSelector = selector
            if (priceText.trim()) break
          }
        }

        // Description
        const description =
          document.querySelector('.product-description')?.textContent?.trim() ||
          document.querySelector('[itemprop="description"]')?.textContent?.trim() ||
          document.querySelector('.product-details')?.textContent?.trim() ||
          ''

        return {
          title,
          image: imageUrl,
          priceText: priceText.trim(),
          description,
          foundSelector,
        }
      })

      if (!data.title) {
        return null
      }

      // Parse price
      const cleanPriceText = data.priceText.replace(/[^\d.,]/g, '').replace(',', '')
      const priceMatches = cleanPriceText.match(/[\d.]+/g)
      let price = 0
      let discountPrice: number | undefined

      if (priceMatches && priceMatches.length > 0) {
        const prices = priceMatches.map(p => parseFloat(p)).filter(p => !isNaN(p) && p > 0)

        if (prices.length > 0) {
          // Sort prices
          const sortedPrices = [...prices].sort((a, b) => b - a)

          if (sortedPrices.length > 1) {
            // Multiple prices - highest is original, lowest might be discount
            price = sortedPrices[0]
            discountPrice = sortedPrices[sortedPrices.length - 1] < price ? sortedPrices[sortedPrices.length - 1] : undefined
          } else {
            // Single price
            price = sortedPrices[0]
          }
        }
      }

      console.log('DOM extraction - Title:', data.title.substring(0, 50), 'Price:', price, 'Discount:', discountPrice, 'Image:', data.image ? 'YES' : 'NO')

      // If no image found, try one more time with a different approach
      let finalImageUrl = data.image || ''
      if (!finalImageUrl) {
        console.log('No image found in DOM, trying alternative methods...')
        // Try to get from page screenshot or other methods
        const alternativeImage = await page.evaluate(() => {
          // Try to find any large image on the page
          const allImages = Array.from(document.querySelectorAll('img'))
          for (const img of allImages) {
            const imgEl = img as HTMLImageElement
            const src = imgEl.src || imgEl.getAttribute('data-src') || ''
            if (src && 
                (imgEl.naturalWidth > 200 || imgEl.width > 200) &&
                !src.includes('logo') && 
                !src.includes('icon') &&
                !src.includes('placeholder')) {
              return src
            }
          }
          return ''
        })
        if (alternativeImage) {
          finalImageUrl = alternativeImage
          console.log('Found alternative image:', finalImageUrl)
        }
      }

      return {
        title: data.title,
        titleHebrew: data.title,
        description: data.description,
        imageUrl: finalImageUrl,
        price: price || 0,
        discountPrice,
        currency: 'ILS',
        productId,
        isAvailable: data.title ? true : false,
      }
    } catch (error) {
      console.error('DOM extraction failed:', error)
    }

    return null
  }
}

// Singleton instance
let scraperInstance: LastPriceScraper | null = null

export async function getLastPriceScraper(): Promise<LastPriceScraper> {
  if (!scraperInstance) {
    scraperInstance = new LastPriceScraper()
    await scraperInstance.init()
  }
  return scraperInstance
}

export async function closeLastPriceScraper() {
  if (scraperInstance) {
    await scraperInstance.close()
    scraperInstance = null
  }
}
