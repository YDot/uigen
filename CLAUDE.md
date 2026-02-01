# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup          # Install deps, generate Prisma client, run migrations
npm run dev            # Start Next.js dev server with Turbopack (localhost:3000)
npm run build          # Build for production
npm run test           # Run Vitest test suite
npm run test -- path/to/file.test.ts  # Run single test file
npm run lint           # Run ESLint
npm run db:reset       # Reset database with --force flag
```

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat interface, Claude generates them via tool calls, and a live preview renders the result in an iframe.

### Core Flow

1. User sends message → `src/app/api/chat/route.ts` streams Claude response
2. Claude uses `str_replace_editor` and `file_manager` tools to manipulate files
3. `VirtualFileSystem` (in-memory) stores all generated files
4. Preview iframe transforms JSX with Babel and renders using import maps

### Key Abstractions

**VirtualFileSystem** (`src/lib/file-system.ts`): In-memory file system that stores all generated code. Serializable for database persistence. Used by both AI tools and frontend.

**AI Tools** (`src/lib/tools/`):
- `str_replace_editor`: view, create, str_replace, insert operations on files
- `file_manager`: rename and delete operations

**Contexts** (`src/lib/contexts/`):
- `FileSystemProvider`: Manages VFS state and syncs UI
- `ChatProvider`: Wraps Vercel AI SDK's useChat, handles tool call results

**Preview System** (`src/lib/transform/jsx-transformer.ts`, `src/components/preview/`):
- Transforms JSX using Babel standalone
- Generates import maps with blob URLs for each virtual file
- Renders in sandboxed iframe with Tailwind CDN

### File Conventions

- Entry point for generated apps is always `/App.jsx`
- Virtual FS uses `@/` import alias for non-library imports
- All generated files use JSX (not TypeScript)
- No HTML files are generated; App.jsx is the root

### Authentication

JWT-based sessions stored in HttpOnly cookies (7-day expiry). Projects can be anonymous or user-owned. Auth utilities in `src/lib/auth.ts`, middleware protects API routes.

### Database

SQLite with Prisma. Schema defined in `prisma/schema.prisma` - reference it to understand the structure of data stored in the database. User and Project models; messages/file data stored as JSON strings.

## Code Style

Use comments sparingly. Only comment complex code.
