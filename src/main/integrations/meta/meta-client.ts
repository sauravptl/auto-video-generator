import axios from 'axios';
import { store } from '../../core/store';
import { SecretStore } from '../../core/secret-store';
import { MetaOAuth } from './meta-oauth';
import { InstagramPublisher } from './instagram-publisher';
import { FacebookPublisher } from './facebook-publisher';
import { ProjectManager } from '../../core/project-manager';
import type { MetaConnectionStatus, FacebookPage, WhatsAppPhoneNumber } from '../../../shared/meta-types';
import type { PublishTargets, PublishResult } from '../../../shared/types';

const USER_TOKEN_KEY = 'meta:user-token';
const PAGE_TOKEN_KEY = 'meta:page-token';

interface InternalPage extends FacebookPage { accessToken: string; }

export class MetaClient {
  private static cachedStatus: MetaConnectionStatus | null = null;
  private static cachedStatusTime = 0;

  public static async startOAuth(): Promise<MetaConnectionStatus> {
    this.cachedStatus = null;
    const { userAccessToken, expiresInDays } = await MetaOAuth.startLogin();
    return this.saveDirectToken(userAccessToken, expiresInDays);
  }

  public static async saveDirectToken(token: string, expiresInDays = 60): Promise<MetaConnectionStatus> {
    if (!token.trim()) throw new Error('Meta access token is required.');
    await this.validateToken(token);
    SecretStore.set(USER_TOKEN_KEY, token.trim());
    store.set('metaTokens.tokenExpiresAt', Date.now() + expiresInDays * 86400000);
    this.cachedStatus = null;
    store.delete('metaTokens.cachedStatus');
    return this.refreshAccountInfo(token.trim());
  }

  public static async getConnectionStatus(forceRefresh = false): Promise<MetaConnectionStatus> {
    const token = SecretStore.get(USER_TOKEN_KEY);
    if (!token) return { isConnected: false, pages: [] };
    if (!forceRefresh && this.cachedStatus && Date.now() - this.cachedStatusTime < 300000) return this.cachedStatus;
    if (!forceRefresh) {
      const cached = store.get<MetaConnectionStatus>('metaTokens.cachedStatus');
      if (cached?.isConnected && !JSON.stringify(cached).includes('accessToken')) return cached;
    }
    return this.refreshAccountInfo(token);
  }

  public static async selectPage(pageId: string): Promise<MetaConnectionStatus> {
    store.set('metaTokens.selectedPageId', pageId);
    this.cachedStatus = null;
    return this.getConnectionStatus(true);
  }

  public static async logout(): Promise<void> {
    SecretStore.delete(USER_TOKEN_KEY);
    SecretStore.delete(PAGE_TOKEN_KEY);
    store.delete('metaTokens');
    this.cachedStatus = null;
  }

  private static async validateToken(token: string): Promise<void> {
    try { await axios.get('https://graph.facebook.com/v26.0/me', { params: { fields: 'id', access_token: token }, timeout: 15000 }); }
    catch { throw new Error('Meta rejected this access token. Generate a fresh token and try again.'); }
  }

