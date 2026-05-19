default:
    @just --list

# Run the test suite (unit only; integration is env-gated and skipped)
test:
    npm test

# Run the real-model integration suite (downloads ~560 MB on first run)
integration:
    npm run test:integration

# Lint (biome check + tsc typecheck)
lint:
    npm run lint
    npm run typecheck

# Auto-fix formatting and lint where possible
fmt:
    npm run fmt

# Build and serve docs locally (assumes `npm ci` has already run in docs/)
docs:
    cd docs && [ -d node_modules ] || npm install
    cd docs && npm run dev

# Build distribution
build:
    npm run build

# Pre-publish smoke check (run before tagging a release)
release-preflight:
    just lint
    just test
    just build

# Remove build artifacts and caches
clean:
    rm -rf dist node_modules docs/node_modules docs/.astro docs/dist coverage
