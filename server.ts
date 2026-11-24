import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express, {NextFunction, Request, Response} from 'express';
import nodemailer from 'nodemailer';
import {createServer as createViteServer} from 'vite';
import {WebSocket, WebSocketServer} from 'ws';
import type {
  BrandSettings,
  FaqItem,
  GalleryImage,
  InquiryStatus,
  NewsCategory,
  NewsItem,
  PublicSiteState,
  QuoteInquiry,
  ServiceItem,
} from './src/types.ts';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');

fs.mkdirSync(DATA_DIR, {recursive: true});
fs.mkdirSync(UPLOADS_DIR, {recursive: true});

interface AdminCredential {
  salt: string;
  hash: string;
  claimedAt: string;
}

interface PersistedStore {
  brand: BrandSettings;
  services: ServiceItem[];
  news: NewsItem[];
  gallery: GalleryImage[];
  faqs: FaqItem[];
  inquiries: QuoteInquiry[];
  adminCredential: AdminCredential | null;
}

function createInitialStore(): PersistedStore {
  const now = new Date().toISOString();
  const minutesAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

  return {
    brand: {
      companyName: 'Binwells Automation & Security Services',
      tradingAs: "Binwell's Automation and Electronic Solution",
      tagline: 'Residential, Commercial & Industrial Automation across Cape Town',
      heroTitle: 'Gate Automation, Perimeter Security & Steel Fabrication in Cape Town',
      heroSubtitle:
        'Installation and repair of sliding and swing gate motors, garage doors, solar electric fencing, CCTV systems, alarms, electrical work, and custom steel gates across Bishopscourt, Retreat, and greater Cape Town.',
      heroImageUrl: '/src/assets/images/hero_cape_town_gate_1795439779507.jpg',
      heroImages: [
        '/src/assets/images/hero_cape_town_gate_1795439779507.jpg',
        '/src/assets/images/service_gate_motor_1795439779271.jpg',
        '/src/assets/images/service_electric_fence_1795439779591.jpg',
        '/src/assets/images/service_steel_fabrication_1795439780499.jpg',
      ],
      heroImageOpacity: 55,
      typewriterPhrases: [
        'Sliding & Swing Gate Motor Automation',
        'Solar-Powered Perimeter Electric Fencing',
        'Wired & Wireless CCTV and Alarm Systems',
        'Custom Steel Gates, Burglar Bars & Electrical Work',
      ],
      logoUrl: '',
      primaryPhone: '+27 73 415 4108',
      secondaryPhone: '+27 82 936 4009',
      contactEmail: '',
      bishopscourtAddress: '112 Rhodes Dr, Bishopscourt, Cape Town',
      retreatAddress: '19 Auriga Rd, Retreat, Cape Town',
      retreatNote: 'Roughly a 15-minute drive south of the Foreshore / Cape Town CBD depending on traffic.',
      facebookPageName: "Binwell's Automation and Electronic Solution",
      facebookUrl: 'https://www.facebook.com',
      operatingHours: 'Mon – Sat · 07:30 – 18:00 · Emergency Call-Outs by Arrangement',
      transparencyNote:
        'Public directory reviews vary across platforms (4.5/5 on 8 reviews and 2.3/5 on 3 reviews). Before any dispatch or deposit, we recommend confirming exact scope of work, manufacturer vs. workmanship warranty terms, and call-out fees in writing.',
      homeOverviewEyebrow: 'What We Do',
      homeOverviewTitle: 'Integrated automation, perimeter security, and custom metalwork',
      homeOverviewSubtitle:
        'From new installations to urgent fault diagnostics, our technicians support homes, estates, commercial buildings, and industrial facilities across Cape Town.',
      servicesPageEyebrow: 'Services Offered',
      servicesPageTitle: 'Automation, perimeter protection, and metalwork built for Cape Town properties',
      servicesPageSubtitle:
        'Whether fitting a new motorised gate system or repairing an existing garage door, electric fence, or CCTV setup, select any service below to request a tailored quote.',
      aboutPageEyebrow: 'About Binwells',
      aboutPageTitle: 'Cape Town security installation, automation, and steel fabrication',
      aboutPageSubtitle:
        'Serving residential, commercial, and industrial properties from listed bases in Bishopscourt and Retreat.',
      aboutStoryTitle: 'Practical mechanical, electronic, and electrical workmanship under one roof',
      aboutStoryBody:
        "Binwells Automation and Security Services (also listed locally as Binwell's Automation and Electronic Solution) combines gate and garage motor automation, solar and mains electric fencing, CCTV and alarm electronics, general electrical maintenance, and custom steel fabrication.",
      aboutPillars: [
        {
          title: 'End-to-End Scope',
          description:
            'From fabricating custom steel driveway gates and burglar bars to wiring motors, solar electric fencing, intercoms, and CCTV cameras.',
        },
        {
          title: 'Local Footprint',
          description:
            'Listed at 112 Rhodes Dr, Bishopscourt and 19 Auriga Rd, Retreat — roughly 15 minutes south of the Foreshore/CBD.',
        },
        {
          title: 'Clear Upfront Terms',
          description:
            'We encourage every client to confirm written scope, motor/equipment warranty coverage, and call-out fees before work begins.',
        },
      ],
      contactPageEyebrow: 'Cape Town Coverage & Contact',
      contactPageTitle: 'Direct dispatch from Bishopscourt & Retreat',
      contactPageSubtitle:
        'Serving residential estates, commercial offices, and industrial units across Cape Town. Speak directly with our team to schedule an inspection or confirm pricing.',
      footerCredit: 'Developed by Shepherd Zisper Phiri',
      updatedAt: now,
    },
    services: [
      {
        id: 'srv-gate-garage',
        order: 1,
        title: 'Gate & Garage Automation',
        category: 'Automation',
        summary:
          'Installation, motor replacements, battery backup upgrades, and mechanical repairs for residential driveways and commercial loading bays.',
        highlights: [
          'Sliding and swing gate motors (new installs & fault diagnostics)',
          'Custom steel driveway gates and track alignment',
          'Sectional & tip-up garage doors and garage door motors',
          'Industrial and commercial roller shutters',
        ],
        imageUrl: '/src/assets/images/service_gate_motor_1795439779271.jpg',
        featured: true,
        active: true,
        updatedAt: now,
      },
      {
        id: 'srv-perimeter-access',
        order: 2,
        title: 'Perimeter & Access Security',
        category: 'Perimeter',
        summary:
          'High-tension perimeter electric fencing and controlled entry hardware engineered for Cape Town homes, complexes, and business parks.',
        highlights: [
          'Wall-top and freestanding electric fencing (including solar-powered energizers)',
          'Electric strike locks and magnetic pedestrian gate locks',
          'Keypad, tag, and remote access control systems',
          'Wired and wireless audio/video intercom installations',
        ],
        imageUrl: '/src/assets/images/service_electric_fence_1795439779591.jpg',
        featured: false,
        active: true,
        updatedAt: now,
      },
      {
        id: 'srv-surveillance-alarms',
        order: 3,
        title: 'Surveillance & Alarms',
        category: 'Surveillance',
        summary:
          'Clear perimeter visibility and intrusion detection with wired or wireless alarm panels and multi-camera CCTV setups.',
        highlights: [
          'HD IP & analog CCTV camera installation, cabling, and NVR setup',
          'Existing camera fault-finding, power supply replacement, and repairs',
          'Wired and wireless intrusion alarm panels and perimeter beams',
          'Mobile remote viewing configuration and backup power sizing',
        ],
        imageUrl: '/src/assets/images/service_cctv_intercom_1795439779568.jpg',
        featured: false,
        active: true,
        updatedAt: now,
      },
      {
        id: 'srv-electrical-metalwork',
        order: 4,
        title: 'Electrical & Metalwork',
        category: 'Fabrication',
        summary:
          'Licensed electrical troubleshooting paired with in-house welding and custom steel fabrication for physical security barriers.',
        highlights: [
          'General electrical installations, isolators, and fault maintenance',
          'Custom steel gate fabrication, pedestrian gates, and hinge rebuilds',
          'Window burglar bars and security gate welding repairs',
          'Heavy-duty steel brackets for motors, cameras, and fencing',
        ],
        imageUrl: '/src/assets/images/service_steel_fabrication_1795439780499.jpg',
        featured: false,
        active: true,
        updatedAt: now,
      },
    ],
    news: [
      {
        id: 'news-1',
        title: 'Solar-Powered Electric Fence Energizer Kits Available for Southern Suburbs',
        category: 'Field Dispatch',
        suburb: 'Bishopscourt & Constantia',
        body: 'We are fitting compact monocrystalline solar panels alongside high-voltage energizers so perimeter fencing maintains full pulse output during extended grid outages.',
        imageUrl: '/src/assets/images/service_electric_fence_1795439779591.jpg',
        pinned: true,
        publishedAt: minutesAgo(25),
      },
      {
        id: 'news-2',
        title: 'Retreat Workshop: Custom Steel Gate & Burglar Bar Fabrication Slots Open',
        category: 'Project Log',
        suburb: 'Retreat & Tokai',
        body: 'Our 19 Auriga Rd metalwork team has fabrication capacity this week for galvanized sliding gates, roller shutter repairs, and custom window burglar bars.',
        imageUrl: '/src/assets/images/service_steel_fabrication_1795439780499.jpg',
        pinned: false,
        publishedAt: minutesAgo(110),
      },
      {
        id: 'news-3',
        title: 'Gate Motor Battery & Rack Check Advisory Ahead of Winter Rain',
        category: 'Safety Advisory',
        suburb: 'Cape Town Metro',
        body: 'Water ingress in underground conduits and worn 12V/24V backup batteries cause most sudden gate lockouts. Confirm call-out inspection pricing with our dispatch line before scheduling.',
        pinned: false,
        publishedAt: minutesAgo(260),
      },
      {
        id: 'news-4',
        title: 'Commercial Roller Shutter & Audio-Video Intercom Servicing',
        category: 'Promotion',
        suburb: 'Foreshore / CBD & Retreat',
        body: 'Multi-unit complexes and industrial warehouses within 15 minutes of our Retreat base can bundle CCTV camera cleaning with intercom and strike-lock testing.',
        imageUrl: '/src/assets/images/service_cctv_intercom_1795439779568.jpg',
        pinned: false,
        publishedAt: minutesAgo(480),
      },
    ],
    gallery: [
      {
        id: 'gal-1',
        title: 'Motorized Residential Driveway Gate',
        category: 'Gate Automation',
        url: '/src/assets/images/hero_cape_town_gate_1795439779507.jpg',
        caption: 'Automated sliding gate installation overlooking Table Mountain in Bishopscourt.',
        uploadedAt: now,
      },
      {
        id: 'gal-2',
        title: 'Heavy-Duty Sliding Gate Motor & Rack',
        category: 'Gate Automation',
        url: '/src/assets/images/service_gate_motor_1795439779271.jpg',
        caption: 'Weatherproof motor housing with galvanized steel gear rack and sealed conduit.',
        uploadedAt: now,
      },
      {
        id: 'gal-3',
        title: 'Solar Electric Perimeter Fencing',
        category: 'Perimeter Security',
        url: '/src/assets/images/service_electric_fence_1795439779591.jpg',
        caption: 'Multi-strand high-tension perimeter wiring paired with solar panel backup.',
        uploadedAt: now,
      },
      {
        id: 'gal-4',
        title: 'CCTV Cameras & Video Intercom Access',
        category: 'Surveillance & Access',
        url: '/src/assets/images/service_cctv_intercom_1795439779568.jpg',
        caption: 'Brushed stainless keypad intercom integrated with dome and bullet CCTV coverage.',
        uploadedAt: now,
      },
      {
        id: 'gal-5',
        title: 'Custom Steel Gate Welding & Fabrication',
        category: 'Metalwork',
        url: '/src/assets/images/service_steel_fabrication_1795439780499.jpg',
        caption: 'Precision TIG welding for driveway gates, frames, and security burglar bars.',
        uploadedAt: now,
      },
    ],
    faqs: [
      {
        id: 'faq-callout',
        order: 1,
        category: 'Call-Out Fees',
        question: 'How do call-out and diagnostic fees work before a technician visits?',
        answer:
          'Before any technician is dispatched to your property, confirm the call-out or fault-finding fee upfront when calling +27 73 415 4108 or submitting a quote request. That way you know the inspection cost before work begins, and whether the fee is offset against an approved repair or installation.',
        active: true,
      },
      {
        id: 'faq-warranty',
        order: 2,
        category: 'Warranty',
        question: 'What warranty applies to new gate motors, electric fencing, and repairs?',
        answer:
          'New hardware carries the applicable manufacturer warranty (such as gate motor units, electric fence energizers, and CCTV recorders), while installation and repair work carries agreed workmanship terms. Always ask for both hardware and workmanship warranty durations in writing before approving a deposit.',
        active: true,
      },
      {
        id: 'faq-areas',
        order: 3,
        category: 'Service Areas',
        question: 'Which Cape Town suburbs and property types do you cover?',
        answer:
          'Binwells Automation and Security Services serves residential homes, estates, commercial offices, and industrial facilities across Cape Town from listed bases at 112 Rhodes Dr, Bishopscourt and 19 Auriga Rd, Retreat (roughly 15 minutes south of the Foreshore/CBD depending on traffic).',
        active: true,
      },
      {
        id: 'faq-loadshedding',
        order: 4,
        category: 'Installations',
        question: 'Can my gate motor and electric fence keep running during grid outages?',
        answer:
          'Yes. We install and service 12V/24V backup batteries for sliding and swing gate motors as well as solar-powered electric fencing energizer setups so your perimeter stays active during outages.',
        active: true,
      },
      {
        id: 'faq-repairs',
        order: 5,
        category: 'Services',
        question: 'Do you repair existing security setups or only install new systems?',
        answer:
          'We handle both new installations and repairs—including sliding/swing gate motors, garage door motors, roller shutters, wired or wireless alarms, CCTV camera faults, electric strike locks, audio/video intercoms, electrical maintenance, and steel gate welding.',
        active: true,
      },
    ],
    inquiries: [],
    adminCredential: null,
  };
}

