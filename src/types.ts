export interface AboutPillar {
  title: string;
  description: string;
}

export interface BrandSettings {
  companyName: string;
  tradingAs: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  typewriterPhrases: string[];
  logoUrl: string;
  primaryPhone: string;
  secondaryPhone: string;
  contactEmail: string;
  bishopscourtAddress: string;
  retreatAddress: string;
  retreatNote: string;
  facebookPageName: string;
  facebookUrl: string;
  operatingHours: string;
  transparencyNote: string;
  homeOverviewEyebrow: string;
  homeOverviewTitle: string;
  homeOverviewSubtitle: string;
  servicesPageEyebrow: string;
  servicesPageTitle: string;
  servicesPageSubtitle: string;
  aboutPageEyebrow: string;
  aboutPageTitle: string;
  aboutPageSubtitle: string;
  aboutStoryTitle: string;
  aboutStoryBody: string;
  aboutPillars: AboutPillar[];
  contactPageEyebrow: string;
  contactPageTitle: string;
  contactPageSubtitle: string;
  footerCredit: string;
  updatedAt: string;
}

export interface ServiceItem {
  id: string;
  order: number;
  title: string;
  category: string;
  summary: string;
  highlights: string[];
  imageUrl: string;
  featured: boolean;
  active: boolean;
  updatedAt: string;
}

export type NewsCategory = 'Field Dispatch' | 'Safety Advisory' | 'Promotion' | 'Project Log';

export interface NewsItem {
  id: string;
  title: string;
  category: NewsCategory;
  suburb: string;
  body: string;
  imageUrl?: string;
  pinned: boolean;
  publishedAt: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  category: string;
  url: string;
  caption: string;
  uploadedAt: string;
}

export type InquiryStatus = 'New' | 'Contacted' | 'Scheduled' | 'Completed';

export interface QuoteInquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  suburb: string;
  propertyType: 'Residential' | 'Commercial' | 'Industrial';
  requestType: 'New Installation' | 'Repair & Maintenance';
  serviceId: string;
  serviceTitle: string;
  confirmCalloutFee: boolean;
  confirmWarranty: boolean;
  confirmScope: boolean;
  details: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface FaqItem {
  id: string;
  order: number;
  category: string;
  question: string;
  answer: string;
  active: boolean;
}

export interface PublicSiteState {
  brand: BrandSettings;
  services: ServiceItem[];
  news: NewsItem[];
  gallery: GalleryImage[];
  faqs: FaqItem[];
  connectedClients: number;
}

export interface AdminStatus {
  configured: boolean;
  envOverride: boolean;
  authenticated: boolean;
  smtpConfigured: boolean;
}
