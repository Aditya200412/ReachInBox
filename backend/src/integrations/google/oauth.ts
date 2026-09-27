import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { config } from '../../config/index.js';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export function setupGoogleOAuth() {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    logger.warn('Google OAuth credentials not configured — skipping OAuth setup');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          const email =
            profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

          if (!email) {
            return done(new Error('No email found in Google profile'));
          }

          // Find by googleId or email, then upsert
          let user = await prisma.user.findUnique({
            where: { googleId: profile.id },
          });

          if (!user) {
            user = await prisma.user.findUnique({ where: { email } });

            if (user) {
              // Link existing email user to Google
              user = await prisma.user.update({
                where: { email },
                data: {
                  googleId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value || user.avatarUrl,
                },
              });
            } else {
              user = await prisma.user.create({
                data: {
                  email,
                  googleId: profile.id,
                  name: profile.displayName || 'User',
                  avatarUrl: profile.photos?.[0]?.value || null,
                },
              });
            }
          }

          // Pass the db user to the callback handler
          // The actual user session/JWT is created in authController.googleCallback
          return done(null, user);
        } catch (error) {
          logger.error({ error }, 'Error in Google OAuth strategy');
          return done(error as Error);
        }
      }
    )
  );

  // We use JWT, not sessions — but Passport still needs these
  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
}