function loadStore(): PersistedStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PersistedStore>;
      const defaults = createInitialStore();
      const parsedBrand = (parsed.brand || {}) as Partial<BrandSettings>;
      const mergedBrand: BrandSettings = {...defaults.brand, ...parsedBrand};
      if (!Array.isArray(parsedBrand.heroImages) || parsedBrand.heroImages.length === 0) {
        const primary = mergedBrand.heroImageUrl || defaults.brand.heroImageUrl;
        mergedBrand.heroImages = Array.from(new Set([primary, ...defaults.brand.heroImages])).slice(0, 4);
      }
      if (typeof parsedBrand.heroImageOpacity !== 'number' || !Number.isFinite(parsedBrand.heroImageOpacity)) {
        mergedBrand.heroImageOpacity = defaults.brand.heroImageOpacity;
      }
      return {
        brand: mergedBrand,
        services: Array.isArray(parsed.services) ? parsed.services : defaults.services,
        news: Array.isArray(parsed.news) ? parsed.news : defaults.news,
        gallery: Array.isArray(parsed.gallery) ? parsed.gallery : defaults.gallery,
        faqs: Array.isArray(parsed.faqs) ? parsed.faqs : defaults.faqs,
        inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
        adminCredential: parsed.adminCredential ?? null,
      };
    }
  } catch (err) {
    console.error('Failed to read store.json, recreating initial store:', err);
  }
  const initial = createInitialStore();
  saveStore(initial);
  return initial;
}

