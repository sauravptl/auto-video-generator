import http from 'http';
import { shell } from 'electron';
import axios from 'axios';
import { store } from '../../core/store';

export class MetaOAuth {
  private static readonly PORT = 54321;
  private static readonly REDIRECT_URI = `http://localhost:${MetaOAuth.PORT}/auth/callback`;

  public static async startLogin(): Promise<{ userAccessToken: string; expiresInDays: number }> {
    const appId = store.get('settings.metaAppId', '');
    const appSecret = store.get('settings.metaAppSecret', '');

    if (!appId || !appSecret) {
      throw new Error(
        'Meta App ID and App Secret are required. Please configure them in Settings or use the Direct Access Token input.'
      );
    }

    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish',
      'whatsapp_business_management',
      'whatsapp_business_messaging',
    ].join(',');

    const state = Math.random().toString(36).substring(2, 15);
    const authUrl = `https://www.facebook.com/v26.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      this.REDIRECT_URI
    )}&scope=${scopes}&response_type=code&state=${state}`;

    return new Promise((resolve, reject) => {
      let server: http.Server | null = null;

      const cleanup = () => {
        if (server) {
          server.close();
          server = null;
        }
      };

      // Set 5 minute timeout for user to complete login
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Meta authentication timed out after 5 minutes'));
      }, 5 * 60 * 1000);

      server = http.createServer(async (req, res) => {
        try {
          const url = new URL(req.url || '', `http://localhost:${MetaOAuth.PORT}`);

          if (url.pathname === '/auth/callback') {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error_description') || url.searchParams.get('error');

            if (error) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`<h1>Authentication Failed</h1><p>${error}</p>`);
              clearTimeout(timeout);
              cleanup();
              return reject(new Error(error));
            }

            if (!code) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end('<h1>No code returned from Meta</h1>');
              clearTimeout(timeout);
              cleanup();
              return reject(new Error('No code returned from Meta'));
            }

            // Exchange code for short-lived token
            const tokenRes = await axios.get('https://graph.facebook.com/v26.0/oauth/access_token', {
              params: {
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: MetaOAuth.REDIRECT_URI,
                code,
              },
            });

            const shortToken = tokenRes.data.access_token;

            // Exchange short-lived token for 60-day Long-Lived User Token
            const longTokenRes = await axios.get('https://graph.facebook.com/v26.0/oauth/access_token', {
              params: {
                grant_type: 'fb_exchange_token',
                client_id: appId,
                client_secret: appSecret,
                fb_exchange_token: shortToken,
              },
            });

            const longLivedToken = longTokenRes.data.access_token;
            const expiresInSeconds = longTokenRes.data.expires_in || 60 * 24 * 60 * 60;
            const expiresInDays = Math.floor(expiresInSeconds / (24 * 3600));

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Connected to Meta Suite</title>
                  <style>
                    body { font-family: -apple-system, sans-serif; background: #090a0f; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .card { background: #151824; padding: 40px; border-radius: 16px; text-align: center; border: 1px solid #262e42; }
                    h1 { color: #10b981; margin-bottom: 12px; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <h1>✓ Connected Successfully!</h1>
                    <p>Meta Suite (Instagram, Facebook & WhatsApp) is now connected.</p>
                    <p style="color: #94a3b8; font-size: 14px;">You can close this browser window and return to Auto AI Video Generator.</p>
                  </div>
                </body>
              </html>
            `);

            clearTimeout(timeout);
            cleanup();
            resolve({ userAccessToken: longLivedToken, expiresInDays });
          }
        } catch (err: any) {
          clearTimeout(timeout);
          cleanup();
          reject(err);
        }
      });

      server.listen(MetaOAuth.PORT, () => {
        // Open browser to auth dialog
        shell.openExternal(authUrl);
      });
    });
  }
}
