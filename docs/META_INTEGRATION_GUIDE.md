# Meta Business Suite Integration Guide

> **Research compiled:** October 2026
> **Target:** Node.js / TypeScript video production tool
> **Current Graph API version:** v26.0

---

## Table of Contents

1. [Meta Graph API Overview](#1-meta-graph-api-overview)
2. [Meta App Setup](#2-meta-app-setup)
3. [OAuth 2.0 Authentication](#3-oauth-20-authentication)
4. [Instagram Integration](#4-instagram-integration)
5. [Facebook Video Integration](#5-facebook-video-integration)
6. [WhatsApp Integration](#6-whatsapp-integration)
7. [Required OAuth Scopes Summary](#7-required-oauth-scopes-summary)
8. [NPM Packages & SDKs](#8-npm-packages--sdks)
9. [Rate Limits & Quotas](#9-rate-limits--quotas)
10. [App Review Requirements](#10-app-review-requirements)
11. [Architecture Recommendations](#11-architecture-recommendations)

---

## 1. Meta Graph API Overview

The **Meta Graph API** is the primary HTTP-based interface for reading and writing data across all Meta platforms (Facebook, Instagram, WhatsApp, Threads). It uses a "social graph" model built on three core concepts:

### Core Concepts

| Concept | Description | Example |
|---------|-------------|---------|
| **Nodes** | Individual objects with unique IDs | Users, Pages, Photos, Videos |
| **Edges** | Connections between nodes | User → Photos, Page → Videos |
| **Fields** | Properties of nodes | `name`, `id`, `media_url` |

### Base URL
```
https://graph.facebook.com/v26.0/{endpoint}
```

### Supported Operations

| HTTP Method | Operation |
|-------------|-----------|
| `GET` | Read data (nodes, edges, fields) |
| `POST` | Create or update objects |
| `DELETE` | Delete objects (limited to objects your app created) |

### Key Hosts

| Host | Purpose |
|------|---------|
| `graph.facebook.com` | All standard API calls, token exchange, publishing |
| `graph.instagram.com` | Instagram Login-specific calls |
| `rupload.facebook.com` | Resumable video uploads (Instagram & Facebook) |
| `api.instagram.com` | Instagram OAuth authorization window |

### Versioning
- New versions release **quarterly**
- Always specify the version explicitly (e.g., `/v26.0/`)
- Omitting version defaults to the **oldest available** version (not recommended)

---

## 2. Meta App Setup

### Prerequisites
1. Register as a **Meta Developer** at [developers.facebook.com](https://developers.facebook.com)
2. Have a Facebook account linked to your developer profile

### Steps to Create a Meta App

1. **Navigate** to [developers.facebook.com/apps/creation/](https://developers.facebook.com/apps/creation/)
2. **App Details** — Provide app name and contact email
3. **Select Use Cases** — Choose relevant use cases:
   - "Authenticate and request data from users with Facebook Login"
   - Other / custom use cases for video publishing
   - ⚠️ Use cases **cannot be removed** once added
4. **Connect Business Portfolio** — Link a verified or unverified Meta Business portfolio (required for accessing data you don't own)
5. **Review Requirements** — Check App Review obligations
6. **Go to Dashboard** — Finalize creation

### What You Get

| Credential | Purpose |
|-----------|---------|
| **App ID** | Unique identifier for your app (public) |
| **App Secret** | Secret key for server-side authentication (keep private!) |
| **Instagram App ID** | Separate ID for Instagram Business Login (if enabled) |
| **Instagram App Secret** | Separate secret for Instagram Business Login (if enabled) |

### Configure Products

After app creation, add these products in the dashboard:

1. **Facebook Login** — For OAuth with Facebook/Instagram
2. **Instagram** → API setup (for Instagram Graph API or Instagram Business Login)
3. **WhatsApp** → API setup (for WhatsApp Cloud API)

### Redirect URIs

Configure valid OAuth redirect URIs in each product's settings:

```
# Facebook Login
https://yourdomain.com/auth/facebook/callback

# Instagram Business Login (separate redirect)
https://yourdomain.com/auth/instagram/callback

# WhatsApp OAuth (if using embedded signup)
https://yourdomain.com/auth/whatsapp/callback
```

> ⚠️ **Important:** The redirect URI in your OAuth request must **exactly match** one registered in the dashboard (including trailing slashes).

---

## 3. OAuth 2.0 Authentication

Meta uses **OAuth 2.0** for authentication. There are two main paths:

### Path A: Facebook Login (for Facebook + Instagram via Facebook)

#### Step 1: Redirect User to Login Dialog
```
GET https://www.facebook.com/v26.0/dialog/oauth
  ?client_id={APP_ID}
  &redirect_uri={REDIRECT_URI}
  &state={CSRF_TOKEN}
  &scope={COMMA_SEPARATED_SCOPES}
  &response_type=code
```

#### Step 2: Handle Redirect — Receive Authorization Code
```
# User approves → redirect to:
https://yourdomain.com/auth/facebook/callback?code={AUTH_CODE}&state={CSRF_TOKEN}

# User denies → redirect to:
https://yourdomain.com/auth/facebook/callback?error=access_denied&error_reason=user_denied
```

#### Step 3: Exchange Code for Access Token (Server-Side)
```
GET https://graph.facebook.com/v26.0/oauth/access_token
  ?client_id={APP_ID}
  &redirect_uri={REDIRECT_URI}
  &client_secret={APP_SECRET}
  &code={AUTH_CODE}
```

**Response:**
```json
{
  "access_token": "EAAGm...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

#### Step 4: Inspect Token (Optional but Recommended)
```
GET https://graph.facebook.com/debug_token
  ?input_token={USER_TOKEN}
  &access_token={APP_TOKEN}
```

### Path B: Instagram Business Login (New, Recommended for Instagram)

Meta is migrating Instagram OAuth to a **dedicated Instagram Business Login** flow with its own OAuth domain, App ID, and App Secret.

#### Authorization Endpoint
```
GET https://api.instagram.com/oauth/authorize
  ?client_id={INSTAGRAM_APP_ID}
  &redirect_uri={REDIRECT_URI}
  &response_type=code
  &scope=instagram_business_basic,instagram_business_content_publish
```

#### Token Exchange
Exchange the authorization code for an Instagram User access token (similar flow to Facebook Login).

### Token Types

| Token Type | Use Case | Lifetime |
|-----------|----------|----------|
| **User Access Token** | Short-lived, per-user | ~1-2 hours |
| **Long-Lived User Token** | Extended user access | ~60 days |
| **Page Access Token** | Acting on behalf of a Page | Inherits from user token |
| **System User Access Token** | Server-to-server (Business) | Can be non-expiring |
| **App Access Token** | App-level (limited scope) | Does not expire |

### Extending Token Lifetime
```
GET https://graph.facebook.com/v26.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={SHORT_LIVED_TOKEN}
```

---

## 4. Instagram Integration

### 4.1 Posting Reels to Instagram

Instagram Reels are published using the **Content Publishing API** with a two-step process: create a container, then publish it.

#### API Variants & Required Permissions

| API Variant | Permissions Required | Token Type |
|-------------|---------------------|------------|
| Instagram API with Unified Login | `instagram_basic`, `instagram_content_publish` | Business Integration System User token |
| Instagram API with Instagram Login | `instagram_business_basic`, `instagram_business_content_publish` | Instagram User token |
| Instagram API with Facebook Login | `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list` | Facebook Page token |

#### Method A: Standard Upload (URL-based)

**Step 1: Create Reel Container**
```bash
POST https://graph.facebook.com/v26.0/{IG_USER_ID}/media
  ?media_type=REELS
  &video_url={PUBLIC_VIDEO_URL}
  &caption={CAPTION_TEXT}
  &share_to_feed=true
  &collaborators={COLLABORATOR_USERNAMES}
  &cover_url={COVER_IMAGE_URL}
  &audio_name={AUDIO_NAME}
  &thumb_offset={MILLISECONDS}
  &access_token={ACCESS_TOKEN}
```

**Step 2: Check Status (Poll Until Ready)**
```bash
GET https://graph.facebook.com/v26.0/{IG_CONTAINER_ID}
  ?fields=id,status,status_code,video_status
  &access_token={ACCESS_TOKEN}
```

Wait for `status_code: "FINISHED"` before publishing.

**Step 3: Publish**
```bash
POST https://graph.facebook.com/v26.0/{IG_USER_ID}/media_publish
  ?creation_id={IG_CONTAINER_ID}
  &access_token={ACCESS_TOKEN}
```

#### Method B: Resumable Upload (for large files / local files)

**Step 1: Initialize Resumable Session**
```bash
POST https://graph.facebook.com/v26.0/{IG_USER_ID}/media
  ?media_type=REELS
  &upload_type=resumable
  &caption={CAPTION}
  &access_token={ACCESS_TOKEN}
```

Response: `{ "id": "{IG_CONTAINER_ID}", "uri": "https://rupload.facebook.com/ig-api-upload/v26.0/{IG_CONTAINER_ID}" }`

**Step 2: Upload Binary to rupload.facebook.com**
```bash
POST https://rupload.facebook.com/ig-api-upload/v26.0/{IG_CONTAINER_ID}
  -H "Authorization: OAuth {ACCESS_TOKEN}"
  -H "offset: 0"
  -H "file_size: {FILE_SIZE_IN_BYTES}"
  --data-binary "@my_video.mp4"
```

**Step 3-4: Poll status & publish** (same as standard upload)

### 4.2 Posting Stories to Instagram

```bash
POST https://graph.facebook.com/v26.0/{IG_USER_ID}/media
  ?media_type=STORIES
  &upload_type=resumable        # or use video_url for URL-based
  &access_token={ACCESS_TOKEN}
```

Then upload the video (if resumable) and publish as above.

### Video Specifications for Instagram

| Property | Specification |
|----------|--------------|
| File Type | `.mp4` (recommended) |
| Aspect Ratio | 9:16 (Reels), 9:16 (Stories) |
| Resolution | 1080×1920 recommended, 540×960 minimum |
| Frame Rate | 24-60 fps |
| Duration | Reels: 3-90 sec; Stories: up to 60 sec |
| Codec | H.264, H.265 (VP9, AV1 also supported) |
| Audio | AAC, 128kbps+, 48kHz, Stereo |

### Rate Limits
- **100 API-published posts** per 24-hour rolling window per account

---

## 5. Facebook Video Integration

### 5.1 Posting Videos to Facebook Pages

Uses the **Video API** with a three-step process for Reels and the standard upload for regular videos.

#### Required Permissions
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`

#### Token Required
- **Page Access Token** (user must have `CREATE_CONTENT` or `ADMIN` task on the Page)

### 5.2 Publishing Facebook Reels

**Step 1: Initialize Upload Session**
```bash
POST https://graph.facebook.com/v26.0/{PAGE_ID}/video_reels
  -d "upload_phase=start"
  -d "access_token={PAGE_ACCESS_TOKEN}"
```

Response: `{ "video_id": "{VIDEO_ID}", "upload_url": "https://rupload.facebook.com/video-upload/{VIDEO_ID}" }`

**Step 2: Upload the Video Binary**
```bash
POST https://rupload.facebook.com/video-upload/{VIDEO_ID}
  -H "Authorization: OAuth {PAGE_ACCESS_TOKEN}"
  -H "offset: 0"
  -H "file_size: {FILE_SIZE}"
  --data-binary "@video.mp4"
```

**Step 3: Publish the Reel**
```bash
POST https://graph.facebook.com/v26.0/{PAGE_ID}/video_reels
  ?access_token={PAGE_ACCESS_TOKEN}
  &video_id={VIDEO_ID}
  &upload_phase=finish
  &video_state=PUBLISHED
  &description=Your caption here #hashtag
```

### 5.3 Publishing Regular Videos to Pages
```bash
POST https://graph.facebook.com/v26.0/{PAGE_ID}/videos
```
Uses the Resumable Upload API for large files.

### Facebook Reels Video Specifications

| Property | Specification |
|----------|--------------|
| File Type | `.mp4` (recommended) |
| Aspect Ratio | 9:16 |
| Resolution | 1080×1920 recommended, 540×960 minimum |
| Frame Rate | 24-60 fps |
| Duration | 3-90 seconds (≤60 sec for stories) |
| Video Codec | H.264, H.265, VP9, AV1 |
| Audio | AAC, 128kbps+, 48kHz, Stereo |
| Chroma | 4:2:0 subsampling |
| GOP | Closed GOP, 2-5 seconds |
| Scan | Progressive scan |

### Rate Limits
- **30 API-published Reels** per 24-hour moving period per Page

---

## 6. WhatsApp Integration

### WhatsApp Cloud API

WhatsApp uses the **Cloud API** (hosted by Meta) for sending messages programmatically.

#### Required Permissions
- `whatsapp_business_management` — Manage WhatsApp business assets
- `whatsapp_business_messaging` — Send messages, upload/retrieve media, make calls

#### Sending a Video Message
```bash
POST https://graph.facebook.com/v26.0/{PHONE_NUMBER_ID}/messages
Content-Type: application/json
Authorization: Bearer {ACCESS_TOKEN}

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "{RECIPIENT_PHONE_NUMBER}",
  "type": "video",
  "video": {
    "link": "https://example.com/video.mp4",
    "caption": "Check out this video!"
  }
}
```

#### Sending Video by Media ID (pre-uploaded)
```json
{
  "messaging_product": "whatsapp",
  "to": "{PHONE_NUMBER}",
  "type": "video",
  "video": {
    "id": "{MEDIA_ID}",
    "caption": "Your video caption"
  }
}
```

#### Uploading Media First
```bash
POST https://graph.facebook.com/v26.0/{PHONE_NUMBER_ID}/media
  -H "Authorization: Bearer {ACCESS_TOKEN}"
  -F "messaging_product=whatsapp"
  -F "file=@video.mp4"
  -F "type=video/mp4"
```

### Key Constraints
- **24-hour customer service window**: Can only send media messages within 24 hours of the customer's last message to you
- **Template messages**: For initiating conversations outside the 24-hour window, use pre-approved message templates
- **Opt-in required**: Users must have opted in to receive messages
- **Media caching**: Cloud API caches media assets for 10 minutes when using URLs

---

## 7. Required OAuth Scopes Summary

### For a Video Production Tool — Recommended Scope Set

#### Instagram (via Facebook Login)
```
instagram_basic
instagram_content_publish
pages_read_engagement
pages_show_list
```

#### Instagram (via Instagram Business Login — New)
```
instagram_business_basic
instagram_business_content_publish
```

#### Facebook Pages (Video & Reels)
```
pages_show_list
pages_read_engagement
pages_manage_posts
```

#### WhatsApp Business
```
whatsapp_business_management
whatsapp_business_messaging
```

#### Additional (if Page role via Business Manager)
```
ads_management
ads_read
business_management
```

### Combined Scope String (Facebook Login covering FB + IG)
```
pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish
```

---

## 8. NPM Packages & SDKs

### Official SDK

#### `facebook-nodejs-business-sdk`
The **official Meta Business SDK for Node.js**.

```bash
npm install facebook-nodejs-business-sdk
```

**Features:**
- Full Graph API coverage (Ads, Pages, Instagram, WhatsApp)
- Built-in object models for API entities
- Token management helpers
- Batch request support
- Compatible with the Marketing API, Pages API, and Instagram API

**Basic Usage:**
```typescript
import bizSdk from 'facebook-nodejs-business-sdk';

const { FacebookAdsApi, Page, IGUser } = bizSdk;

// Initialize the API
const api = FacebookAdsApi.init(accessToken);
api.setDebug(true);

// Get Page info
const page = new Page(pageId);
const pageData = await page.get([Page.Fields.name, Page.Fields.id]);

// Get Instagram account linked to Page
const igAccounts = await page.getInstagramAccounts([IGUser.Fields.id, IGUser.Fields.username]);
```

**GitHub:** [facebook/facebook-nodejs-business-sdk](https://github.com/facebook/facebook-nodejs-business-sdk)

### Alternative / Complementary Packages

| Package | Purpose |
|---------|---------|
| `axios` / `node-fetch` | Direct HTTP calls to Graph API (lightweight alternative) |
| `passport-facebook` | Express.js OAuth middleware for Facebook Login |
| `passport-instagram` | Express.js OAuth middleware for Instagram |
| `whatsapp-web.js` | Unofficial WhatsApp Web automation (NOT Cloud API) |
| `n8n-nodes-meta-publisher` | n8n workflow node for Meta publishing (Reels, Stories, etc.) |

### Direct HTTP Approach (Recommended for Video Publishing)

Since the Business SDK is primarily designed for the Marketing/Ads API, many developers prefer **direct HTTP calls** for content publishing:

```typescript
import axios from 'axios';

// Create Instagram Reel container
const createContainer = async (igUserId: string, videoUrl: string, caption: string, token: string) => {
  const response = await axios.post(
    `https://graph.facebook.com/v26.0/${igUserId}/media`,
    {
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption,
      access_token: token,
    }
  );
  return response.data; // { id: "CONTAINER_ID" }
};

// Poll for processing completion
const checkStatus = async (containerId: string, token: string) => {
  const response = await axios.get(
    `https://graph.facebook.com/v26.0/${containerId}`,
    {
      params: {
        fields: 'id,status,status_code',
        access_token: token,
      }
    }
  );
  return response.data;
};

// Publish when ready
const publishMedia = async (igUserId: string, containerId: string, token: string) => {
  const response = await axios.post(
    `https://graph.facebook.com/v26.0/${igUserId}/media_publish`,
    {
      creation_id: containerId,
      access_token: token,
    }
  );
  return response.data; // { id: "MEDIA_ID" }
};
```

---

## 9. Rate Limits & Quotas

| Platform | Limit | Window |
|----------|-------|--------|
| **Instagram** publishing | 100 posts | 24-hour rolling |
| **Facebook Reels** | 30 Reels | 24-hour rolling |
| **Graph API** (general) | 200 calls/user/hour | Per-user per-app |
| **WhatsApp** messaging | Varies by tier | Tiered (1K → 10K → 100K → unlimited) |
| **WhatsApp** template messages | 250K/day (highest tier) | 24-hour |

---

## 10. App Review Requirements

Before going to production, your app must pass **Meta App Review**:

### What's Required
1. **Demonstrate each permission** — Show how your app uses each requested scope
2. **Screencast recordings** — Record video walkthroughs of:
   - The complete login flow
   - How each permission is used in your app
   - Content creation and publishing workflow
3. **Privacy Policy URL** — Must be publicly accessible
4. **Terms of Service URL** — Required for production apps
5. **Business Verification** — Required for Advanced Access

### Access Levels
- **Development Mode** — Only app admins/testers can use the app (up to ~5 users)
- **Standard Access** — Limited data access, available after basic App Review
- **Advanced Access** — Full production access, requires comprehensive App Review

### Timeline
- App Review typically takes **5-10 business days**
- May require multiple iterations if Meta requests changes

---

## 11. Architecture Recommendations

### Recommended Architecture for Auto-Video-Generator

```
┌─────────────────────────────────────────────┐
│              Auto-Video-Generator            │
│                                              │
│  ┌────────────┐  ┌────────────────────────┐  │
│  │ Video      │  │ Meta Integration Layer  │  │
│  │ Generation │──│                        │  │
│  │ Pipeline   │  │  ┌──────────────────┐  │  │
│  └────────────┘  │  │ OAuth Manager    │  │  │
│                  │  │ (token store,    │  │  │
│                  │  │  refresh, scopes)│  │  │
│                  │  └──────────────────┘  │  │
│                  │                        │  │
│                  │  ┌──────────────────┐  │  │
│                  │  │ Instagram        │  │  │
│                  │  │ Publisher        │  │  │
│                  │  │ (Reels, Stories) │  │  │
│                  │  └──────────────────┘  │  │
│                  │                        │  │
│                  │  ┌──────────────────┐  │  │
│                  │  │ Facebook         │  │  │
│                  │  │ Publisher        │  │  │
│                  │  │ (Videos, Reels)  │  │  │
│                  │  └──────────────────┘  │  │
│                  │                        │  │
│                  │  ┌──────────────────┐  │  │
│                  │  │ WhatsApp         │  │  │
│                  │  │ Sender           │  │  │
│                  │  │ (Media msgs)     │  │  │
│                  │  └──────────────────┘  │  │
│                  │                        │  │
│                  │  ┌──────────────────┐  │  │
│                  │  │ Upload Manager   │  │  │
│                  │  │ (resumable,      │  │  │
│                  │  │  status polling) │  │  │
│                  │  └──────────────────┘  │  │
│                  └────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Key Implementation Considerations

1. **Token Management** — Implement automatic token refresh before expiry; store tokens encrypted in a database
2. **Resumable Uploads** — Always use resumable uploads for videos (handles network interruptions)
3. **Status Polling** — Instagram video containers need polling before publishing (~10-30 seconds for processing)
4. **Video Specifications** — Ensure generated videos meet each platform's specs before upload
5. **Error Handling** — Handle rate limits (HTTP 429), expired tokens (HTTP 401), and processing failures
6. **Webhooks** — Subscribe to status webhooks for async processing notifications

### Environment Variables Needed
```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_REDIRECT_URI=https://yourdomain.com/auth/callback

# Instagram Business Login (if using new flow)
INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret
INSTAGRAM_REDIRECT_URI=https://yourdomain.com/auth/instagram/callback

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
```

---

## Sources

- [Meta Graph API Overview](https://developers.facebook.com/docs/graph-api/overview)
- [Instagram Content Publishing API](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Instagram Resumable Uploads](https://developers.facebook.com/docs/instagram-platform/content-publishing/resumable-uploads/)
- [Facebook Reels Publishing API](https://developers.facebook.com/docs/video-api/guides/reels-publishing/)
- [Facebook Video API Overview](https://developers.facebook.com/docs/video-api/overview/)
- [Facebook Video API Reference](https://developers.facebook.com/docs/video-api/reference/)
- [Meta Permissions Reference](https://developers.facebook.com/docs/permissions/)
- [Facebook Login Manual Flow](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow)
- [Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/)
- [Instagram OAuth Authorize](https://developers.facebook.com/docs/instagram-platform/reference/oauth-authorize)
- [Create a Meta App](https://developers.facebook.com/docs/development/create-an-app)
- [WhatsApp Cloud API: Send Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages)
- [IG User Media Reference](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media)
