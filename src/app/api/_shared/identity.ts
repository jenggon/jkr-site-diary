export function extractIdentity(request: Request): string | null {
  const userId = request.headers.get('x-user-id');
  if (userId && userId.trim() !== '') {
    return userId.trim();
  }
  
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    // In the future, this is where JWT verification would occur.
    // For now, if there is a bearer token, we extract its value as a simple mock identity fallback.
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  return null;
}
