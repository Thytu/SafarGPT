
/** @type {import('postcss').Config} */
export default {
  plugins: {
    /**
     * Tailwind v4 exposes its PostCSS integration through the
     * `@tailwindcss/postcss` package. Registering it this way avoids the
     * runtime error Vite just reported.
     */
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};