function saveStore(nextStore: PersistedStore): void {
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(nextStore, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

let store = loadStore();

// Session tokens held in server memory
const activeSessions = new Map<string, number>();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, expiresAt] of activeSessions.entries()) {
    if (expiresAt <= now) {
      activeSessions.delete(token);
    }
  }
}

function createSessionToken(): string {
  cleanupExpiredSessions();
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  cleanupExpiredSessions();
  const expiresAt = activeSessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

function hashPassword(password: string, salt?: string): {salt: string; hash: string} {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return {salt: usedSalt, hash: derived};
}

function verifyPasswordAgainstEnv(candidate: string, envPasscode: string): boolean {
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(envPasscode).digest();
  return crypto.timingSafeEqual(a, b);
}

function verifyPasswordAgainstStored(candidate: string, cred: AdminCredential): boolean {
  const {hash} = hashPassword(candidate, cred.salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(cred.hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getEnvPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

function isAdminConfigured(): boolean {
  return Boolean(getEnvPasscode()) || Boolean(store.adminCredential);
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!isValidSessionToken(token)) {
    res.status(401).json({error: 'Admin authentication required.'});
    return;
  }
  next();
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function isSafeMediaOrWebUrl(value: string, allowEmpty = true): boolean {
  if (!value) return allowEmpty;
  if (value.startsWith('/src/assets/') || value.startsWith('/uploads/')) {
    return !value.includes('..');
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const VALID_NEWS_CATEGORIES: NewsCategory[] = [
  'Field Dispatch',
  'Safety Advisory',
  'Promotion',
  'Project Log',
];

const VALID_INQUIRY_STATUSES: InquiryStatus[] = ['New', 'Contacted', 'Scheduled', 'Completed'];

function detectImageType(buffer: Buffer): {ext: string; mime: string} | null {
  if (buffer.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return {ext: '.png', mime: 'image/png'};
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {ext: '.jpg', mime: 'image/jpeg'};
  }
  // WEBP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return {ext: '.webp', mime: 'image/webp'};
  }
  return null;
}

const app = express();
app.use(express.json({limit: '5mb'}));

// Prevent proxy/browser caching on dynamic API routes so image & copy updates sync immediately
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Serve uploaded UUID images safely with immutable browser caching
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    fallthrough: true,
    maxAge: '365d',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);

// Email helper (optional SMTP via environment variables)
function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getSmtpConfig() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const from = (process.env.SMTP_FROM || user || '').trim();
  return {host, port, user, pass, from};
}

function isSmtpConfigured(): boolean {
  const {host, user, pass} = getSmtpConfig();
  return Boolean(host && user && pass);
}

async function sendDomainEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const {host, port, user, pass, from} = getSmtpConfig();
  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured on the server.');
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {user, pass},
  });
  await transporter.sendMail({
    from: from || user,
    to: opts.to,
    replyTo: opts.replyTo || undefined,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}

// WebSocket setup with heartbeat for reliable network syncing
const server = http.createServer(app);
const wss = new WebSocketServer({server, path: '/ws'});
const adminSockets = new Set<WebSocket>();
const aliveSockets = new WeakSet<WebSocket>();

const heartbeatTimer = setInterval(() => {
  for (const client of wss.clients) {
    if (!aliveSockets.has(client)) {
      adminSockets.delete(client);
      client.terminate();
      continue;
    }
    aliveSockets.delete(client);
    client.ping();
  }
}, 30_000);

wss.on('close', () => {
  clearInterval(heartbeatTimer);
});

function getPublicState(): PublicSiteState {
  return {
    brand: store.brand,
    services: [...store.services].sort((a, b) => a.order - b.order),
    news: [...store.news].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }),
    gallery: [...store.gallery].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    ),
    faqs: [...store.faqs].sort((a, b) => a.order - b.order),
    connectedClients: wss.clients.size,
  };
}

