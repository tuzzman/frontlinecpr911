# FrontlineCPR911 AI Agent Instructions

## Project Overview
FrontlineCPR911 is a professional CPR training website focused on AHA-compliant certification courses. The site provides class scheduling, registration, and admin management capabilities.

## Architecture

### Frontend Structure
- Pure HTML/CSS/JavaScript implementation (no framework)
- Responsive design using mobile-first approach
- Key components:
  - Public pages: `index.html`, `classes.html`, `about.html`, `contact.html`
  - Admin interface: Dashboard and class management
  - CSS: Separate `style.css` for public site and `admin.css` for admin interface

### Design System
```css
/* Core theme colors - defined in style.css and admin.css */
--color-primary: #CC0000;     /* Brand Red */
--color-secondary: #1A1A1A;   /* Near-Black */
--color-background: #FFFFFF;  /* White */
--color-light-gray: #F4F4F4; /* Section Backgrounds */
```

### API Integration
- Backend API endpoint: `https://frontlinecpr911.com/api`
- Key endpoints:
  - `/classes` - Class listing and management
  - `/register.php` - Student registration
  - `/auth.php` - Admin authentication
  - `/clients.php` - Client management

## Development Workflows

### Adding New Features
1. CSS changes:
   - Public site styles go in `assets/css/style.css`
   - Admin interface styles go in `assets/css/admin.css`
   - Follow the established CSS variable system for consistency

2. JavaScript functionality:
   - Public site: Add to `assets/js/script.js`
   - Admin features: Add to `assets/js/admin.js`
   - Use `async/await` for API calls
   - Handle loading/error states appropriately

### Common Patterns

1. Class Card Creation:
```javascript
// Example from script.js
function createClassCard(data) {
    const spotsLeft = data.maxCapacity - data.registrations;
    const isFull = spotsLeft <= 0;
    // ... card creation logic
}
```

2. Form Submission Pattern:
```javascript
// Standard form submission with loading state
submitBtn.textContent = 'Processing...';
submitBtn.disabled = true;
try {
    const response = await fetch(endpoint, {...});
    // ... handle response
} finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
}
```

## Project-Specific Conventions

1. Mobile Navigation:
   - All pages use common header with mobile-responsive menu
   - Menu toggle button with `☰` symbol
   - Responsive breakpoint at 768px

2. Status Indicators:
   - Class capacity: Use `sold-out` class for full classes
   - Payment status: Use `paid`/`pending` classes for badges
   - Form validation: Required fields marked with `**`

3. Semantic Structure:
   - Sections wrapped in `<section class="section [specific]-section">`
   - Container pattern: `<div class="container">` for consistent margins
   - BEM-like naming for component classes

## Common Tasks

1. Adding a new page:
   - Copy header/footer from existing page
   - Include required CSS: `style.css` + Roboto font
   - Add link to main navigation in all pages

2. Adding admin features:
   - Update both `admin.css` and `admin.js`
   - Follow existing dashboard card/table patterns
   - Include loading states and error handling