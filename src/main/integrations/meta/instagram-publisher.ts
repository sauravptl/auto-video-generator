import fs from 'fs';
import axios from 'axios';
import type { PublishResult } from '../../../shared/types';

export class InstagramPublisher {
  /**
   * Publishes a local 9:16 MP4 video to Instagram Reels via Resumable Upload Protocol
   */
  public static async publishReel(
    videoPath: string,
    caption: string,
    igUserId: string,
    accessToken: string
  ): Promise<PublishResult> {
    try {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found at ${videoPath}`);
      }

      const fileStats = fs.statSync(videoPath);
      const fileSize = fileStats.size;

      // 1. Initialize container with upload_type=resumable
      const initRes = await axios.post(
        `https://graph.facebook.com/v26.0/${igUserId}/media`,
        null,
        {
          params: {
            media_type: 'REELS',
            upload_type: 'resumable',
            caption: caption,
            share_to_feed: true,
            access_token: accessToken,
          },
        }
      );

      const containerId = initRes.data.id;
      const uploadUri = initRes.data.uri;

      // 2. Stream video file buffer directly to Meta's rupload endpoint
      // Meta rupload requires both Content-Length and X-Entity-Length
      const videoBuffer = fs.readFileSync(videoPath);
      await axios.post(uploadUri, videoBuffer, {
        headers: {
          Authorization: `OAuth ${accessToken}`,
          offset: '0',
          file_size: fileSize.toString(),
          'Content-Length': fileSize.toString(),
          'X-Entity-Length': fileSize.toString(),
          'X-Entity-Type': 'video/mp4',
          'Content-Type': 'application/octet-stream',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      // 3. Poll container status until FINISHED
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 * 3s = 90s max wait

      while (!isReady && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3000));
        attempts++;

        const statusRes = await axios.get(
          `https://graph.facebook.com/v26.0/${containerId}`,
          {
            params: {
              fields: 'status_code,status',
              access_token: accessToken,
            },
          }
        );

        const status = statusRes.data.status_code;
        if (status === 'FINISHED') {
          isReady = true;
        } else if (status === 'ERROR') {
          throw new Error('Meta video processing failed with status ERROR');
        }
      }

      if (!isReady) {
        throw new Error('Video processing on Instagram timed out');
      }

      // 4. Publish the container
      const publishRes = await axios.post(
        `https://graph.facebook.com/v26.0/${igUserId}/media_publish`,
        null,
        {
          params: {
            creation_id: containerId,
            access_token: accessToken,
          },
        }
      );

      const publishedMediaId = publishRes.data.id;

      return {
        platform: 'instagram',
        status: 'success',
        postId: publishedMediaId,
        url: `https://www.instagram.com/reel/${publishedMediaId}/`,
        publishedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('Instagram Reel publication error:', err.response?.data || err.message);
      return {
        platform: 'instagram',
        status: 'failed',
        error: err.response?.data?.error?.message || err.message,
      };
    }
  }
}