function broadcastPublic(event: string, payload: unknown): void {
  const message = JSON.stringify({event, payload});
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function broadcastAdmins(event: string, payload: unknown): void {
  const message = JSON.stringify({event, payload});
  for (const client of adminSockets) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

wss.on('connection', (socket) => {
  aliveSockets.add(socket);
  socket.on('pong', () => {
    aliveSockets.add(socket);
  });

  socket.send(JSON.stringify({event: 'state:init', payload: getPublicState()}));
  broadcastPublic('clients:count', {connectedClients: wss.clients.size});

  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as {type?: string; token?: string};
      if (msg.type === 'admin:auth' && typeof msg.token === 'string') {
        if (isValidSessionToken(msg.token)) {
          adminSockets.add(socket);
          socket.send(JSON.stringify({event: 'admin:authed', payload: {ok: true}}));
        } else {
          adminSockets.delete(socket);
        }
      } else if (msg.type === 'admin:logout') {
        adminSockets.delete(socket);
      } else if (msg.type === 'state:request') {
        socket.send(JSON.stringify({event: 'state:init', payload: getPublicState()}));
      }
    } catch {
      // Ignore malformed client frames
    }
  });

  socket.on('close', () => {
    adminSockets.delete(socket);
    broadcastPublic('clients:count', {connectedClients: wss.clients.size});
  });
});

// Public state endpoint
app.get('/api/state', (_req, res) => {
  res.json(getPublicState());
});

// Public quote/service inquiry submission
app.post('/api/inquiries', (req, res) => {
  const body = req.body as Record<string, unknown>;
  const name = sanitizeText(body.name, 100);
  const phone = sanitizeText(body.phone, 40);
  const email = sanitizeText(body.email, 120);
  const suburb = sanitizeText(body.suburb, 100);
  const propertyType =
    body.propertyType === 'Commercial' || body.propertyType === 'Industrial'
      ? body.propertyType
      : 'Residential';
  const requestType =
    body.requestType === 'Repair & Maintenance' ? 'Repair & Maintenance' : 'New Installation';
  const serviceId = sanitizeText(body.serviceId, 60);
  const serviceMatch = store.services.find((s) => s.id === serviceId);
  const serviceTitle = serviceMatch ? serviceMatch.title : sanitizeText(body.serviceTitle, 100) || 'General Inquiry';
  const details = sanitizeText(body.details, 1500);

  if (!name || name.length < 2) {
    res.status(400).json({error: 'Please enter your name.'});
    return;
  }
  if (!phone || phone.length < 7) {
    res.status(400).json({error: 'Please enter a valid Cape Town contact number.'});
    return;
  }
  if (!suburb) {
    res.status(400).json({error: 'Please enter your suburb or area.'});
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({error: 'Please enter a valid email address or leave it blank.'});
    return;
  }

  const inquiry: QuoteInquiry = {
    id: `inq-${crypto.randomUUID().slice(0, 8)}`,
    name,
    phone,
    email,
    suburb,
    propertyType,
    requestType,
    serviceId: serviceMatch?.id || serviceId || 'general',
    serviceTitle,
    confirmCalloutFee: Boolean(body.confirmCalloutFee),
    confirmWarranty: Boolean(body.confirmWarranty),
    confirmScope: Boolean(body.confirmScope),
    details,
    status: 'New',
    createdAt: new Date().toISOString(),
  };

  store.inquiries = [inquiry, ...store.inquiries].slice(0, 200);
  saveStore(store);

  broadcastAdmins('admin:inquiry_created', inquiry);

  // Forward quote inquiry via SMTP if configured
  const recipient = store.brand.contactEmail || getSmtpConfig().user;
  if (isSmtpConfigured() && recipient) {
    const confirmations = [
      inquiry.confirmCalloutFee && 'Call-out fee confirmation requested',
      inquiry.confirmWarranty && 'Warranty terms requested',
      inquiry.confirmScope && 'Written scope requested',
    ]
      .filter(Boolean)
      .join(', ');

    void sendDomainEmail({
      to: recipient,
      replyTo: inquiry.email || undefined,
      subject: `[Binwells Quote ${inquiry.id}] ${inquiry.serviceTitle} — ${inquiry.suburb}`,
      text: [
        `New ${inquiry.requestType} Inquiry (${inquiry.id})`,
        `Name: ${inquiry.name}`,
        `Phone: ${inquiry.phone}`,
        `Email: ${inquiry.email || 'Not provided'}`,
        `Suburb: ${inquiry.suburb}`,
        `Property: ${inquiry.propertyType}`,
        `Service: ${inquiry.serviceTitle}`,
        `Upfront Requests: ${confirmations || 'Standard quote'}`,
        `Details: ${inquiry.details || 'None'}`,
      ].join('\n'),
      html: `
        <h2>New ${escapeHtml(inquiry.requestType)} Inquiry (${escapeHtml(inquiry.id)})</h2>
        <p><strong>Name:</strong> ${escapeHtml(inquiry.name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(inquiry.phone)}</p>
        <p><strong>Email:</strong> ${escapeHtml(inquiry.email || 'Not provided')}</p>
        <p><strong>Suburb:</strong> ${escapeHtml(inquiry.suburb)}</p>
        <p><strong>Property Type:</strong> ${escapeHtml(inquiry.propertyType)}</p>
        <p><strong>Service:</strong> ${escapeHtml(inquiry.serviceTitle)}</p>
        <p><strong>Upfront Confirmations:</strong> ${escapeHtml(confirmations || 'Standard quote')}</p>
        <p><strong>Details:</strong><br/>${escapeHtml(inquiry.details || 'None provided')}</p>
      `,
    }).catch((err) => {
      console.error('Failed to send inquiry notification email:', err instanceof Error ? err.message : err);
    });
  }

  res.status(201).json({ok: true, id: inquiry.id, createdAt: inquiry.createdAt});
});

