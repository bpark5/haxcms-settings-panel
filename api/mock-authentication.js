export default function handler(request, res) {
  const { password } = request.body;

  if (password === "demo123") {
    return res.status(200).json({
      success: true,
      authorized: true,
      message: "Authentication successful."
    });
  }

  return res.status(401).json({
    success: false,
    authorized: false,
    message: "Incorrect password. Please try again."
  });
}