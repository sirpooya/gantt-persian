# Quick Start Guide

## ✅ Setup Complete!

Your development environment is ready. Here's how to use it:

## 🚀 Start Development (3 Options)

### Option 1: Use the Helper Script (Easiest)
```bash
./start-dev.sh
```
This will:
- Start build watch mode
- Start HTTP server on port 8000
- Open test pages automatically

### Option 2: Manual Setup

**Terminal 1 - Build Watch:**
```bash
npm run build-dev
```

**Terminal 2 - HTTP Server:**
```bash
python3 -m http.server 8000
```

Then open:
- `http://localhost:8000/test.html` (uses built files)
- `http://localhost:8000/test-direct.html` (uses source directly, faster)

### Option 3: Direct Source (Fastest - No Build)
```bash
python3 -m http.server 8000
```
Then open: `http://localhost:8000/test-direct.html`

## 📝 Make Changes

1. Edit files in `src/` directory
2. If using build mode: changes auto-rebuild
3. Refresh browser to see changes

## 📁 Key Files

- `src/index.js` - Main Gantt class (start here!)
- `src/bar.js` - Task bars
- `src/styles/gantt.css` - Styles
- `test.html` - Test page
- `test-direct.html` - Fast test page

## 🎯 Next Steps

1. **Start the dev server**: `./start-dev.sh` or `npm run build-dev`
2. **Open test page**: `http://localhost:8000/test.html`
3. **Make changes** in `src/` directory
4. **Refresh browser** to see your changes!

## 📚 More Info

See `DEVELOPMENT.md` for detailed documentation.

Happy coding! 🎉