// Admin auth status
app.get('/api/admin/status', (req, res) => {
  const token = extractBearerToken(req);
  res.json({
    configured: isAdminConfigured(),
    envOverride: Boolean(getEnvPasscode()),
    authenticated: isValidSessionToken(token),
    smtpConfigured: isSmtpConfigured(),
  });
});

// Protected: Test domain email SMTP delivery
app.post('/api/admin/test-email', requireAdmin, async (req, res) => {
  const target = sanitizeText(req.body?.to, 120) || store.brand.contactEmail || getSmtpConfig().user;
  if (!isSmtpConfigured()) {
    res.status(400).json({
      error: 'SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured on the server yet.',
    });
    return;
  }
  if (!target || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
    res.status(400).json({error: 'Enter a valid business email address first.'});
    return;
  }
  try {
    await sendDomainEmail({
      to: target,
      subject: `Test Notification — ${store.brand.companyName}`,
      text: `Your domain email notifications for ${store.brand.companyName} are working properly.`,
      html: `<p>Your domain email notifications for <strong>${escapeHtml(store.brand.companyName)}</strong> are working properly.</p>`,
    });
    res.json({ok: true, sentTo: target});
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'SMTP delivery failed.',
    });
  }
});

// First-run admin claim (only when no env passcode and no stored credential exist)
app.post('/api/admin/claim', (req, res) => {
  if (getEnvPasscode()) {
    res.status(409).json({error: 'Admin passcode is managed by server environment configuration.'});
    return;
  }
  if (store.adminCredential) {
    res.status(409).json({error: 'Admin passcode has already been claimed. Please sign in.'});
    return;
  }
  const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
  if (password.length < 6 || password.length > 128) {
    res.status(400).json({error: 'Passcode must be between 6 and 128 characters.'});
    return;
  }

  const {salt, hash} = hashPassword(password);
  store.adminCredential = {
    salt,
    hash,
    claimedAt: new Date().toISOString(),
  };
  saveStore(store);

  const token = createSessionToken();
  res.status(201).json({token});
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
  if (!password) {
    res.status(400).json({error: 'Passcode is required.'});
    return;
  }

  const envPass = getEnvPasscode();
  let valid = false;
  if (envPass) {
    valid = verifyPasswordAgainstEnv(password, envPass);
  } else if (store.adminCredential) {
    valid = verifyPasswordAgainstStored(password, store.adminCredential);
  } else {
    res.status(409).json({error: 'Admin passcode is not set yet. Claim your passcode first.'});
    return;
  }

  if (!valid) {
    res.status(401).json({error: 'Incorrect admin passcode.'});
    return;
  }

  const token = createSessionToken();
  res.json({token});
});

app.post('/api/admin/logout', (req, res) => {
  const token = extractBearerToken(req);
  if (token) activeSessions.delete(token);
  res.json({ok: true});
});

// Protected: Upload image (PNG, JPEG, WEBP up to 3MB)
app.post('/api/admin/upload', requireAdmin, (req, res) => {
  const dataBase64 = typeof req.body?.dataBase64 === 'string' ? req.body.dataBase64 : '';
  const title = sanitizeText(req.body?.title, 100);
  const category = sanitizeText(req.body?.category, 60) || 'Site Media';
  const caption = sanitizeText(req.body?.caption, 240);
  const addToGallery = Boolean(req.body?.addToGallery);

  if (!dataBase64) {
    res.status(400).json({error: 'Missing image data.'});
    return;
  }

  const cleanBase64 = dataBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  if (buffer.length === 0 || buffer.length > 3 * 1024 * 1024) {
    res.status(400).json({error: 'Image must be non-empty and under 3 MB.'});
    return;
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    res.status(400).json({error: 'Only PNG, JPEG, and WEBP image files are permitted.'});
    return;
  }

  const safeFilename = `${crypto.randomUUID()}${detected.ext}`;
  const targetPath = path.resolve(UPLOADS_DIR, safeFilename);
  if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
    res.status(400).json({error: 'Invalid upload destination.'});
    return;
  }

  fs.writeFileSync(targetPath, buffer);
  const publicUrl = `/uploads/${safeFilename}`;

  let galleryEntry: GalleryImage | null = null;
  if (addToGallery) {
    galleryEntry = {
      id: `gal-${crypto.randomUUID().slice(0, 8)}`,
      title: title || 'Uploaded Site Image',
      category,
      url: publicUrl,
      caption: caption || 'Uploaded via Binwells Admin Console.',
      uploadedAt: new Date().toISOString(),
    };
    store.gallery = [galleryEntry, ...store.gallery];
    saveStore(store);
    broadcastPublic('gallery:updated', getPublicState().gallery);
  }

  res.status(201).json({url: publicUrl, galleryEntry});
});

