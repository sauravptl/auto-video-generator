import axios from 'axios';
import { store } from '../../core/store';
import { MetaOAuth } from './meta-oauth';
import { InstagramPublisher } from './instagram-publisher';
import { FacebookPublisher } from './facebook-publisher';
import { WhatsAppPublisher } from './whatsapp-publisher';
import { ProjectManager } from '../../core/project-manager';
import type { MetaConnectionStatus, FacebookPage, WhatsAppPhoneNumber } from '../../../shared/meta-types';
import type { PublishTargets, PublishResult } from '../../../shared/types';

export class MetaClient {
  private static cachedStatus: MetaConnectionStatus | null = null;
  private static cachedStatusTime = 0;

  public static async startOAuth(): Promise<MetaConnectionStatus> {
    this.cachedStatus = null;
    this.cachedStatusTime = 0;
    const { userAccessToken, expiresInDays } = await MetaOAuth.startLogin();
    return this.saveDirectToken(userAccessToken, expiresInDays);
  }

  public static async saveDirectToken(token: string, expiresInDays = 60): Promise<MetaConnectionStatus> {
    this.cachedStatus = null;
    this.cachedStatusTime = 0;
    store.set('metaTokens.userAccessToken', token);
    store.set('metaTokens.tokenExpiresAt', Date.now() + expiresInDays * 24 * 3600 * 1000);

    // Refresh pages and connected accounts
    return this.refreshAccountInfo(token);
  }

  public static async getConnectionStatus(forceRefresh = false): Promise<MetaConnectionStatus> {
    const token = store.get('metaTokens.userAccessToken');
    if (!token) {
      this.cachedStatus = { isConnected: false, pages: [] };
      return this.cachedStatus;
    }

    if (!forceRefresh && this.cachedStatus && (Date.now() - this.cachedStatusTime < 300_000)) {
      return this.cachedStatus;
    }

    // Check persistent store for cached status to avoid hitting rate limits on fresh launches
    const persistedStatus = store.get<MetaConnectionStatus>('metaTokens.cachedStatus');
    if (!forceRefresh && persistedStatus && persistedStatus.isConnected && !this.cachedStatus) {
      this.cachedStatus = persistedStatus;
      this.cachedStatusTime = Date.now();
      return persistedStatus;
    }

    return this.refreshAccountInfo(token);
  }

  public static async selectPage(pageId: string): Promise<MetaConnectionStatus> {
    this.cachedStatus = null;
    this.cachedStatusTime = 0;
    store.set('metaTokens.selectedPageId', pageId);
    return this.getConnectionStatus(true);
  }

  public static async logout(): Promise<void> {
    this.cachedStatus = null;
    this.cachedStatusTime = 0;
    store.delete('metaTokens');
  }

  private static async refreshAccountInfo(token: string): Promise<MetaConnectionStatus> {
    try {
      // 1. Fetch user profile
      const userRes = await axios.get('https://graph.facebook.com/v26.0/me', {
        params: { fields: 'id,name', access_token: token },
      });

      // 2. Fetch pages & Instagram Business Accounts
      const pagesRes = await axios.get('https://graph.facebook.com/v26.0/me/accounts', {
        params: {
          fields: 'id,name,category,access_token,instagram_business_account{id,username,name,profile_picture_url}',
          access_token: token,
        },
      });

      const pages: FacebookPage[] = (pagesRes.data.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        accessToken: p.access_token,
        instagramBusinessAccount: p.instagram_business_account
          ? {
              id: p.instagram_business_account.id,
              username: p.instagram_business_account.username,
              name: p.instagram_business_account.name,
              profilePictureUrl: p.instagram_business_account.profile_picture_url,
            }
          : undefined,
      }));

      // Find or default selected page
      const savedSelectedPageId = store.get('metaTokens.selectedPageId');
      const selectedPage = pages.find(p => p.id === savedSelectedPageId) || pages[0];

      if (selectedPage) {
        store.set('metaTokens.selectedPageId', selectedPage.id);
        store.set('metaTokens.pageAccessToken', selectedPage.accessToken);

        if (selectedPage.instagramBusinessAccount) {
          store.set('metaTokens.instagramAccountId', selectedPage.instagramBusinessAccount.id);
          store.set('metaTokens.instagramUsername', selectedPage.instagramBusinessAccount.username);
        }
      }

      // Check WhatsApp Phone Number if configured
      let whatsappPhone: WhatsAppPhoneNumber | undefined;
      const phoneId = store.get('metaTokens.whatsappPhoneNumberId');
      if (phoneId) {
        try {
          const waRes = await axios.get(`https://graph.facebook.com/v26.0/${phoneId}`, {
            params: { fields: 'id,verified_name,display_phone_number,quality_rating', access_token: token },
          });
          whatsappPhone = {
            id: waRes.data.id,
            verifiedName: waRes.data.verified_name,
            displayPhoneNumber: waRes.data.display_phone_number,
            qualityRating: waRes.data.quality_rating,
          };
        } catch (e) {
          // Ignore if phone not found
        }
      }

