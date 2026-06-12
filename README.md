# Match Framer

Match Framer is a local desktop app for creating dodgeball match announcement thumbnails. It runs as an Electron app with an Angular UI, stores clubs and templates locally, and exports PNG thumbnails with Sharp.

## Features

- Manage clubs with names and logos
- Manage thumbnail templates with custom backgrounds
- Visually position logos, club names, and division text with a Fabric.js editor
- Generate previews and export high-quality PNG thumbnails

## Requirements

- Node.js 20+ (LTS recommended)
- npm

## Development

Install dependencies:

```bash
npm install
```

Run the app in development mode (starts Angular and Electron together):

```bash
npm run electron:dev
```

This will:

1. Build the Electron main and preload scripts into `dist-electron/`
2. Start the Angular dev server on `http://localhost:4200`
3. Launch Electron and load the dev server

## Data storage

All app data is stored locally under the Electron user data path:

```text
{userData}/match-framer-data/
├── clubs/
│   ├── clubs.json
│   └── logos/
├── templates/
│   ├── templates.json
│   └── backgrounds/
└── generated/
```

On macOS, this is typically:

```text
~/Library/Application Support/match-framer/match-framer-data/
```

## Scripts

- `npm run start` — Angular dev server only
- `npm run build:electron` — Build Electron main/preload
- `npm run electron:dev` — Run full desktop app in development
- `npm run build` — Production Angular build

## Division text format

Exported thumbnails render division text as:

```text
{Template Name} · MEN
{Template Name} · WOMEN
{Template Name} · MIXED
```

## Notes

- SVG logos are rasterized to PNG on import
- The template editor uses placeholder text and boxes; real club data is applied only during thumbnail generation
- Packaging for distribution is not included in v1
