import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import type { PublishResult } from '../../../shared/types';

export class FacebookPublisher {
  /**
   * Publishes a video to Facebook Page (Reels or Standard Video Post)
   */
  public static async publishPageVideo(
    videoPath: string,
    title: string,
    description: string,
    pageId: string,
    pageAccessToken: string,
    isReel = false
  ): Promise<PublishResult> {
    try {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found at ${videoPath}`);
      }

      if (isReel) {
        return await this.publishPageReel(videoPath, title, description, pageId, pageAccessToken);
      }

      // Standard Facebook Page Video Post (Multipart Form-Data to /{page_id}/videos)
      const form = new FormData();
      form.append('source', fs.createReadStream(videoPath));
      form.append('title', title);
      form.append('description', description);
      form.append('access_token', pageAccessToken);

      const endpoint = `https://graph.facebook.com/v26.0/${pageId}/videos`;

      const res = await axios.post(endpoint, form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      const videoId = res.data.id;

      return {
        platform: 'facebook',
        status: 'success',
        postId: videoId,
        url: `https://www.facebook.com/${pageId}/videos/${videoId}`,
        publishedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('Facebook Video publication error:', err.response?.data || err.message);
      return {
        platform: 'facebook',
        status: 'failed',
        error: err.response?.data?.error?.message || err.message,
      };
    }
  }

  /**
   * Publishes a 9:16 vertical video as a Facebook Reel using the 3-step Resumable Upload protocol:
   * 1. Initialize upload session: POST /{page_id}/video_reels with upload_phase=start
   * 2. Binary file upload: POST to rupload.facebook.com endpoint
   * 3. Finish and publish: POST /{page_id}/video_reels with upload_phase=finish & video_state=PUBLISHED
   */
  private static async publishPageReel(
    videoPath: string,
    title: string,
    description: string,
    pageId: string,
    pageAccessToken: string
  ): Promise<PublishResult> {
    const fileStats = fs.statSync(videoPath);
    const fileSize = fileStats.size;

    console.log(`[Facebook Reel] Initializing upload session for page ${pageId} (${fileSize} bytes)...`);

    // -------------------------------------------------------------
    // Step 1: Initialize Reel Upload Session (upload_phase=start)
    // -------------------------------------------------------------
    const initRes = await axios.post(
      `https://graph.facebook.com/v26.0/${pageId}/video_reels`,
      null,
      {
        params: {
          upload_phase: 'start',
          access_token: pageAccessToken,
        },
      }
    );

    const videoId = initRes.data.video_id;
    const uploadUrl = initRes.data.upload_url;

    if (!videoId || !uploadUrl) {
      throw new Error(`Failed to initialize Facebook Reel upload: ${JSON.stringify(initRes.data)}`);
    }

    console.log(`[Facebook Reel] Upload session initialized. Video ID: ${videoId}, URL: ${uploadUrl}`);

    // -------------------------------------------------------------
    // Step 2: Upload Binary Stream/Buffer to rupload Endpoint
    // Meta rupload requires both Content-Length and X-Entity-Length
    // -------------------------------------------------------------
    const videoBuffer = fs.readFileSync(videoPath);
    await axios.post(uploadUrl, videoBuffer, {
      headers: {
        Authorization: `OAuth ${pageAccessToken}`,
        offset: '0',
        file_size: fileSize.toString(),
        'Content-Length': fileSize.toString(),
        'X-Entity-Length': fileSize.toString(),
        'X-Entity-Type': 'video/mp4',
        'X-Entity-Name': path.basename(videoPath),
        'Content-Type': 'application/octet-stream',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    console.log(`[Facebook Reel] Binary payload uploaded successfully. Finishing Reel publication...`);

    // -------------------------------------------------------------
    // Step 3: Publish the Reel (upload_phase=finish)
    // -------------------------------------------------------------
    const finishRes = await axios.post(
      `https://graph.facebook.com/v26.0/${pageId}/video_reels`,
      null,
      {
        params: {
          access_token: pageAccessToken,
          video_id: videoId,
          upload_phase: 'finish',
          video_state: 'PUBLISHED',
          description: description,
          title: title,
        },
      }
    );

    console.log(`[Facebook Reel] Publish response:`, finishRes.data);

    return {
      platform: 'facebook',
      status: 'success',
      postId: videoId,
      url: `https://www.facebook.com/reel/${videoId}`,
      publishedAt: new Date().toISOString(),
    };
  }
}
