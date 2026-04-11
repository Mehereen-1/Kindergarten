const trimTrailingSlash = (value?: string | null) => value?.trim().replace(/\/+$/, '') ?? '';

export function isAzureAppService() {
  return Boolean(process.env.WEBSITE_SITE_NAME || process.env.WEBSITE_HOSTNAME || process.env.WEBSITE_INSTANCE_ID);
}

export function isLoopbackUrl(value: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|::1)(?::\d+)?(?:\/|$)/i.test(value);
}

export function getServerAppUrl() {
  const explicit = trimTrailingSlash(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '');
  if (explicit) {
    return explicit;
  }

  const azureHostname = process.env.WEBSITE_HOSTNAME?.trim();
  if (azureHostname) {
    return `https://${azureHostname}`;
  }

  return 'http://localhost:3000';
}

export function getServerCctvBackendUrl() {
  return (
    trimTrailingSlash(process.env.PYTHON_BACKEND_URL || '') ||
    trimTrailingSlash(process.env.NEXT_PUBLIC_CCTV_BACKEND_URL || '') ||
    trimTrailingSlash(process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || '') ||
    'http://localhost:8000'
  );
}

export function getSecurityAlertServiceUrl() {
  return trimTrailingSlash(process.env.ANOMALY_SERVICE_URL || '') || 'http://127.0.0.1:8010';
}

export function shouldAutoStartSecurityAlertService() {
  const explicit = process.env.ANOMALY_SERVICE_AUTO_START?.trim();
  if (explicit) {
    return /^(1|true|yes|on)$/i.test(explicit);
  }

  return !isAzureAppService() && isLoopbackUrl(getSecurityAlertServiceUrl());
}
