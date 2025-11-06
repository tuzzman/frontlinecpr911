FrontlineCPR911
=================

A small, static (HTML/CSS/JavaScript) website for AHA-compliant CPR & AED training. This repository contains the public site and a simple admin interface (static frontend) that integrates with a PHP backend API at `https://frontlinecpr911.com/api`.

Quick structure
---------------
- `index.html`, `classes.html`, `about.html`, `contact.html` — public pages
- `assets/css/` — `style.css` (public) and `admin.css` (admin styles)
- `assets/js/` — `script.js` (public) and `admin.js` (admin dashboard scripts)
- `.github/workflows/deploy.yml` — GitHub Actions workflow to deploy via FTP on pushes to `main`
- `.gitignore` — common ignores
- `.github/copilot-instructions.md` — guidance for AI coding agents

Local development
-----------------
This is a static site, so you can preview pages simply by opening the HTML files in a browser.
For a small local HTTP server (recommended to avoid CORS/browser fetch issues):

Using Python 3 (from project root):

```powershell
# Python 3.x
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

Using Node (http-server):

```powershell
npm install -g http-server
http-server -p 8000
```

Git & collaboration
-------------------
Repository uses `main` as the default branch. Example common commands:

```powershell
# clone
git clone https://github.com/YOUR_USERNAME/frontlinecpr911.git

# make a feature branch
git checkout -b feature/your-change

# add, commit, push
git add .
git commit -m "Add feature X"
git push origin feature/your-change
```

Deploy (GitHub Actions)
-----------------------
This repo includes an FTP deploy workflow that runs on pushes to `main`. To enable it, add the following repository secrets in GitHub (Settings → Secrets and variables → Actions):

- `FTP_HOST` — your FTP host (e.g. `ftp.example.com`)
- `FTP_USERNAME` — FTP username
- `FTP_PASSWORD` — FTP password or app-specific password
- `FTP_REMOTE_PATH` — remote path to upload (e.g. `/public_html`)
- `FTP_PORT` — optional (21 for FTP, 22 for SFTP)

By default the workflow uses `SamKirkland/FTP-Deploy-Action`. If your host supports SFTP/SSH or you prefer `rsync`, consider switching to an SSH-based deploy (more secure and efficient). I can add an SSH/rsync workflow on request.

Notes & conventions
-------------------
- Mobile-first layout; breakpoint at `768px`.
- CSS variables for theme colors are in `assets/css/style.css` and `admin.css`.
- The public JS uses `async/await` and fetches the backend API at `API_BASE_URL` (edit `assets/js/script.js` and `assets/js/admin.js` to configure the backend URL).
- Use the `sold-out` class to mark full classes and `paid`/`pending` classes for payment status badges.

Additions and maintenance
-------------------------
- To add a new public page, copy the header/footer from existing pages and include `assets/css/style.css` and `assets/js/script.js` as needed.
- Admin changes should be added to `assets/css/admin.css` and `assets/js/admin.js` and follow the existing dashboard patterns.

Contact
-------
If you'd like me to add a LICENSE, CONTRIBUTING guide, switch to SFTP/rsync deploy, or create a CI test (lint or HTML validation), tell me which option and I will implement it.
