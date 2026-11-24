# Simple Calculator

A clean, tactile everyday calculator built with vanilla HTML, CSS, and ES Modules — zero build dependencies, instant load times, and hosted on Cloudflare Workers.

**Live Demo:** https://simple-calculator.kim31naz.workers.dev

## Features

- Standard everyday operations (`+`, `−`, `×`, `÷`, `%`, `±`, backspace, smart `C` / `AC`)
- Floating-point precision handling (`0.1 + 0.2 = 0.3`) and graceful divide-by-zero recovery
- Full keyboard support (`0–9`, `.`, `+ - * /`, `%`, `Enter`, `Backspace`, `Esc`, `H` for history)
- Light and dark themes (persisted in `localStorage`)
- Collapsible recent calculation history with click-to-recall
- Click the display to copy the current result

## Local Development

```bash
npm run dev
```

Open `http://localhost:4173` in your browser.

## Run Tests

```bash
npm test
```
