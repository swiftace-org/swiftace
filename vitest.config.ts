import { defineConfig } from "vite-plus"

// Unit tests exercise server handlers with mocked services, without Start's RPC transforms.
export default defineConfig({ resolve: { tsconfigPaths: true } })
