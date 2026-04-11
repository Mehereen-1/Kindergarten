const trimTrailingSlash = (value?: string | null) => value?.trim().replace(/\/+$/, '') ?? '';

export function getClientSocketUrl() {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_SOCKET_URL || '');
}

export function getClientCctvBackendUrl() {
  return (
    trimTrailingSlash(process.env.NEXT_PUBLIC_CCTV_BACKEND_URL || '') ||
    trimTrailingSlash(process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || '') ||
    'http://localhost:8000'
  );
}
