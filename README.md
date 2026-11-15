# Divyastra

A fast-paced 2.5D battle royale game with 8 elemental spells, distinct blocky wizards, dynamic shrinking storm zones, and procedural biomes.

## Deployment Guide

### GitHub Pages (Automated via GitHub Actions)
1. In your GitHub repository, navigate to **Settings** > **Pages**.
2. Under **Build and deployment**, change the **Source** dropdown to **GitHub Actions**.
3. Push to `main` branch to trigger the `.github/workflows/deploy.yml` workflow.
4. Your game will be published at:
   ```
   https://<username>.github.io/<repository>/
   ```

### Netlify Alternative
To deploy manually on Netlify:
- **Base directory**: `divyastra`
- **Build command**: `npm run build`
- **Publish directory**: `divyastra/dist`

## Local Development
```bash
cd divyastra
npm install
npm run dev
```
Build static assets:
```bash
npm run build
```

