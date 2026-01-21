# 🚀 פריסה מיידית - עקוב אחרי השלבים האלה

## שלב 1: צור GitHub Repo (2 דקות)

1. **לך ל-GitHub:**
   - https://github.com/new

2. **מלא את הפרטים:**
   - Repository name: `scraping-service`
   - Description: `Microservice for scraping LastPrice and KSP products`
   - Public ✓
   - **אל** תסמן "Add README" (יש לנו כבר)

3. **לחץ "Create repository"**

4. **העלה את הקוד:**
   ```bash
   cd "/Users/cal/shay projects/shopping-list/scraping-service"
   git remote add origin https://github.com/shayhaimgalaxys2/scraping-service.git
   git branch -M main
   git push -u origin main
   ```

## שלב 2: פרוס ל-Railway (5 דקות)

1. **לך ל-Railway:**
   - https://railway.app
   - לחץ "Login" → "Login with GitHub"

2. **צור Project חדש:**
   - לחץ "New Project"
   - בחר "Deploy from GitHub repo"
   - בחר את `scraping-service`
   - Railway יזהה אוטומטית Node.js!

3. **הוסף משתני סביבה:**
   - לחץ על השירות שנוצר
   - לשונית "Variables"
   - לחץ "+ New Variable" לכל אחד:

   ```
   API_KEY = scrape_prod_a1b2c3d4e5f6g7h8i9j0
   ALLOWED_ORIGINS = https://shopping-list-ruby-mu.vercel.app,http://localhost:3000
   NODE_ENV = production
   PORT = 3001
   ```

4. **קבל את ה-URL:**
   - לשונית "Settings"
   - גלול ל-"Networking"
   - לחץ "Generate Domain"
   - **שמור את ה-URL!** (לדוגמה: `scraping-service-production.up.railway.app`)

5. **בדוק שעובד:**
   ```bash
   # החלף YOUR_URL
   curl https://YOUR_URL.railway.app/health

   # אמור לקבל: {"status":"ok","service":"scraping-service"}
   ```

## שלב 3: בדיקת Scraping (1 דקה)

```bash
curl -X POST https://YOUR_URL.railway.app/api/scrape/lastprice \
  -H "x-api-key: scrape_prod_a1b2c3d4e5f6g7h8i9j0" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.lastprice.co.il/p/62103707"}'
```

אם קיבלת JSON עם פרטי מוצר - **זה עובד!** 🎉

## שלב 4: עדכן Vercel (3 דקות)

```bash
cd "/Users/cal/shay projects/shopping-list"

# הוסף את URL של השירות
vercel env add SCRAPING_SERVICE_URL
# הכנס: https://YOUR_URL.railway.app (בלי / בסוף!)
# בחר: Production, Preview, Development

# הוסף את ה-API Key
vercel env add SCRAPING_SERVICE_API_KEY
# הכנס: scrape_prod_a1b2c3d4e5f6g7h8i9j0
# בחר: Production, Preview, Development
```

## שלב 5: **תגיד לי "עדכן את הקוד"**

ואני אעדכן את האפליקציה הראשית להשתמש במיקרו-שירות!

---

## ⚠️ חשוב לזכור:

1. ✅ השתמש באותו `API_KEY` גם ב-Railway וגם ב-Vercel
2. ✅ שמור את ה-URL של Railway (תצטרך אותו לVercel)
3. ✅ ה-URL ללא `/` בסוף

## 🆘 תקלות נפוצות:

**אם Railway לא מזהה את הפרויקט:**
- ודא שיש `package.json` בשורש
- ודא שיש `start` script ב-package.json

**אם קיבלת "Unauthorized":**
- ודא שה-API_KEY זהה ב-Railway ובבקשה
- ודא שאתה שולח header `x-api-key`

**אם הסקרייפינג לא עובד:**
- ראה logs ב-Railway dashboard
- ודא שיש אינטרנט בשירות

---

**מוכן? תתחיל בשלב 1!** 🚀
