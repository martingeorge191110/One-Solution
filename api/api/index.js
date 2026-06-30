// Vercel serverless function entry. Loads the compiled Nest handler from dist/
// (built by `nest build` during the Vercel buildCommand). Kept as plain JS so
// Vercel's file tracer reliably bundles dist/ + node_modules (incl. the Prisma
// query engine) instead of re-transpiling the whole Nest source graph.
module.exports = require('../dist/src/serverless').default;
