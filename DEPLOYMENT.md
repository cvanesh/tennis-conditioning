# Tennis Conditioning Pro - Deployment Guide

## GitHub Pages Deployment Instructions

### Prerequisites
- GitHub account
- Git installed on your machine
- Repository at `https://github.com/cvanesh/tennis-conditioning`

### Deployment Steps

#### 1. Initialize Git Repository (if not already done)
```bash
cd /Users/sivaneshmanjinisengodan/code/tennis-conditioning
git init
```

#### 2. Add Remote Repository
```bash
git remote add origin https://github.com/cvanesh/tennis-conditioning.git
```

#### 3. Add All Files to Git
```bash
git add .
```

#### 4. Commit Changes
```bash
git commit -m "Initial commit - Tennis Conditioning Pro PWA

- Complete 8-week tennis conditioning program
- 215+ exercises with video links
- Progressive Web App with offline support
- Professional UI with dark mode support
- Workout tracking and progress monitoring
- Custom workout builder
- Exercise library with search and filters"
```

#### 5. Push to GitHub
```bash
git push -u origin main
```

If your default branch is `master` instead of `main`:
```bash
git branch -M main
git push -u origin main
```

#### 6. Enable GitHub Pages
1. Go to your repository on GitHub: `https://github.com/cvanesh/tennis-conditioning`
2. Click on **Settings** tab
3. Scroll down to **Pages** section (left sidebar)
4. Under **Source**, select **main** branch
5. Keep the folder as **/ (root)**
6. Click **Save**

#### 7. Access Your App
After a few minutes, your app will be available at:
**https://cvanesh.github.io/tennis-conditioning/**

---

## Configuration Summary

### Paths Updated for GitHub Pages
All paths have been configured to work with subdirectory deployment:

#### Service Worker Registration (js/app.js)
```javascript
navigator.serviceWorker.register('./sw.js')
```

#### Manifest (manifest.json)
```json
{
  "start_url": "./index.html",
  "scope": "./"
}
```

#### Service Worker Cache (sw.js)
```javascript
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/timer.js',
  './js/storage.js',
  './js/data.js',
  './manifest.json'
];
```

---

## Production Optimizations

### ✅ Code Cleanup
- Removed debug `console.log()` statements
- Kept `console.error()` for production error tracking
- Removed unnecessary comments

### ✅ Security
- Added `rel="noopener noreferrer"` to all external links
- Implemented Content Security Policy headers
- Service Worker only runs on HTTPS

### ✅ Performance
- PWA with offline caching
- Service Worker network-first strategy
- Optimized asset loading
- Lazy loading where applicable

### ✅ Accessibility
- Fixed viewport to allow zoom (WCAG requirement)
- ARIA labels on interactive elements
- Professional touch targets (44px minimum)
- Keyboard navigation support

### ✅ User Experience
- Custom confirmation modals (no primitive popups)
- Professional card designs
- Smooth animations with cubic-bezier easing
- Auto-expand next exercise on completion
- Automatic session management

---

## File Structure

```
tennis-conditioning/
├── index.html              # Main app entry point
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── app.js              # Main application logic
│   ├── data.js             # Exercise database
│   ├── storage.js          # LocalStorage management
│   └── timer.js            # Timer functionality
├── README.md               # Project documentation
└── .gitignore              # Git ignore rules
```

---

## Testing Checklist

### Before Deployment
- [x] Test on desktop browser
- [x] Test on mobile browser (iOS Safari)
- [x] Test on mobile browser (Android Chrome)
- [x] Verify service worker registration
- [x] Test offline functionality
- [x] Verify all exercise data loads correctly
- [x] Test workout tracking and progress
- [x] Test custom workout builder
- [x] Verify reset functionality
- [x] Test modal dialogs
- [x] Verify theme switching

### After Deployment
- [ ] Verify app loads at https://cvanesh.github.io/tennis-conditioning/
- [ ] Test PWA installation
- [ ] Verify service worker caching
- [ ] Test offline mode
- [ ] Verify all navigation works correctly
- [ ] Check browser console for errors

---

## Troubleshooting

### App doesn't load on GitHub Pages
1. Check that GitHub Pages is enabled in repository settings
2. Verify branch is set to `main` and folder to `/` (root)
3. Wait 2-5 minutes for deployment
4. Clear browser cache and reload

### Service Worker not registering
1. Ensure you're accessing via HTTPS
2. Check browser console for errors
3. Verify `sw.js` is in the root directory
4. Check that paths in `sw.js` are relative

### Manifest not working
1. Verify `manifest.json` is in root directory
2. Check that `<link rel="manifest">` exists in `index.html`
3. Use Chrome DevTools > Application > Manifest to debug

---

## Updates and Maintenance

### Updating Content
1. Make changes to files locally
2. Test thoroughly
3. Commit changes: `git commit -am "Description of changes"`
4. Push to GitHub: `git push`
5. GitHub Pages will auto-deploy (2-5 minutes)

### Updating Service Worker
When updating cached assets, increment the `CACHE_VERSION` in `sw.js`:
```javascript
const CACHE_VERSION = 'v1.0.1'; // Increment version
```

### Force Update on User Devices
Users will get updates automatically within 1 hour (next SW update check).
To force immediate update, they can:
1. Close all tabs with the app
2. Reopen the app
3. Service worker will update on next visit

---

## Support

For issues or questions:
- Check browser console for error messages
- Verify all files are present in the repository
- Ensure GitHub Pages is properly configured
- Test in incognito/private browsing mode to rule out cache issues

---

## License

This project is open source and available for personal and educational use.

---

*Last Updated: January 18, 2026*
*Version: 1.0.0*