  private static async refreshAccountInfo(token: string): Promise<MetaConnectionStatus> {
    try {
      const userRes = await axios.get('https://graph.facebook.com/v26.0/me', { params: { fields: 'id,name', access_token: token }, timeout: 15000 });
      const pagesRes = await axios.get('https://graph.facebook.com/v26.0/me/accounts', { params: { fields: 'id,name,category,access_token,instagram_business_account{id,username,name,profile_picture_url}', access_token: token }, timeout: 15000 });
      const pages: InternalPage[] = (pagesRes.data.data || []).map((page: any) => ({
        id: page.id,
        name: page.name,
        category: page.category,
        accessToken: page.access_token,
        instagramBusinessAccount: page.instagram_business_account ? { id: page.instagram_business_account.id, username: page.instagram_business_account.username, name: page.instagram_business_account.name, profilePictureUrl: page.instagram_business_account.profile_picture_url } : undefined,
      }));
      const selectedId = store.get<string>('metaTokens.selectedPageId');
      const selectedPage = pages.find(page => page.id === selectedId) || pages[0];
      if (selectedPage) {
        store.set('metaTokens.selectedPageId', selectedPage.id);
        SecretStore.set(PAGE_TOKEN_KEY, selectedPage.accessToken);
        if (selectedPage.instagramBusinessAccount) {
          store.set('metaTokens.instagramAccountId', selectedPage.instagramBusinessAccount.id);
          store.set('metaTokens.instagramUsername', selectedPage.instagramBusinessAccount.username);
        }
      }
      let whatsappPhone: WhatsAppPhoneNumber | undefined;
      const phoneId = store.get<string>('settings.whatsappPhoneNumberId') || store.get<string>('metaTokens.whatsappPhoneNumberId');
      if (phoneId) {
        try {
          const waRes = await axios.get(`https://graph.facebook.com/v26.0/${phoneId}`, { params: { fields: 'id,verified_name,display_phone_number,quality_rating', access_token: token }, timeout: 15000 });
          whatsappPhone = { id: waRes.data.id, verifiedName: waRes.data.verified_name, displayPhoneNumber: waRes.data.display_phone_number, qualityRating: waRes.data.quality_rating };
        } catch { /* unavailable until WhatsApp credentials are valid */ }
      }
      const expiresAt = store.get<number>('metaTokens.tokenExpiresAt', 0);
      const status: MetaConnectionStatus = {
        isConnected: true,
        user: userRes.data,
        pages: pages.map(({ accessToken: _accessToken, ...page }) => page),
        selectedPage: selectedPage ? (({ accessToken: _accessToken, ...page }) => page)(selectedPage) : undefined,
        instagramAccount: selectedPage?.instagramBusinessAccount ? { id: selectedPage.instagramBusinessAccount.id, username: selectedPage.instagramBusinessAccount.username } : undefined,
        whatsappPhone,
        tokenExpiresInDays: Math.max(0, Math.floor((expiresAt - Date.now()) / 86400000)),
      };
      this.cachedStatus = status;
      this.cachedStatusTime = Date.now();
      store.set('metaTokens.cachedStatus', status);
      return status;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.logout();
        return { isConnected: false, pages: [] };
      }
      return this.cachedStatus || { isConnected: false, pages: [] };
    }
  }

  public static async publishProject(projectId: string, targets: PublishTargets): Promise<PublishResult[]> {
    const project = ProjectManager.getProject(projectId);
    if (!project) throw new Error('Project not found');
    const status = await this.getConnectionStatus(true);
    const pageToken = SecretStore.get(PAGE_TOKEN_KEY);
    if (!status.isConnected || !status.selectedPage || !pageToken) throw new Error('Meta Suite is not connected. Please connect in Setup first.');
    await this.validateToken(pageToken);
    const results: PublishResult[] = [];
    const caption = project.script?.caption || project.topic;
    const title = project.script?.title || project.title;
    if (targets.instagramReels && project.outputVideo916 && status.instagramAccount) results.push(await InstagramPublisher.publishReel(project.outputVideo916, caption, status.instagramAccount.id, pageToken));
    if (targets.facebookReels && project.outputVideo916) results.push(await FacebookPublisher.publishPageVideo(project.outputVideo916, title, caption, status.selectedPage.id, pageToken, true));
    if (targets.facebookPageVideo && (project.outputVideo169 || project.outputVideo916)) results.push(await FacebookPublisher.publishPageVideo(project.outputVideo169 || project.outputVideo916!, title, caption, status.selectedPage.id, pageToken, false));
    project.publishResults = results;
    project.status = 'published';
    ProjectManager.updateProject(project);
    return results;
  }
}