// Protected: Brand & Logo updates
app.put('/api/admin/brand', requireAdmin, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const heroImageUrl = sanitizeText(b.heroImageUrl, 300);
  const logoUrl = sanitizeText(b.logoUrl, 300);
  const facebookUrl = sanitizeText(b.facebookUrl, 300);

  if (!isSafeMediaOrWebUrl(heroImageUrl, false)) {
    res.status(400).json({error: 'Hero image URL must be a valid relative asset or http(s) URL.'});
    return;
  }

  const rawHeroImages = Array.isArray(b.heroImages) ? b.heroImages : store.brand.heroImages;
  const sanitizedHeroImages = Array.from(
    new Set(
      rawHeroImages
        .map((u) => sanitizeText(u, 300))
        .filter((u) => Boolean(u) && isSafeMediaOrWebUrl(u, false)),
    ),
  ).slice(0, 8);

  const resolvedHeroImages =
    sanitizedHeroImages.length > 0 ? sanitizedHeroImages : [heroImageUrl];
  const resolvedHeroPrimary = resolvedHeroImages[0] || heroImageUrl;

  const rawOpacity =
    typeof b.heroImageOpacity === 'number' && Number.isFinite(b.heroImageOpacity)
      ? b.heroImageOpacity
      : store.brand.heroImageOpacity;
  const heroImageOpacity = Math.min(95, Math.max(20, Math.round(rawOpacity / 5) * 5));

  if (!isSafeMediaOrWebUrl(logoUrl, true)) {
    res.status(400).json({error: 'Logo URL must be a valid relative asset or http(s) URL.'});
    return;
  }
  if (!isSafeMediaOrWebUrl(facebookUrl, true)) {
    res.status(400).json({error: 'Facebook URL must start with http:// or https://.'});
    return;
  }

  const phrasesRaw = Array.isArray(b.typewriterPhrases) ? b.typewriterPhrases : store.brand.typewriterPhrases;
  const typewriterPhrases = phrasesRaw
    .map((p) => sanitizeText(p, 120))
    .filter(Boolean)
    .slice(0, 8);

  const pillarsRaw = Array.isArray(b.aboutPillars) ? b.aboutPillars : store.brand.aboutPillars;
  const aboutPillars = pillarsRaw
    .map((item) => {
      const obj = item as Record<string, unknown>;
      return {
        title: sanitizeText(obj?.title, 80),
        description: sanitizeText(obj?.description, 260),
      };
    })
    .filter((p) => p.title && p.description)
    .slice(0, 6);

  const contactEmail = sanitizeText(b.contactEmail, 120);
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    res.status(400).json({error: 'Business email address format is invalid.'});
    return;
  }

  const updated: BrandSettings = {
    companyName: sanitizeText(b.companyName, 120) || store.brand.companyName,
    tradingAs: sanitizeText(b.tradingAs, 120) || store.brand.tradingAs,
    tagline: sanitizeText(b.tagline, 160) || store.brand.tagline,
    heroTitle: sanitizeText(b.heroTitle, 180) || store.brand.heroTitle,
    heroSubtitle: sanitizeText(b.heroSubtitle, 450) || store.brand.heroSubtitle,
    heroImageUrl: resolvedHeroPrimary,
    heroImages: resolvedHeroImages,
    heroImageOpacity,
    typewriterPhrases:
      typewriterPhrases.length > 0 ? typewriterPhrases : store.brand.typewriterPhrases,
    logoUrl,
    primaryPhone: sanitizeText(b.primaryPhone, 40) || store.brand.primaryPhone,
    secondaryPhone: sanitizeText(b.secondaryPhone, 40) || store.brand.secondaryPhone,
    contactEmail,
    bishopscourtAddress: sanitizeText(b.bishopscourtAddress, 180) || store.brand.bishopscourtAddress,
    retreatAddress: sanitizeText(b.retreatAddress, 180) || store.brand.retreatAddress,
    retreatNote: sanitizeText(b.retreatNote, 220) || store.brand.retreatNote,
    facebookPageName: sanitizeText(b.facebookPageName, 120) || store.brand.facebookPageName,
    facebookUrl: facebookUrl || store.brand.facebookUrl,
    operatingHours: sanitizeText(b.operatingHours, 160) || store.brand.operatingHours,
    transparencyNote: sanitizeText(b.transparencyNote, 500) || store.brand.transparencyNote,
    homeOverviewEyebrow: sanitizeText(b.homeOverviewEyebrow, 80) || store.brand.homeOverviewEyebrow,
    homeOverviewTitle: sanitizeText(b.homeOverviewTitle, 180) || store.brand.homeOverviewTitle,
    homeOverviewSubtitle: sanitizeText(b.homeOverviewSubtitle, 400) || store.brand.homeOverviewSubtitle,
    servicesPageEyebrow: sanitizeText(b.servicesPageEyebrow, 80) || store.brand.servicesPageEyebrow,
    servicesPageTitle: sanitizeText(b.servicesPageTitle, 180) || store.brand.servicesPageTitle,
    servicesPageSubtitle: sanitizeText(b.servicesPageSubtitle, 400) || store.brand.servicesPageSubtitle,
    aboutPageEyebrow: sanitizeText(b.aboutPageEyebrow, 80) || store.brand.aboutPageEyebrow,
    aboutPageTitle: sanitizeText(b.aboutPageTitle, 180) || store.brand.aboutPageTitle,
    aboutPageSubtitle: sanitizeText(b.aboutPageSubtitle, 400) || store.brand.aboutPageSubtitle,
    aboutStoryTitle: sanitizeText(b.aboutStoryTitle, 180) || store.brand.aboutStoryTitle,
    aboutStoryBody: sanitizeText(b.aboutStoryBody, 700) || store.brand.aboutStoryBody,
    aboutPillars: aboutPillars.length > 0 ? aboutPillars : store.brand.aboutPillars,
    contactPageEyebrow: sanitizeText(b.contactPageEyebrow, 80) || store.brand.contactPageEyebrow,
    contactPageTitle: sanitizeText(b.contactPageTitle, 180) || store.brand.contactPageTitle,
    contactPageSubtitle: sanitizeText(b.contactPageSubtitle, 400) || store.brand.contactPageSubtitle,
    footerCredit: sanitizeText(b.footerCredit, 120) || store.brand.footerCredit,
    updatedAt: new Date().toISOString(),
  };

  store.brand = updated;
  saveStore(store);
  broadcastPublic('brand:updated', updated);
  res.json(updated);
});

