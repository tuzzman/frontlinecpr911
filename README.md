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

Admin setup (PHP API)
---------------------
The repo includes a lightweight PHP API under `/api` and database schema under `/db/schema.sql`.

1) Create a MySQL/MariaDB database and user, then copy `api/config.sample.php` to `api/config.php` and fill in credentials.

2) Import `db/schema.sql` into your database.

3) First admin login: optionally set in `api/config.php`:

	- `ALLOW_FIRST_ADMIN` to `true`
	- `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`

	Then visit `/admin/login.html` and log in using those credentials. An admin user will be created on first login. Set `ALLOW_FIRST_ADMIN` back to `false` afterward.

4) Endpoints:

	- `POST /api/auth.php` — login `{ email, password }`
	- `GET /api/auth.php` — current session user
	- `POST /api/logout.php` — logout
	- `POST /api/group_request.php` — public group training request submit
	- `GET /api/group_request.php` — admin list with optional `status`, `from`, `to`
	- `GET /api/export.php?type=group_requests` — CSV export with optional filters (`status`, `from`, `to`)
		- `GET /api/clients.php?listType=classes` — classes for dropdown (admin)
		- `GET /api/clients.php?classId=123` — roster for class 123 (admin)
		- `GET /api/export.php?type=roster&classId=123` — PDF roster if Dompdf is installed; else HTML fallback
		- `GET /api/export.php?type=roster&classId=123&format=csv` — CSV roster

5) Admin UI:

	- `/admin/login.html` — login form
	- `/admin/dashboard.html` — group requests list with filters and CSV export
		- `/admin/clients.html` — select a class to view roster; export PDF or CSV
		- `/admin/classes.html` — create classes and view all classes

`api/config.php` is ignored by git; keep secrets out of version control.

Optional: PDF exports with Dompdf
---------------------------------
To enable server-side PDF for rosters, install Dompdf on your host so the class `Dompdf\\Dompdf` is available to PHP.

Typical steps on shared hosting (without Composer):
1. Download a release zip of Dompdf from https://github.com/dompdf/dompdf/releases
2. Upload the `dompdf` folder to `/api/vendor/dompdf/`
3. Add `require_once __DIR__ . '/vendor/dompdf/autoload.inc.php';` near the top of `api/export.php` (right after the `require_once _common.php`) or in a shared bootstrap.
4. Visit `/admin/clients.html`, select a class, and click "Export Roster PDF".

If Dompdf is not present, the endpoint will return a printable HTML roster as a fallback.
