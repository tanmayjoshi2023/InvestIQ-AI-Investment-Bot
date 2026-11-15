import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { db } from './db'
import * as schema from './db/schema'
import { resolveAuthConfiguration } from './auth-config'

const authConfig = resolveAuthConfiguration(process.env)

export const auth = betterAuth({
  database: drizzleAdapter(db(), {
    provider: 'pg',
    schema,
  }),
  secret: authConfig.secret,
  baseURL: authConfig.baseURL,
  trustedOrigins: authConfig.trustedOrigins,
  advanced: {
    defaultCookieAttributes: authConfig.defaultCookieAttributes,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  plugins: [nextCookies()],
})
