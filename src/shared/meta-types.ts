export interface MetaTokens {
  tokenExpiresAt?: number;
  selectedPageId?: string;
  instagramAccountId?: string;
  instagramUsername?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  instagramBusinessAccount?: {
    id: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
  };
}

export interface WhatsAppPhoneNumber {
  id: string;
  verifiedName: string;
  displayPhoneNumber: string;
  qualityRating?: string;
}

export interface MetaConnectionStatus {
  isConnected: boolean;
  user?: { id: string; name: string };
  pages: FacebookPage[];
  selectedPage?: FacebookPage;
  instagramAccount?: { id: string; username: string };
  whatsappPhone?: WhatsAppPhoneNumber;
  tokenExpiresInDays?: number;
}
