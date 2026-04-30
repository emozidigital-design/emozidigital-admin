import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-server';

export const clientAuthOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'client-credentials',
      name: 'Client Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: user } = await supabaseAdmin
          .from('client_users')
          .select('*, clients(id, brand_name, section_c)')
          .eq('email', credentials.email)
          .eq('is_active', true)
          .single();

        if (!user || !user.password_hash) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        // Update last login
        await supabaseAdmin
          .from('client_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,                    // 'admin' | 'editor' | 'viewer'
          clientId: user.client_id,
          brandName: user.clients?.brand_name,
          brandColors: {
            primary: user.clients?.section_c?.color_primary || '#003434',
            accent: user.clients?.section_c?.color_accent || '#70BF4B',
          },
          portalType: 'client',               // distinguish from admin session
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // @ts-ignore
        token.role = user.role;
        // @ts-ignore
        token.clientId = user.clientId;
        // @ts-ignore
        token.brandName = user.brandName;
        // @ts-ignore
        token.brandColors = user.brandColors;
        // @ts-ignore
        token.portalType = user.portalType;
      }
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.user.role = token.role;
      // @ts-ignore
      session.user.clientId = token.clientId;
      // @ts-ignore
      session.user.brandName = token.brandName;
      // @ts-ignore
      session.user.brandColors = token.brandColors;
      // @ts-ignore
      session.user.portalType = token.portalType;
      return session;
    },
  },
  pages: {
    signIn: '/client/login',
    error: '/client/login',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
};