// Protected: Services CRUD
app.post('/api/admin/services', requireAdmin, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const title = sanitizeText(b.title, 100);
  const category = sanitizeText(b.category, 60) || 'Security';
  const summary = sanitizeText(b.summary, 400);
  const imageUrl = sanitizeText(b.imageUrl, 300) || '/src/assets/images/service_gate_motor_1795439779271.jpg';
  const highlightsRaw = Array.isArray(b.highlights) ? b.highlights : [];
  const highlights = highlightsRaw
    .map((h) => sanitizeText(h, 160))
    .filter(Boolean)
    .slice(0, 8);

  if (!title || !summary) {
    res.status(400).json({error: 'Service title and summary are required.'});
    return;
  }
  if (!isSafeMediaOrWebUrl(imageUrl, false)) {
    res.status(400).json({error: 'Invalid service image URL.'});
    return;
  }

  const nextOrder = store.services.reduce((max, s) => Math.max(max, s.order), 0) + 1;
  const created: ServiceItem = {
    id: `srv-${crypto.randomUUID().slice(0, 8)}`,
    order: nextOrder,
    title,
    category,
    summary,
    highlights: highlights.length > 0 ? highlights : ['Installation and maintenance across Cape Town'],
    imageUrl,
    featured: Boolean(b.featured),
    active: b.active !== false,
    updatedAt: new Date().toISOString(),
  };

  store.services = [...store.services, created];
  saveStore(store);
  const sorted = getPublicState().services;
  broadcastPublic('services:updated', sorted);
  res.status(201).json(created);
});

app.put('/api/admin/services/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 60);
  const idx = store.services.findIndex((s) => s.id === id);
  if (idx === -1) {
    res.status(404).json({error: 'Service not found.'});
    return;
  }

  const b = req.body as Record<string, unknown>;
  const existing = store.services[idx];
  const imageUrl = sanitizeText(b.imageUrl, 300) || existing.imageUrl;
  if (!isSafeMediaOrWebUrl(imageUrl, false)) {
    res.status(400).json({error: 'Invalid service image URL.'});
    return;
  }

  const highlightsRaw = Array.isArray(b.highlights) ? b.highlights : existing.highlights;
  const highlights = highlightsRaw
    .map((h) => sanitizeText(h, 160))
    .filter(Boolean)
    .slice(0, 8);

  const updated: ServiceItem = {
    ...existing,
    order: typeof b.order === 'number' && Number.isFinite(b.order) ? Math.max(1, Math.round(b.order)) : existing.order,
    title: sanitizeText(b.title, 100) || existing.title,
    category: sanitizeText(b.category, 60) || existing.category,
    summary: sanitizeText(b.summary, 400) || existing.summary,
    highlights: highlights.length > 0 ? highlights : existing.highlights,
    imageUrl,
    featured: typeof b.featured === 'boolean' ? b.featured : existing.featured,
    active: typeof b.active === 'boolean' ? b.active : existing.active,
    updatedAt: new Date().toISOString(),
  };

  store.services[idx] = updated;
  saveStore(store);
  const sorted = getPublicState().services;
  broadcastPublic('services:updated', sorted);
  res.json(updated);
});

app.delete('/api/admin/services/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 60);
  const prevLen = store.services.length;
  store.services = store.services.filter((s) => s.id !== id);
  if (store.services.length === prevLen) {
    res.status(404).json({error: 'Service not found.'});
    return;
  }
  saveStore(store);
  const sorted = getPublicState().services;
  broadcastPublic('services:updated', sorted);
  res.json({ok: true});
});

// Protected: Live News Feed CRUD
app.post('/api/admin/news', requireAdmin, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const title = sanitizeText(b.title, 140);
  const category = VALID_NEWS_CATEGORIES.includes(b.category as NewsCategory)
    ? (b.category as NewsCategory)
    : 'Field Dispatch';
  const suburb = sanitizeText(b.suburb, 80) || 'Cape Town';
  const body = sanitizeText(b.body, 600);
  const imageUrl = sanitizeText(b.imageUrl, 300);

  if (!title || !body) {
    res.status(400).json({error: 'Headline and dispatch summary are required.'});
    return;
  }
  if (!isSafeMediaOrWebUrl(imageUrl, true)) {
    res.status(400).json({error: 'Invalid image URL.'});
    return;
  }

  const item: NewsItem = {
    id: `news-${crypto.randomUUID().slice(0, 8)}`,
    title,
    category,
    suburb,
    body,
    imageUrl: imageUrl || undefined,
    pinned: Boolean(b.pinned),
    publishedAt: new Date().toISOString(),
  };

  store.news = [item, ...store.news].slice(0, 60);
  saveStore(store);
  broadcastPublic('news:created', item);
  res.status(201).json(item);
});

