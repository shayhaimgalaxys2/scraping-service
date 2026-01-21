# 🚀 Quick Start - פריסה ל-Railway

## שלב 1: הכנת החשבון

1. **צור חשבון Railway:**
   - גש ל-https://railway.app
   - לחץ "Start a New Project"
   - התחבר עם GitHub
   - אמת את המייל שלך

2. **אפשר GitHub integration:**
   - ב-Railway dashboard, לחץ על הפרופיל שלך
   - Settings → GitHub
   - התחבר ל-GitHub repo שלך

## שלב 2: פריסה מ-GitHub (הדרך הקלה ביותר!)

### אופציה A: ישירות מה-Dashboard (מומלץ!)

1. **העלה את הקוד ל-GitHub:**
```bash
cd scraping-service
git init
git add .
git commit -m "Initial commit - scraping microservice"

# צור repo חדש ב-GitHub בשם "scraping-service"
# ואז:
git remote add origin https://github.com/YOUR-USERNAME/scraping-service.git
git branch -M main
git push -u origin main
```

2. **צור פרויקט ב-Railway:**
   - לחץ "New Project"
   - בחר "Deploy from GitHub repo"
   - בחר את ה-repo `scraping-service`
   - Railway יזהה אוטומטית את הפרויקט!

3. **הגדר משתני סביבה:**
   - לחץ על השירות שנוצר
   - לשונית "Variables"
   - הוסף:
     - `API_KEY`: (צור מפתח חזק - לדוגמה: `scrape_prod_xyz123abc456def789`)
     - `ALLOWED_ORIGINS`: `https://shopping-list-ruby-mu.vercel.app,http://localhost:3000`
     - `NODE_ENV`: `production`
     - `PORT`: `3001`

4. **קבל את ה-URL:**
   - לשונית "Settings"
   - גלול ל-"Public Networking"
   - לחץ "Generate Domain"
   - שמור את ה-URL (לדוגמה: `scraping-service-production.up.railway.app`)

### אופציה B: דרך ה-CLI

```bash
# 1. התחבר
railway login

# 2. התחל פרויקט חדש
cd scraping-service
railway init

# 3. קישור ל-GitHub (אופציונלי)
railway link

# 4. הגדר משתנים
railway variables set API_KEY="scrape_prod_xyz123abc456def789"
railway variables set ALLOWED_ORIGINS="https://shopping-list-ruby-mu.vercel.app"
railway variables set NODE_ENV="production"

# 5. העלה את הקוד
railway up

# 6. פתח את ה-dashboard לקבלת URL
railway open
```

## שלב 3: בדיקה

```bash
# בדוק health
curl https://YOUR-SERVICE.railway.app/health

# בדוק scraping (החלף YOUR_API_KEY)
curl -X POST https://YOUR-SERVICE.railway.app/api/scrape/lastprice \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.lastprice.co.il/p/62103707"}'
```

## שלב 4: עדכן את Vercel

```bash
# הוסף את ה-URL של השירות
vercel env add SCRAPING_SERVICE_URL production
# הכנס: https://YOUR-SERVICE.railway.app

# הוסף את ה-API KEY
vercel env add SCRAPING_SERVICE_API_KEY production
# הכנס: אותו מפתח שהגדרת ב-Railway

# גם ל-preview
vercel env add SCRAPING_SERVICE_URL preview
vercel env add SCRAPING_SERVICE_API_KEY preview

# גם ל-development
vercel env add SCRAPING_SERVICE_URL development
vercel env add SCRAPING_SERVICE_API_KEY development
# הכנס: http://localhost:3001 (לפיתוח מקומי)
```

## שלב 5: עדכן את הקוד ב-Vercel

אחרי שתסיים, תן לי לדעת ואני אעדכן את הקוד הראשי להשתמש ב-microservice!

## 💡 טיפים

- **API Key חזק:** השתמש בגנרטור אקראי, לדוגמה:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- **Logs:** ראה logs ב-Railway dashboard או:
  ```bash
  railway logs
  ```

- **עדכונים אוטומטיים:** Railway יעדכן אוטומטית כל פעם שתעשה push ל-GitHub!

## ⚠️ חשוב!

1. **אל תשכח** לשמור את ה-API_KEY במקום בטוח
2. **אותו מפתח** צריך להיות גם ב-Railway וגם ב-Vercel
3. **ה-URL** של Railway צריך להיות ב-Vercel כ-`SCRAPING_SERVICE_URL`

---

**זקוק לעזרה?** תן לי לדעת איפה אתה תקוע! 🚀
