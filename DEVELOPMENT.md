# Development Guide

This guide will help you modify and test your own version of Frappe Gantt.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Library
```bash
# One-time build
npm run build

# Watch mode (auto-rebuild on changes)
npm run build-dev
```

### 3. Test Your Changes

**Option A: Using Built Files (Recommended for production-like testing)**
- Open `test.html` in your browser after building
- Or serve it: `python3 -m http.server 8000` then visit `http://localhost:8000/test.html`

**Option B: Direct Source Import (Faster for development)**
- Serve via HTTP: `python3 -m http.server 8000`
- Open `http://localhost:8000/test-direct.html`
- No build step needed - changes reflect immediately!

## Project Structure

```
gantt-persian/
├── src/                    # Source code (modify here!)
│   ├── index.js           # Main Gantt class
│   ├── bar.js             # Task bar rendering
│   ├── arrow.js           # Dependency arrows
│   ├── date_utils.js      # Date utilities
│   ├── popup.js           # Popup functionality
│   ├── defaults.js        # Default configurations
│   ├── svg_utils.js       # SVG helper functions
│   └── styles/            # CSS files
│       ├── gantt.css      # Main stylesheet
│       ├── dark.css       # Dark theme
│       └── light.css      # Light theme
├── dist/                   # Built output (generated)
├── builder/               # Demo files
├── test.html              # Test page using built files
├── test-direct.html       # Test page using source directly
└── package.json           # Dependencies and scripts
```

## Where to Make Changes

### Modify Behavior
- **Main logic**: `src/index.js`
- **Task bars**: `src/bar.js`
- **Dependencies**: `src/arrow.js`
- **Date handling**: `src/date_utils.js`
- **Popup**: `src/popup.js`
- **Defaults**: `src/defaults.js`

### Modify Styles
- **Main styles**: `src/styles/gantt.css`
- **Themes**: `src/styles/dark.css`, `src/styles/light.css`

## Development Workflow

### Recommended Workflow

1. **Start watch mode** (in one terminal):
   ```bash
   npm run build-dev
   ```

2. **Serve test file** (in another terminal):
   ```bash
   python3 -m http.server 8000
   ```

3. **Open browser**:
   - Built version: `http://localhost:8000/test.html`
   - Direct source: `http://localhost:8000/test-direct.html`

4. **Make changes** in `src/` directory

5. **Refresh browser** to see changes

### Alternative: Direct Source Development

For fastest iteration, use `test-direct.html`:
- No build step required
- Changes reflect immediately
- Must serve via HTTP (ES modules requirement)

## Available Scripts

```bash
npm run build          # Build once
npm run build-dev      # Build and watch for changes
npm run dev            # Start Vite dev server
npm run lint           # Lint code
npm run prettier       # Format code
npm run prettier-check # Check code formatting
```

## Build Output

After building, `dist/` contains:
- `frappe-gantt.umd.js` - UMD format (works in browsers)
- `frappe-gantt.es.js` - ES module format
- `frappe-gantt.css` - Stylesheet

## Testing Your Changes

### Basic Test
```javascript
const tasks = [
    {
        id: '1',
        name: 'Test Task',
        start: '2024-01-01',
        end: '2024-01-10',
        progress: 50
    }
];

const gantt = new Gantt('#gantt', tasks);
```

### Advanced Test
See `test.html` for examples with:
- Multiple tasks
- Dependencies
- View mode switching
- Task updates
- API methods

## Tips

1. **Use watch mode** (`npm run build-dev`) for continuous development
2. **Use direct source** (`test-direct.html`) for fastest iteration
3. **Check browser console** for errors
4. **Test in multiple browsers** if needed
5. **Use version control** to track your changes

## Common Modifications

### Change Default Colors
Edit `src/styles/gantt.css`:
```css
.bar-wrapper .bar {
    fill: #your-color;
}
```

### Add Custom View Mode
Edit `src/defaults.js` and add to `DEFAULT_VIEW_MODES` array.

### Modify Task Bar Behavior
Edit `src/bar.js` - this handles rendering and interactions.

### Change Date Formatting
Edit `src/date_utils.js` - this handles all date operations.

## Troubleshooting

**Build fails?**
- Check Node.js version (should be 14+)
- Delete `node_modules` and `dist`, then `npm install` again

**Changes not showing?**
- Make sure you're running `build-dev` or rebuilding
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors

**ES modules error?**
- Make sure you're serving via HTTP, not opening file://
- Use `python3 -m http.server` or similar

## Next Steps

1. Make your modifications in `src/`
2. Test using `test.html` or `test-direct.html`
3. Build when ready: `npm run build`
4. Use `dist/` files in your project

Happy coding! 🚀

