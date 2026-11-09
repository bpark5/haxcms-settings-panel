import { mockAuthorization } from "../lib/mock-reauthentication.mjs";

// Compatibility adapter. The local page uses /mock-authentication in the same
// process as saves. Separate API processes require matching environment keys.
export default function handler(request, res) {
  res.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Use POST." });
  }
  try {
    return res.status(200).json(mockAuthorization.issueForRequest(request.headers, request.body));
  } catch (error) {
    if (error.retryAfterSeconds) res.setHeader("Retry-After", String(error.retryAfterSeconds));
    return res.status(error.status || 500).json({ success: false,
      code: error.status ? error.code : undefined,
      retryAfterSeconds: error.retryAfterSeconds,
      message: error.status ? error.message : "Unable to authenticate." });
  }
}
