import { createVercelMockHandler } from "../lib/vercel-mock-api.mjs";

// Keep the earlier public URL on the same shared cooldown/store as new routes.
const handler = createVercelMockHandler();
export default (request, response) => handler(request, response, "authentication");
