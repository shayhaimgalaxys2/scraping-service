# Shopping List Scraping Service

Microservice for scraping product information from Israeli e-commerce sites (KSP, LastPrice).

## Features

- 🔒 API Key authentication
- 🎭 Puppeteer-based scraping
- 🐳 Docker support
- 🚀 Production-ready

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and set your API_KEY

# Run the service
npm start
```

### Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Scrape LastPrice Product
```bash
POST /api/scrape/lastprice
Headers:
  x-api-key: your-api-key
Body:
  {
    "url": "https://www.lastprice.co.il/p/62103707/..."
  }
```

### Scrape KSP Product
```bash
POST /api/scrape/ksp
Headers:
  x-api-key: your-api-key
Body:
  {
    "url": "https://ksp.co.il/..."
  }
```

## Deployment Options

### Option 1: Railway (Recommended - Free tier available)
1. Create account on [Railway.app](https://railway.app)
2. Install Railway CLI: `npm i -g @railway/cli`
3. Login: `railway login`
4. Initialize: `railway init`
5. Deploy: `railway up`
6. Set environment variables in Railway dashboard

### Option 2: Render (Free tier available)
1. Create account on [Render.com](https://render.com)
2. Connect your GitHub repo
3. Create new Web Service
4. Set environment variables
5. Deploy

### Option 3: Digital Ocean App Platform ($5/month)
1. Create account on [DigitalOcean](https://digitalocean.com)
2. Create new App
3. Connect GitHub repo
4. Select Basic plan ($5/month)
5. Set environment variables
6. Deploy

### Option 4: Fly.io (Free tier available)
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch: `fly launch`
4. Set secrets: `fly secrets set API_KEY=your-key`
5. Deploy: `fly deploy`

## Environment Variables

- `PORT` - Server port (default: 3001)
- `API_KEY` - Secret key for API authentication
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `NODE_ENV` - Environment (development/production)

## Security

- Always use a strong, random API_KEY
- Keep your API_KEY secret
- Only allow your Vercel domain in ALLOWED_ORIGINS
- Use HTTPS in production

## Testing

```bash
# Test locally
curl -X POST http://localhost:3001/api/scrape/lastprice \
  -H "x-api-key: dev-scraping-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.lastprice.co.il/p/62103707/..."}'
```
