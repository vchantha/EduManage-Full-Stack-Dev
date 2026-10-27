# Google and Microsoft sign-in

The buttons use server-side OpenID Connect authorization-code flow with PKCE, state,
nonce, and signed ID-token verification. They sign into EduManage using an existing
active Django staff account. They never create accounts or grant administrator access.
Logging out ends the EduManage session, not the user's entire Google/Microsoft session.

## 1. Register the school applications

For local Docker use, open EduManage at **http://localhost:3000** consistently.
Register these exact redirect URIs (no trailing slash):

| Provider | Web application redirect URI |
| --- | --- |
| Google | `http://localhost:3000/api/auth/sso/google/callback` |
| Microsoft | `http://localhost:3000/api/auth/sso/microsoft/callback` |

Google: register an OAuth web application, configure the consent screen, and allow
the school/test users as required by the application's publishing status.
Microsoft: register a confidential Web application for your school's single tenant.
Use its Application (client) ID, client secret **value**, and Directory (tenant) ID.
The Microsoft tenant must be a UUID; common/organizations/personal-account endpoints
are deliberately unsupported. Only openid/profile/email scopes are requested.

Provider instructions:
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Microsoft authorization-code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)

## 2. Save credentials locally

Edit the ignored `.env` file in the repository. Use the variable names from
`.env.example`. Do not commit this file or paste secrets into chat.

```dotenv
EDUMANAGE_PUBLIC_ORIGIN=http://localhost:3000
EDUMANAGE_GOOGLE_CLIENT_ID=your-web-client-id
EDUMANAGE_GOOGLE_CLIENT_SECRET=your-client-secret
EDUMANAGE_GOOGLE_SUBJECTS='{}'
EDUMANAGE_MICROSOFT_CLIENT_ID=your-application-client-id
EDUMANAGE_MICROSOFT_CLIENT_SECRET=your-client-secret-value
EDUMANAGE_MICROSOFT_TENANT_ID=your-directory-tenant-uuid
EDUMANAGE_MICROSOFT_SUBJECTS='{}'
```

Restart the backend after environment changes:

```powershell
docker compose -f compose.yaml -f compose.local.yaml up -d --force-recreate backend
```

For hosting, set PUBLIC_ORIGIN to the exact HTTPS origin, register HTTPS callbacks,
configure allowed hosts/CSRF trusted origins, and enable secure Django cookies.
Never derive the callback origin from an untrusted request header. Keep access logs
free of query strings because callbacks contain one-time authorization codes.

## 3. Enable the buttons in General Settings

Sign in with an existing staff account. If there is no first administrator, create
your own interactively using the command documented in DOCKER-LOCAL.md.
Open **Settings > General > Login & Logout**. Server-configured providers show
**Ready to enable**. Turn on **Continue with Google** and/or **Continue with Microsoft**,
then select **Save Changes**. Password sign-in stays enabled for recovery.

## 4. Link the provider identity

An enabled provider can verify an account before it has permission to enter EduManage.
Sign out and use Continue with Google/Microsoft. If the verified provider account is
not linked, the login page displays its public **account ID** for the school administrator.
That ID is the verified ID-token `sub` claim for this application. It is not a token,
password, email, or Microsoft directory object ID. Only share it with your administrator.

After independently checking the person's identity and existing staff username, the
server administrator adds the mapping to the appropriate `.env` variable:

```dotenv
EDUMANAGE_GOOGLE_SUBJECTS='{"verified-google-subject":"existing-staff-username"}'
EDUMANAGE_MICROSOFT_SUBJECTS='{"verified-microsoft-subject":"existing-staff-username"}'
```

Recreate the backend again, then retry provider sign-in. The exact subject must match;
matching emails alone never link an account. Subject IDs may be application-specific;
review links when changing client registrations. Removing a mapping prevents future
provider sign-ins; end any existing sessions separately from Session & Security.

## Validation and remaining activation

Automated tests use a local mock provider, real RSA-signed ID tokens, and a temporary
test database. No live administrator or provider registrations are created by testing.
Live consent, account linking and end-to-end school-provider sign-in require the
school's registered apps and credentials. Saving credentials alone reports server
configuration readiness, not proof that the provider has accepted the registration.
