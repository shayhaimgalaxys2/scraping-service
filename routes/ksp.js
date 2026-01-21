const express = require('express');
const router = express.Router();
const { scrapeProduct } = require('../lib/ksp');

// POST /api/scrape/ksp
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
      return res.status(400).json({ error: 'Invalid KSP URL' });
    }

    if (error.message === 'SCRAPING_FAILED') {
      return res.status(400).json({ error: 'Failed to scrape product' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
