import { randomBytes } from 'node:crypto'

type AuthEnvironment = Record<string, string | undefined>

export interface AuthConfiguration {
  secret: string
  baseURL: string
  trustedOrigins: string[]
  defaultCookieAttributes: {
    httpOnly: true
    sameSite: 'lax'
    secure: boolean
  }
}

function parseOrigin(value: string, label: string, production: boolean): string {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} must be a valid absolute URL origin`)
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.hostname.includes('*') ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${label} must contain only an HTTP(S) origin`)
  }

  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (production && (url.protocol !== 'https:' || isLoopback)) {
    throw new Error(`${label} must use HTTPS and cannot target localhost in production`)
  }
  if (url.protocol === 'http:' && !isLoopback) {
    throw new Error(`${label} may use HTTP only for local development origins`)
  }

  return url.origin
}

function getBaseURL(env: AuthEnvironment, productionRuntime: boolean): string {
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL
  const configured = env.BETTER_AUTH_URL ||
    (vercelHost ? `https://${vercelHost}` : undefined) ||
    env.V0_RUNTIME_URL

  if (!configured) {
    if (productionRuntime) {
      throw new Error('BETTER_AUTH_URL or a Vercel deployment URL is required in production')
    }
    return 'http://localhost:3000'
  }

  return parseOrigin(configured, 'BETTER_AUTH_URL', productionRuntime)
}

export function resolveAuthConfiguration(
  env: AuthEnvironment,
  generateSecret: () => string = () => randomBytes(32).toString('base64url')
): AuthConfiguration {
  const buildPhase = env.NEXT_PHASE === 'phase-production-build'
  const productionRuntime = env.NODE_ENV !== 'development' && !buildPhase
  const suppliedSecret = env.BETTER_AUTH_SECRET?.trim()
  let secret = suppliedSecret

  if (secret && secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters')
  }
  if (!secret) {
    if (productionRuntime) {
      throw new Error('BETTER_AUTH_SECRET is required in production')
    }
    secret = generateSecret()
  }

  const baseURL = getBaseURL(env, productionRuntime)
  const configuredOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS
  const extraOrigins = configuredOrigins === undefined
    ? []
    : configuredOrigins.split(',').map((origin) => {
        const trimmedOrigin = origin.trim()
        if (!trimmedOrigin) {
          throw new Error('BETTER_AUTH_TRUSTED_ORIGINS cannot contain empty entries')
        }
        return parseOrigin(trimmedOrigin, 'BETTER_AUTH_TRUSTED_ORIGINS entry', productionRuntime)
      })

  const trustedOrigins = new Set([baseURL, ...extraOrigins])
  if (!productionRuntime) {
    trustedOrigins.add('http://localhost:3000')
    trustedOrigins.add('http://localhost:3001')
  }

  return {
    secret,
    baseURL,
    trustedOrigins: [...trustedOrigins],
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: productionRuntime,
    },
  }
}