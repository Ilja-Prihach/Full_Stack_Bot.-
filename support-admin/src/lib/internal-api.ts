type RouteError = {
  error: string;
  status: number;
};

function createRouteError(error: string, status: number): RouteError {
  return { error, status };
}

export function requireInternalApiToken(request: Request) {
  const expectedToken = process.env.INTERNAL_API_TOKEN;
  const providedToken = request.headers.get("x-internal-api-token");

  if (!expectedToken) {
    throw createRouteError("INTERNAL_API_TOKEN is not configured", 500);
  }

  if (!providedToken || providedToken !== expectedToken) {
    throw createRouteError("Недостаточно прав для доступа к internal API", 401);
  }
}
