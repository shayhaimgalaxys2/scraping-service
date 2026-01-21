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
    const match = url.match(/ksp\.co\.il\/(?:web\/)?item\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Scrape product from KSP
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

    console.log('Navigating to KSP:', url);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try multiple scraping methods
    let product = await scrapeFromJsonLd(page, productId);

    if (!product) {
      product = await scrapeFromDOM(page, productId);
    }

    if (!product) {
      product = await scrapeFromMetaTags(page, productId);
    }

    if (!product || !product.title) {
      throw new Error('SCRAPING_FAILED');
    }

    console.log('Scraped KSP product:', product);
    return product;

  } finally {
    await page.close();
  }
}

// Method 1: Extract from JSON-LD
async function scrapeFromJsonLd(page, productId) {
  try {
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

            let imageUrl = '';
            if (Array.isArray(productData.image)) {
              imageUrl = productData.image[0] || '';
            } else if (typeof productData.image === 'object' && productData.image?.url) {
              imageUrl = productData.image.url;
            } else if (typeof productData.image === 'string') {
              imageUrl = productData.image;
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
              price,
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

    if (product) {
      return { ...product, productId };
    }
  } catch (error) {
    console.log('JSON-LD extraction failed');
  }

  return null;
}

// Method 2: Extract from Meta tags
async function scrapeFromMetaTags(page, productId) {
  try {
    const data = await page.evaluate(() => {
      const getMetaContent = (property) => {
        const meta = document.querySelector(`meta[property="${property}"]`) ||
                    document.querySelector(`meta[name="${property}"]`);
        return meta?.getAttribute('content') || '';
      };

      const image =
        getMetaContent('og:image') ||
        getMetaContent('og:image:url') ||
        getMetaContent('twitter:image') ||
        getMetaContent('twitter:image:src') ||
        '';

      return {
        title: getMetaContent('og:title') || getMetaContent('twitter:title'),
        description: getMetaContent('og:description') || getMetaContent('twitter:description'),
        image,
        price: getMetaContent('product:price:amount') || getMetaContent('og:price:amount'),
      };
    });

    if (data.title && data.price) {
      const price = parseFloat(data.price.replace(/[^\d.]/g, ''));

      return {
        title: data.title,
        titleHebrew: data.title,
        description: data.description,
        imageUrl: data.image,
        price,
        currency: 'ILS',
        productId,
        isAvailable: price > 0,
      };
    }
  } catch (error) {
    console.log('Meta tags extraction failed');
  }

  return null;
}

// Method 3: Extract from DOM
async function scrapeFromDOM(page, productId) {
  try {
    const data = await page.evaluate(() => {
      // Title
      const title =
        document.querySelector('h1[itemprop="name"]')?.textContent ||
        document.querySelector('h1.product-name')?.textContent ||
        document.querySelector('.product-title')?.textContent ||
        document.querySelector('h1')?.textContent ||
        '';

      // Price selectors
      const priceSelectors = [
        '.final-price',
        '.selling-price',
        '.current-price',
        '.price-now',
        '[itemprop="price"]',
        '.price',
        '.product-price',
      ];

      let priceText = '';
      for (const selector of priceSelectors) {
        const priceElements = document.querySelectorAll(selector);
        for (const priceElement of priceElements) {
          const className = priceElement.className || '';
          if (className.includes('old') || className.includes('original')) {
            continue;
          }
          const text = priceElement?.textContent || '';
          if (text.match(/[\d,]+/) && text.length < 50) {
            priceText = text;
            break;
          }
        }
        if (priceText) break;
      }

      // Image
      const imageSelectors = [
        '[itemprop="image"]',
        '.product-image img',
        'img[data-zoom-image]',
        '.main-image img',
        'img[class*="product"]',
      ];

      let image = '';
      for (const selector of imageSelectors) {
        const imgElement = document.querySelector(selector);
        if (imgElement?.src) {
          image = imgElement.src;
          break;
        }
      }

      // Description
      const description =
        document.querySelector('[itemprop="description"]')?.textContent ||
        document.querySelector('.product-description')?.textContent ||
        '';

      return {
        title: title.trim(),
        priceText: priceText.trim(),
        image,
        description: description.trim(),
      };
    });

    if (!data.title) {
      return null;
    }

    // Parse price
    const priceMatches = data.priceText.match(/[\d,]+(?:\.\d{1,2})?/g);
    let price = 0;
    let discountPrice;

    if (priceMatches && priceMatches.length > 0) {
      let prices = priceMatches
        .map(p => parseFloat(p.replace(/,/g, '')))
        .filter(p => !isNaN(p) && p > 0);

      if (prices.length > 0) {
        const reasonablePrices = prices.filter(p => p >= 10);
        const validPrices = reasonablePrices.length > 0 ? reasonablePrices : prices;

        if (validPrices.length > 1) {
          const sortedPrices = validPrices.sort((a, b) => b - a);
          price = sortedPrices[0];
          discountPrice = sortedPrices[sortedPrices.length - 1];
        } else {
          price = validPrices[0];
        }
      }
    }

    return {
      title: data.title,
      titleHebrew: data.title,
      description: data.description,
      imageUrl: data.image,
      price: price || 0,
      discountPrice,
      currency: 'ILS',
      productId,
      isAvailable: true,
    };
  } catch (error) {
    console.error('DOM extraction failed:', error);
  }

  return null;
}

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  if (browser) {
    await browser.close();
  }
});

module.exports = {
  scrapeProduct,
};
