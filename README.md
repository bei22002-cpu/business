# NorthStar Consulting Production Site

## Quick Start: Deploy to Netlify

The site is ready to deploy to Netlify with automatic lead submission.

### 1. Connect to Netlify

Visit [Netlify](https://app.netlify.com) and click **Add new site** → **Import an existing project**.

- Select GitHub as your Git provider
- Authorize and select the `bei22002-cpu/business` repository
- Netlify should auto-detect the `netlify.toml` configuration

### 2. Configure Environment Variables

In Netlify's site settings, go to **Build & deploy** → **Environment** and add:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_RECIPIENT=northstarconsulting@gmail.com
```

**How to get a Gmail app password:**
- Enable 2-Step Verification on your Google Account
- Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- Select Mail and Windows Computer to generate a 16-character password
- Paste that password as `EMAIL_PASS`

### 3. Deploy

Push your changes to GitHub and Netlify will automatically build and deploy:

```bash
git add .
git commit -m "Setup live deployment for NorthStar site"
git push origin main
```

Your site will be live within seconds at `your-site.netlify.app`.

## Site Structure

- `docs/` - Static HTML, CSS, JS, and favicon (served by GitHub Pages as fallback)
- `netlify/functions/submit-lead.js` - Serverless endpoint for consultation requests
- `site-config.js` - Runtime configuration for the lead endpoint
- `netlify.toml` - Netlify build and function configuration

## Lead Submission Flow

1. **Chatbot intake** - Visitor answers questions in chat, form is prefilled
2. **Consultation form** - Visitor reviews and submits the form
3. **Serverless function** - `submit-lead.js` validates and emails the lead
4. **Email notification** - NorthStar receives the consultation request

## Alternative Deployment Options

### GitHub Pages (Static Only)

If you don't want email submission, GitHub Pages can host the static site:

1. Settings → Pages → Source: `main` / `docs/`
2. Site will be live at `https://bei22002-cpu.github.io/business/`

### Vercel (Alternative Serverless)

Vercel also supports serverless functions. Update `verify.json` if switching platforms.

## Environment-Free Option

If you prefer not to handle email credentials:

- Deploy to Netlify without the serverless function
- Update `site-config.js` to set `fallbackToEmail: true`
- The form will fall back to email client when submitted

A static website for NorthStar Consulting — your strategic compass for growth and operational excellence.

## How to Run

Open `northstar_production_site/index.html` directly in your browser, or serve it with any static file server:

```bash
# Using Python
cd northstar_production_site
python3 -m http.server 8000
# Then open http://localhost:8000 in your browser
```

## Files

- `northstar_production_site/index.html` — Main HTML page
- `northstar_production_site/styles.css` — Stylesheet
- `northstar_production_site/script.js` — JavaScript
