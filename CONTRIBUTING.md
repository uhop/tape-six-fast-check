# Contributing to tape-six-fast-check

Thank you for your interest in contributing!

## Getting started

```bash
git clone https://github.com/uhop/tape-six-fast-check.git
cd tape-six-fast-check
npm install
```

There is no build step and there are no submodules.

## Development workflow

1. Make your changes.
2. Format: `npm run lint:fix`
3. Test: `npm test`
4. Type-check: `npm run ts-check`

## Code style

- ES modules (`import`/`export`), no CommonJS in source.
- Formatted with Prettier — run `npm run lint:fix` before committing.
- No runtime dependencies — `tape-six` and `fast-check` stay peer dependencies.
- Never parse fast-check's report/message text — use `fc.check()` run details.
- Keep `index.js` and `index.d.ts` in sync.

## License

This project is distributed under the [BSD-3-Clause license](./LICENSE).
External contributions are accepted only under licenses compatible with
BSD-3-Clause; submissions under fundamentally incompatible licenses cannot
be merged.

## AI agents

If you are an AI coding agent, see [AGENTS.md](./AGENTS.md) for detailed project conventions, commands, and architecture.