      const expiresAt = store.get('metaTokens.tokenExpiresAt', 0);
      const tokenExpiresInDays = Math.max(0, Math.floor((expiresAt - Date.now()) / (24 * 3600 * 1000)));

      const status: MetaConnectionStatus = {
        isConnected: true,
        user: userRes.data,
        pages,
        selectedPage,
        instagramAccount: selectedPage?.instagramBusinessAccount
          ? {
              id: selectedPage.instagramBusinessAccount.id,
              username: selectedPage.instagramBusinessAccount.username,
            }
          : undefined,
        whatsappPhone,
        tokenExpiresInDays,
      };

      // Cache in memory and persist to store
      this.cachedStatus = status;
      this.cachedStatusTime = Date.now();
      store.set('metaTokens.cachedStatus', status);

      return status;
    } catch (err: any) {
      console.warn(
        'Meta Graph API encountered temporary error or rate limit:',
        err.response?.data?.error?.message || err.message
      );

      // If we have previously cached valid status, retain it so UI doesn't flicker or show disconnected
      const fallback =
        this.cachedStatus || store.get<MetaConnectionStatus>('metaTokens.cachedStatus');
      if (fallback && fallback.isConnected) {
        this.cachedStatus = fallback;
        this.cachedStatusTime = Date.now();
        return fallback;
      }

      return { isConnected: false, pages: [] };
    }
  }

  /**
   * Publishes a completed video project to all selected platforms
   */
  /**
   * Validate token is actually alive by hitting the Graph API directly.
   * Returns true if the token works, false if expired/invalid.
   */
  private static async isTokenAlive(token: string): Promise<boolean> {
    try {
      await axios.get('https://graph.facebook.com/v26.0/me', {
        params: { fields: 'id', access_token: token },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Publishes a completed video project to all selected platforms.
   * Force-validates token before publishing to avoid stale cached status.
   */
  public static async publishProject(
    projectId: string,
    targets: PublishTargets
  ): Promise<PublishResult[]> {
    const project = ProjectManager.getProject(projectId);
    if (!project) throw new Error('Project not found');

    // Force-refresh status (bypass cache) to catch expired tokens
    const status = await this.getConnectionStatus(true);
    if (!status.isConnected || !status.selectedPage) {
      throw new Error('Meta Suite is not connected. Please connect in Setup first.');
    }

    // Double-check the page access token is actually alive
    const pageTokenAlive = await this.isTokenAlive(status.selectedPage.accessToken);
    if (!pageTokenAlive) {
      // Clear stale cached status so UI reflects disconnected state
      this.cachedStatus = null;
      this.cachedStatusTime = 0;
      store.delete('metaTokens.cachedStatus');
      throw new Error(
        'Meta access token has expired. Please go to Setup and reconnect your Meta account with a new token.'
      );
    }

    const results: PublishResult[] = [];
    const caption = project.script?.caption || project.topic;
    const title = project.script?.title || project.title;

    // 1. Instagram Reels (requires 9:16 vertical video)
    if (targets.instagramReels && project.outputVideo916 && status.instagramAccount) {
      console.log('Publishing to Instagram Reels...');
      const igRes = await InstagramPublisher.publishReel(
        project.outputVideo916,
        caption,
        status.instagramAccount.id,
        status.selectedPage.accessToken
      );
      results.push(igRes);
    }

    // 2. Facebook Reels (9:16)
    if (targets.facebookReels && project.outputVideo916) {
      console.log('Publishing to Facebook Reels...');
      const fbReelRes = await FacebookPublisher.publishPageVideo(
        project.outputVideo916,
        title,
        caption,
        status.selectedPage.id,
        status.selectedPage.accessToken,
        true
      );
      results.push(fbReelRes);
    }

    // 3. Facebook Page Video (16:9 or 9:16)
    if (targets.facebookPageVideo) {
      const fbVideoPath = project.outputVideo169 || project.outputVideo916;
      if (fbVideoPath) {
        console.log('Publishing to Facebook Page Video...');
        const fbRes = await FacebookPublisher.publishPageVideo(
          fbVideoPath,
          title,
          caption,
          status.selectedPage.id,
          status.selectedPage.accessToken,
          false
        );
        results.push(fbRes);
      }
    }

    // Update project with publishing results
    project.publishResults = results;
    project.status = 'published';
    ProjectManager.updateProject(project);

    return results;
  }
}
