// config/passport.js
// Configures Passport's Google OAuth 2.0 strategy.
// We use Passport ONLY for the OAuth handshake; sessions are disabled because
// the rest of the API is JWT-cookie based. The strategy's verify callback
// just normalizes Google's profile - actual user upsert happens in auth.service.

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import env from './env.js';

if (env.GOOGLE_OAUTH_ENABLED) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      // We don't touch the DB here - the controller picks up `profile` via
      // req.user after Passport resolves and does the upsert. Keeping this
      // callback pure makes it easy to unit-test the auth service in isolation.
      (_accessToken, _refreshToken, profile, done) => done(null, profile),
    ),
  );
}

export default passport;