app.put('/api/admin/news/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 60);
  const idx = store.news.findIndex((n) => n.id === id);
  if (idx === -1) {
    res.status(404).json({error: 'News item not found.'});
    return;
  }

  const b = req.body as Record<string, unknown>;
  const existing = store.news[idx];
  const imageUrl = typeof b.imageUrl === 'string' ? sanitizeText(b.imageUrl, 300) : existing.imageUrl || '';
  if (!isSafeMediaOrWebUrl(imageUrl, true)) {
    res.status(400).json({error: 'Invalid image URL.'});
    return;
  }

  const updated: NewsItem = {
    ...existing,
    title: sanitizeText(b.title, 140) || existing.title,
    category: VALID_NEWS_CATEGORIES.includes(b.category as NewsCategory)
      ? (b.category as NewsCategory)
      : existing.category,
    suburb: sanitizeText(b.suburb, 80) || existing.suburb,
    body: sanitizeText(b.body, 600) || existing.body,
    imageUrl: imageUrl || undefined,
    pinned: typeof b.pinned === 'boolean' ? b.pinned : existing.pinned,
  };

  store.news[idx] = updated;
  saveStore(store);
  broadcastPublic('news:updated', updated);
  res.json(updated);
});

app.delete('/api/admin/news/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 60);
  const prevLen = store.news.length;
  store.news = store.news.filter((n) => n.id !== id);
  if (store.news.length === prevLen) {
    res.status(404).json({error: 'News item not found.'});
    return;
  }
  saveStore(store);
  broadcastPublic('news:deleted', {id});
  res.json({ok: true});
});

// Protected: Gallery CRUD
app.post('/api/admin/gallery', requireAdmin, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const title = sanitizeText(b.title, 100);
  const category = sanitizeText(b.category, 60) || 'Installations';
  const url = sanitizeText(b.url, 300);
  const caption = sanitizeText(b.caption, 240);

  if (!title || !url || !isSafeMediaOrWebUrl(url, false)) {
    res.status(400).json({error: 'Valid image title and URL are required.'});
    return;
  }

  const item: GalleryImage = {
    id: `gal-${crypto.randomUUID().slice(0, 8)}`,
    title,
    category,
    url,
    caption: caption || title,
    uploadedAt: new Date().toISOString(),
  };

  store.gallery = [item, ...store.gallery];
  saveStore(store);
  broadcastPublic('gallery:updated', getPublicState().gallery);
  res.status(201).json(item);
});

app.delete('/api/admin/gallery/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 60);
  const prevLen = store.gallery.length;
  store.gallery = store.gallery.filter((g) => g.id !== id);
  if (store.gallery.length === prevLen) {
    res.status(404).json({error: 'Gallery image not found.'});
    return;
  }
  saveStore(store);
  broadcastPublic('gallery:updated', getPublicState().gallery);
  res.json({ok: true});
});

// Protected: FAQs CRUD
app.post('/api/admin/faqs', requireAdmin, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const category = sanitizeText(b.category, 60) || 'General';
  const question = sanitizeText(b.question, 220);
  const answer = sanitizeText(b.answer, 1200);

  if (!question || !answer) {
    res.status(400).json({error: 'Both question and answer are required.'});
    return;
  }

  const nextOrder = store.faqs.reduce((max, f) => Math.max(max, f.order), 0) + 1;
  const created: FaqItem = {
    id: `faq-${crypto.randomUUID().slice(0, 8)}`,
    order: typeof b.order === 'number' && Number.isFinite(b.order) ? Math.max(1, Math.round(b.order)) : nextOrder,
    category,
    question,
    answer,
    active: b.active !== false,
  };

  store.faqs = [...store.faqs, created];
  saveStore(store);
  const sorted = getPublicState().faqs;
  broadcastPublic('faqs:updated', sorted);
  res.status(201).json(created);
});

app.put('/api/admin/faqs/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 60);
  const idx = store.faqs.findIndex((f) => f.id === id);
  if (idx === -1) {
    res.status(404).json({error: 'FAQ not found.'});
    return;
  }

  const b = req.body as Record<string, unknown>;
  const existing = store.faqs[idx];
  const updated: FaqItem = {
    ...existing,
    order: typeof b.order === 'number' && Number.isFinite(b.order) ? Math.max(1, Math.round(b.order)) : existing.order,
    category: sanitizeText(b.category, 60) || existing.category,
    question: sanitizeText(b.question, 220) || existing.question,
    answer: sanitizeText(b.answer, 1200) || existing.answer,
    active: typeof b.active === 'boolean' ? b.active : existing.active,
  };

  store.faqs[idx] = updated;
  saveStore(store);
  const sorted = getPublicState().faqs;
  broadcastPublic('faqs:updated', sorted);
  res.json(updated);
});

app.delete('/api/admin/faqs/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 60);
  const prevLen = store.faqs.length;
  store.faqs = store.faqs.filter((f) => f.id !== id);
  if (store.faqs.length === prevLen) {
    res.status(404).json({error: 'FAQ not found.'});
    return;
  }
  saveStore(store);
  const sorted = getPublicState().faqs;
  broadcastPublic('faqs:updated', sorted);
  res.json({ok: true});
});

// Protected: Customer Inquiries queue
app.get('/api/admin/inquiries', requireAdmin, (_req, res) => {
  res.json(store.inquiries);
});

app.patch('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 60);
  const idx = store.inquiries.findIndex((i) => i.id === id);
  if (idx === -1) {
    res.status(404).json({error: 'Inquiry not found.'});
    return;
  }
  const status = req.body?.status;
  if (!VALID_INQUIRY_STATUSES.includes(status)) {
    res.status(400).json({error: 'Invalid inquiry status.'});
    return;
  }
  store.inquiries[idx] = {...store.inquiries[idx], status};
  saveStore(store);
  res.json(store.inquiries[idx]);
});

app.delete('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
  const id = sanitizeText(req.params.id, 60);
  store.inquiries = store.inquiries.filter((i) => i.id !== id);
  saveStore(store);
  res.json({ok: true});
});

async function startServer() {
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Binwells Automation & Security server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
