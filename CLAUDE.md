# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Create production build
- `pnpm preview` - Preview production build
- `pnpm check` - Run svelte-check with TypeScript validation
- `pnpm check:watch` - Run svelte-check in watch mode
- `pnpm lint` - Run prettier check and ESLint
- `pnpm format` - Format code with prettier

## Project Architecture

This is a SvelteKit 5 project using:

- **Framework**: SvelteKit with Svelte 5 (uses new runes syntax like `$props()`)
- Design: Skeleton.dev with tailwind
- **Package Manager**: pnpm (note: uses pnpm, not npm)
- **TypeScript**: Fully configured with strict mode
- **Build Tool**: Vite
- **Adapter**: @sveltejs/adapter-auto for deployment

### Project Structure

- `src/routes/` - SvelteKit file-based routing
- `src/lib/` - Shared utilities and components (accessible via `$lib` alias)
- `src/app.html` - HTML template
- `static/` - Static assets

### Code Style & Linting

- ESLint with TypeScript and Svelte plugins
- Prettier for formatting
- Configuration uses modern ES modules and includes gitignore integration
- TypeScript strict mode enabled with bundler module resolution

## Key Configuration Files

- `svelte.config.js` - SvelteKit configuration with vitePreprocess
- `vite.config.ts` - Vite configuration with SvelteKit plugin
- `eslint.config.js` - Modern flat config with TypeScript and Svelte support
- `tsconfig.json` - Extends SvelteKit's generated TypeScript config
