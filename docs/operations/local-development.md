# Local Development

1. Copy `.env.example` to `.env` if you need overrides.
2. Start local infrastructure with `docker compose up -d`.
3. Install dependencies with `pnpm install`.
4. Build the monorepo with `pnpm build`.
5. Start the desired app or service with `pnpm --filter <workspace> dev`.

