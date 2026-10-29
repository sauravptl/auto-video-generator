import http from 'http';
import crypto from 'crypto';
import { shell } from 'electron';
import axios from 'axios';
import { SettingsService } from '../../core/settings-service';
import { store } from '../../core/store';

export class MetaOAuth {
  public static async startLogin(): Promise<{ userAccessToken: string; expiresInDays: number }> {
    const appId = store.get<string>('settings.metaAppId', '');
    const appSecret = SettingsService.getMetaAppSecret();
    const redirectUri = store.get<string>('settings.metaRedirectUri', 'http://127.0.0.1:54321/auth/callback');
    if (!appId || !appSecret) throw new Error('Enter the Meta App ID and App Secret in Settings first.');
    const redirect = new URL(redirectUri);
    if (redirect.hostname !== '127.0.0.1' || redirect.protocol !== 'http:' || redirect.pathname !== '/auth/callback') {
      throw new Error('Meta OAuth redirect must be a registered 127.0.0.1 callback URL.');
    }
    const port = Number(redirect.port || 80);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Meta OAuth redirect URI has an invalid port.');
    const state = crypto.randomBytes(32).toString('hex');
    const scopes = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish', 'whatsapp_business_management', 'whatsapp_business_messaging'].join(',');
    const authUrl = new URL('https://www.facebook.com/v26.0/dialog/oauth');
    authUrl.searchParams.set('client_id', appId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    return new Promise((resolve, reject) => {
      let settled = false;
      const server = http.createServer(async (req, res) => {
        const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline';", 'X-Content-Type-Options': 'nosniff' };
        const finish = (error?: Error, result?: { userAccessToken: string; expiresInDays: number }) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          server.close();
          if (error) reject(error);
          else resolve(result!);
        };
        try {
          const requestUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
          if (req.method !== 'GET' || req.headers.host !== `127.0.0.1:${port}` || requestUrl.pathname !== redirect.pathname) {
            res.writeHead(404, headers).end('<h1>Not found</h1>');
            return;
          }
          if (requestUrl.searchParams.get('state') !== state) {
            res.writeHead(400, headers).end('<h1>Invalid or expired sign-in request</h1>');
            finish(new Error('Meta OAuth state did not match. Start sign-in again.'));
            return;
          }
          const providerError = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');
          if (providerError) {
            res.writeHead(400, headers).end('<h1>Meta sign-in was not completed</h1><p>Return to CineFlow AI and try again.</p>');
            finish(new Error(`Meta authorization failed: ${providerError.slice(0, 200)}`));
            return;
          }
          const code = requestUrl.searchParams.get('code');
          if (!code) {
            res.writeHead(400, headers).end('<h1>Meta did not return an authorization code</h1>');
            finish(new Error('Meta did not return an authorization code.'));
            return;
          }
          const tokenRes = await axios.get('https://graph.facebook.com/v26.0/oauth/access_token', { params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }, timeout: 15000 });
          const shortToken = tokenRes.data.access_token;
          const longRes = await axios.get('https://graph.facebook.com/v26.0/oauth/access_token', { params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken }, timeout: 15000 });
          const expiresInSeconds = Number(longRes.data.expires_in) || 60 * 24 * 60 * 60;
          res.writeHead(200, headers).end('<!doctype html><title>Connected</title><h1>Connected to Meta</h1><p>Return to CineFlow AI.</p>');
          finish(undefined, { userAccessToken: longRes.data.access_token, expiresInDays: Math.floor(expiresInSeconds / 86400) });
        } catch (error) {
          if (!res.headersSent) res.writeHead(500, headers).end('<h1>Meta sign-in failed</h1><p>Return to CineFlow AI and check your credentials.</p>');
          finish(error instanceof Error ? error : new Error('Meta token exchange failed.'));
        }
      });
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          server.close();
          reject(new Error('Meta authentication timed out after 5 minutes.'));
        }
      }, 5 * 60 * 1000);
      server.once('error', error => {
        clearTimeout(timeout);
        if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') reject(new Error(`Meta OAuth port ${port} is already in use. Close the other app using it and retry.`));
        else reject(error);
      });
      server.listen(port, '127.0.0.1', () => {
        shell.openExternal(authUrl.toString()).catch(error => {
          clearTimeout(timeout);
          server.close();
          reject(error);
        });
      });
    });
  }
}
