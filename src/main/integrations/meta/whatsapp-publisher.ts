import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import type { PublishResult } from '../../../shared/types';

export class WhatsAppPublisher {
  /**
   * Uploads video media and sends a video message to WhatsApp
   */
  public static async publishMediaMessage(
    videoPath: string,
    caption: string,
    phoneNumberId: string,
    recipientNumber: string,
    accessToken: string
  ): Promise<PublishResult> {
    try {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found at ${videoPath}`);
      }

      // 1. Upload video media binary
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('file', fs.createReadStream(videoPath));
      form.append('type', 'video/mp4');

      const uploadRes = await axios.post(
        `https://graph.facebook.com/v26.0/${phoneNumberId}/media`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${accessToken}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      const mediaId = uploadRes.data.id;

      // 2. Send video message
      const messageRes = await axios.post(
        `https://graph.facebook.com/v26.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientNumber,
          type: 'video',
          video: {
            id: mediaId,
            caption: caption,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const messageId = messageRes.data.messages?.[0]?.id;

      return {
        platform: 'whatsapp',
        status: 'success',
        postId: messageId,
        publishedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('WhatsApp publication error:', err.response?.data || err.message);
      return {
        platform: 'whatsapp',
        status: 'failed',
        error: err.response?.data?.error?.message || err.message,
      };
    }
  }
}
