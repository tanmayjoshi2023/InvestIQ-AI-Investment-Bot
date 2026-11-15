import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveAuthConfiguration } from '../lib/auth-config'

const validProductionEnvironment = {
  NODE_ENV: 'production',
  BETTER_AUTH_URL: 'https://investiq.example',
  BETTER_AUTH_SECRET: 'test-secret-with-at-least-thirty-two-characters',
}

test('production auth rejects a missing secret', () => {
  const environment: Record<string, string | undefined> = { ...validProductionEnvironment }
  delete environment.BETTER_AUTH_SECRET
  assert.throws(
    () => resolveAuthConfiguration(environment, () => 'generated-test-secret'),
    /BETTER_AUTH_SECRET is required in production/
  )
})

test('production auth rejects a weak secret', () => {
  assert.throws(
    () => resolveAuthConfiguration({ ...validProductionEnvironment, BETTER_AUTH_SECRET: 'short' }),
    /at least 32 characters/
  )
})

test('production auth rejects insecure or malformed origins', () => {
  assert.throws(
    () => resolveAuthConfiguration({ ...validProductionEnvironment, BETTER_AUTH_URL: 'http://investiq.example' }),
    /must use HTTPS/
  )
  assert.throws(
    () => resolveAuthConfiguration({
      ...validProductionEnvironment,
      BETTER_AUTH_TRUSTED_ORIGINS: 'https://*.vercel.app',
    }),
    /must contain only an HTTP\(S\) origin/
  )
})

test('production configuration uses secure cookies and only explicit origins', () => {
  const config = resolveAuthConfiguration({
    ...validProductionEnvironment,
    BETTER_AUTH_TRUSTED_ORIGINS: 'https://preview.investiq.example',
  })

  assert.deepEqual(config.trustedOrigins, [
    'https://investiq.example',
    'https://preview.investiq.example',
  ])
  assert.deepEqual(config.defaultCookieAttributes, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
  })
})

test('build and development secrets are generated ephemerally, not hard-coded', () => {
  const generated = 'random-build-secret-which-is-at-least-32-chars'
  const buildConfig = resolveAuthConfiguration({
    NODE_ENV: 'production',
    NEXT_PHASE: 'phase-production-build',
  }, () => generated)
  const developmentConfig = resolveAuthConfiguration({ NODE_ENV: 'development' }, () => generated)

  assert.equal(buildConfig.secret, generated)
  assert.equal(buildConfig.baseURL, 'http://localhost:3000')
  assert.equal(developmentConfig.secret, generated)
  assert.equal(developmentConfig.defaultCookieAttributes.secure, false)
})

test('production auth requires a deployment base URL when no platform URL exists', () => {
  assert.throws(
    () => resolveAuthConfiguration({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: validProductionEnvironment.BETTER_AUTH_SECRET,
    }),
    /BETTER_AUTH_URL or a Vercel deployment URL is required/
  )
})

test('runtime auth rejects a missing secret when NODE_ENV is unset', () => {
  assert.throws(
    () => resolveAuthConfiguration({ BETTER_AUTH_URL: 'https://investiq.example' }),
    /BETTER_AUTH_SECRET is required in production/
  )
})