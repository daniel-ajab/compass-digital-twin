# COMPASS Digital Twin

Production-style React + TypeScript port of the COMPASS 3D decision-support viewer. All models run in the browser; patient data loads from `src/data/patients.json` with optional `localStorage` persistence.

**Repository:** [github.com/Urology-AI/digital-twin](https://github.com/Urology-AI/digital-twin)

## Clone

```bash
git clone git@github.com:Urology-AI/digital-twin.git
cd digital-twin
```

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

## Data

- Primary catalog: `src/data/patients.json` — array of `{ id, name, record }` where `record` matches `_schema: "prostate-3d-input-v1"`.
- Import additional cases via **Import JSON** in the case workspace (same schema as the legacy “Export for 3D Model” parser).

## Stack

Vite, React 18, TypeScript (strict), Tailwind CSS, Radix-based UI primitives, Zustand, React Hook Form + Zod, Three.js (r170).

## Contributing

Work on a branch and open a pull request against `main`.
