# 🚀 Deployment Guide

## מה יצרנו?

Microservice עצמאי לסקרייפינג שרץ בנפרד מ-Vercel. השירות:
- ✅ עובד עם Puppeteer (Chrome headless)
- ✅ מאובטח עם API Key
- ✅ מוכן ל-Docker
- ✅ קל לפריסה על פלטפורמות שונות

## אפשרויות פריסה (מומלץ לא מומלץ)

### 🥇 Railway.app (מומלץ ביותר!)
- ✅ **Free tier זמין** (500 שעות חינם בחודש)
- ✅ פריסה אוטומטית מ-GitHub
- ✅ תמיכה מובנית ב-Puppeteer
- ✅ קל להגדיר

**צעדים:**
```bash
# 1. התקן Railway CLI
npm i -g @railway/cli

# 2. התחבר
railway login

# 3. אתחל את הפרויקט (בתיקייה scraping-service)
cd scraping-service
railway init

# 4. העלה את הקוד
railway up

# 5. הגדר משתני סביבה ב-dashboard:
# - API_KEY: בחר מפתח חזק ואקראי
# - ALLOWED_ORIGINS: https://shopping-list-ruby-mu.vercel.app
# - NODE_ENV: production

# 6. קבל את ה-URL של השירות
railway status
```

### 🥈 Render.com (חינם)
- ✅ Free tier זמין
- ✅ Docker support
- ⚠️ יכול להיכנס ל-sleep mode אחרי חוסר שימוש

**צעדים:**
1. צור חשבון ב-[Render.com](https://render.com)
2. לחץ "New +" → "Web Service"
3. התחבר ל-GitHub repo
4. בחר את התיקייה `scraping-service`
5. הגדרות:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Docker
6. הוסף משתני סביבה:
   - `API_KEY`: [מפתח חזק]
   - `ALLOWED_ORIGINS`: https://shopping-list-ruby-mu.vercel.app
   - `NODE_ENV`: production

### 🥉 Fly.io (חינם עד 3 VMs)
- ✅ Free tier טוב
- ✅ מהיר מאוד
- ⚠️ דורש כרטיס אשראי (לא מחייבים)

**צעדים:**
```bash
# 1. התקן Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. התחבר
fly auth login

# 3. התחל פרויקט (בתיקיית scraping-service)
cd scraping-service
fly launch

# 4. הגדר secrets
fly secrets set API_KEY="your-strong-api-key-here"
fly secrets set ALLOWED_ORIGINS="https://shopping-list-ruby-mu.vercel.app"
fly secrets set NODE_ENV="production"

# 5. פרוס
fly deploy
```

### Digital Ocean App Platform ($5/חודש)
- 💰 לא חינם אבל יציב ומהיר
- ✅ תמיכה מצוינת
- ✅ 200$ קרדיט לחשבון חדש

## שלב 2: עדכון Vercel App

לאחר שפרסת את ה-microservice, עדכן את האפליקציה הראשית:

1. **הוסף משתני סביבה ב-Vercel:**
```bash
vercel env add SCRAPING_SERVICE_URL
# הכנס: https://your-service.railway.app (או URL אחר)

vercel env add SCRAPING_SERVICE_API_KEY
# הכנס: אותו API_KEY שהגדרת ב-microservice
```

2. **עדכן את הקוד** (אני אעזור לך עם זה)

## בדיקה

לאחר הפריסה, בדוק:

```bash
# Health check
curl https://your-service.railway.app/health

# Scraping test
curl -X POST https://your-service.railway.app/api/scrape/lastprice \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.lastprice.co.il/p/62103707"}'
```

## עלויות משוערות

| Platform | חינם | מחיר חודשי |
|----------|------|-----------|
| Railway | 500 שעות/חודש | $5 אחרי |
| Render | כן (עם sleep) | $7 ללא sleep |
| Fly.io | 3 VMs | $0-5 |
| Digital Ocean | $200 קרדיט | $5 |

## המלצה שלי

**התחל עם Railway** - הכי קל להתקין והכי יציב בתור חינם. אם צריך יותר, עבור ל-Digital Ocean.

## תמיכה

אם יש בעיות:
1. בדוק logs: `railway logs` או בdashboard
2. ודא שה-API_KEY זהה בשני המקומות
3. ודא ש-ALLOWED_ORIGINS מוגדר נכון
4. בדוק שה-URL של ה-service נכון
