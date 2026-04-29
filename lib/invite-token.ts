import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.CLIENT_JWT_SECRET ?? 'emozi-client-jwt-secret-change-in-production-min32'
)

export const INVITE_TTL_DAYS = 7

export async function signInviteToken(payload: {
  userId: string
  clientId: string
  email: string
}) {
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
  const token = await new SignJWT({
    userId: payload.userId,
    clientId: payload.clientId,
    email: payload.email,
    type: 'invite',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${INVITE_TTL_DAYS}d`)
    .sign(JWT_SECRET)

  return { token, expiresAt }
}
