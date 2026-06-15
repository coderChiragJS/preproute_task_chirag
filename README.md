# Test Management Application

A test management platform built with React, TypeScript, and Vite. Allows admins to create, manage, and publish tests with MCQ questions.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (dev server + build)
- **React Router v6** (client-side routing)
- **React Hook Form** + **Zod** (form validation)
- **Zustand** (state management)
- **Axios** (API client with JWT interceptor)
- **Tailwind CSS v4**
- **Vitest** (integration + unit tests)

## Pages

| Route | Page |
|---|---|
| `/login` | Login |
| `/dashboard` | Test list with search, stats, and CRUD actions |
| `/tests/create` | Create test modal |
| `/tests/:id/edit` | Edit test modal |
| `/tests/:id/questions` | Add/edit MCQ questions |
| `/tests/:id/preview` | Preview and publish |

## Getting Started

```bash
npm install
npm run dev
```

## Running Tests

```bash
npm test
```

Tests run against the live staging API and cover auth, master data, test CRUD, question creation, publishing, and deletion.

## Build

```bash
npm run build
```
