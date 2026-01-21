const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');

let browser = null;

// Initialize browser
async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });
  }
  return browser;
}

// Extract product ID from URL
function extractProductId(url) {
  try {
    const match = url.match(/lastprice\.co\.il\/p\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Scrape product
async function scrapeProduct(url) {
  const productId = extractProductId(url);
  if (!productId) {
    throw new Error('INVALID_URL');
  }

  const browser = await initBrowser();
  const page = await browser.newPage();

  try {
    // Set Hebrew locale and user agent
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to product page
    console.log('Navigating to LastPrice:', url);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to extract from JSON-LD
    const product = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');

      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          const productData = data['@type'] === 'Product'
            ? data
            : data['@graph']?.find(item => item['@type'] === 'Product');

          if (productData) {
            const price = parseFloat(productData.offers?.price || productData.offers?.lowPrice || '0');
            const discountPrice = productData.offers?.priceSpecification?.price
              ? parseFloat(productData.offers.priceSpecification.price)
              : undefined;

            let imageUrl = '';
            if (Array.isArray(productData.image)) {
              const firstImage = productData.image[0];
              imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
            } else if (typeof productData.image === 'object' && productData.image) {
              imageUrl = productData.image.url || productData.image['@id'] || '';
            } else if (typeof productData.image === 'string') {
              imageUrl = productData.image;
            }

            // Fallback to og:image
            if (!imageUrl) {
              const meta = document.querySelector('meta[property="og:image"]');
              imageUrl = meta ? meta.getAttribute('content') || '' : '';
            }

            // Clean up image URL
            if (imageUrl) {
              imageUrl = imageUrl.split('?')[0];
              if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
              } else if (imageUrl.startsWith('/')) {
                imageUrl = 'https://www.lastprice.co.il' + imageUrl;
              }
            }

            const availability = productData.offers?.availability || '';
            const isAvailable = availability === 'https://schema.org/InStock' ||
                              availability === 'InStock' ||
                              availability === 'http://schema.org/InStock' ||
                              !availability;

            return {
              title: productData.name,
              titleHebrew: productData.name,
              description: productData.description || '',
              imageUrl,
              price: discountPrice || price,
              discountPrice: discountPrice && discountPrice < price ? discountPrice : undefined,
              currency: 'ILS',
              isAvailable,
            };
          }
        } catch (e) {
          console.log('Failed to parse JSON-LD:', e);
        }
      }
      return null;
    });

    if (!product || !product.title) {
      throw new Error('SCRAPING_FAILED');
    }

    console.log('Scraped LastPrice product:', product);
    return { ...product, productId };

  } finally {
    await page.close();
  }
}

// POST /api/scrape/lastprice
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const product = await scrapeProduct(url);
    res.json(product);

  } catch (error) {
    console.error('Scraping error:', error);

    if (error.message === 'INVALID_URL') {
      return res.status(400).json({ error: 'Invalid LastPrice URL' });
    }

    if (error.message === 'SCRAPING_FAILED') {
      return res.status(400).json({ error: 'Failed to scrape product' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  if (browser) {
    await browser.close();
  }
});

module.exports = router;
