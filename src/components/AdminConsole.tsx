import {ChangeEvent, FormEvent, useCallback, useEffect, useState} from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  Lock,
  LogOut,
  Mail,
  Plus,
  Settings,
  Trash2,
  Upload,
  Wrench,
} from 'lucide-react';
import type {
  AdminStatus,
  BrandSettings,
  FaqItem,
  GalleryImage,
  InquiryStatus,
  PublicSiteState,
  QuoteInquiry,
  ServiceItem,
} from '../types.ts';
import {clampHeroOpacity, getHeroOpacityClass} from '../utils/heroOpacity.ts';
import {BrandMark} from './BrandMark.tsx';
import {ResilientImage} from './ResilientImage.tsx';

type AdminTab = 'pages' | 'brand' | 'services' | 'media' | 'faqs' | 'inquiries';

interface AdminConsoleProps {
  siteState: PublicSiteState;
  adminToken: string | null;
  onAdminTokenChange: (token: string | null) => void;
  inquiries: QuoteInquiry[];
  onInquiriesChange: (items: QuoteInquiry[]) => void;
  onExitAdmin: () => void;
}

const INQUIRY_STATUSES: InquiryStatus[] = ['New', 'Contacted', 'Scheduled', 'Completed'];

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

export function AdminConsole({
  siteState,
  adminToken,
  onAdminTokenChange,
  inquiries,
  onInquiriesChange,
  onExitAdmin,
}: AdminConsoleProps) {
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('pages');
  const [feedback, setFeedback] = useState<{type: 'ok' | 'err'; text: string} | null>(null);

  // Service editor state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [srvTitle, setSrvTitle] = useState('');
  const [srvCategory, setSrvCategory] = useState('Automation');
  const [srvSummary, setSrvSummary] = useState('');
  const [srvHighlightsText, setSrvHighlightsText] = useState('');
  const [srvImageUrl, setSrvImageUrl] = useState(siteState.gallery[0]?.url || '');
  const [srvFeatured, setSrvFeatured] = useState(false);
  const [srvActive, setSrvActive] = useState(true);
  const [srvBusy, setSrvBusy] = useState(false);

  // FAQ editor state
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqCategory, setFaqCategory] = useState('Warranty');
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqActive, setFaqActive] = useState(true);
  const [faqBusy, setFaqBusy] = useState(false);

  // Brand & Page Copy draft state
  const [brandDraft, setBrandDraft] = useState<BrandSettings>(siteState.brand);
  const [phrasesText, setPhrasesText] = useState(siteState.brand.typewriterPhrases.join('\n'));
  const [heroSlideUrlInput, setHeroSlideUrlInput] = useState('');
  const [brandBusy, setBrandBusy] = useState(false);

  // Media upload state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Installations');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadUrlInput, setUploadUrlInput] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [testEmailBusy, setTestEmailBusy] = useState(false);

  useEffect(() => {
    setBrandDraft(siteState.brand);
    setPhrasesText(siteState.brand.typewriterPhrases.join('\n'));
  }, [siteState.brand]);

  const fetchAdminStatus = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
      const res = await fetch('/api/admin/status', {headers});
      if (res.ok) {
        const status = (await res.json()) as AdminStatus;
        setAdminStatus(status);
        if (adminToken && !status.authenticated) {
          onAdminTokenChange(null);
        }
      }
    } catch {
      // Ignore transient network errors
    }
  }, [adminToken, onAdminTokenChange]);

  useEffect(() => {
    void fetchAdminStatus();
  }, [fetchAdminStatus]);

  const fetchInquiries = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/inquiries', {
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      if (res.ok) {
        const list = (await res.json()) as QuoteInquiry[];
        onInquiriesChange(list);
      }
    } catch {
      // Ignore
    }
  }, [adminToken, onInquiriesChange]);

  useEffect(() => {
    if (adminToken) {
      void fetchInquiries();
    }
  }, [adminToken, fetchInquiries]);

  function notify(type: 'ok' | 'err', text: string) {
    setFeedback({type, text});
  }

  async function handleClaimAdmin(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    if (authPassword.trim().length < 6) {
      setAuthError('Choose a passcode with at least 6 characters.');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('Passcodes do not match.');
      return;
    }
    setAuthBusy(true);
    try {
      const res = await fetch('/api/admin/claim', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password: authPassword}),
      });
      const data = (await res.json()) as {token?: string; error?: string};
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Could not claim admin passcode.');
      }
      setAuthPassword('');
      setAuthConfirmPassword('');
      onAdminTokenChange(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Claim failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    if (!authPassword.trim()) {
      setAuthError('Enter your admin passcode.');
      return;
    }
    setAuthBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password: authPassword}),
      });
      const data = (await res.json()) as {token?: string; error?: string};
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Invalid passcode.');
      }
      setAuthPassword('');
      onAdminTokenChange(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    if (adminToken) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {Authorization: `Bearer ${adminToken}`},
      }).catch(() => {});
    }
    onAdminTokenChange(null);
  }

  async function uploadImageFile(
    file: File,
    opts?: {title?: string; category?: string; caption?: string; addToGallery?: boolean},
  ): Promise<string> {
    if (!adminToken) throw new Error('Not authenticated.');
    if (file.size > 3 * 1024 * 1024) {
      throw new Error('Image must be smaller than 3 MB.');
    }
    const dataBase64 = await readFileAsBase64(file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        dataBase64,
        title: opts?.title || file.name.replace(/\.[^.]+$/, ''),
        category: opts?.category || 'Site Media',
        caption: opts?.caption || '',
        addToGallery: Boolean(opts?.addToGallery),
      }),
    });
    const data = (await res.json()) as {url?: string; error?: string};
    if (!res.ok || !data.url) {
      throw new Error(data.error || 'Upload failed.');
    }
    return data.url;
  }

  // Service actions
  function startEditService(srv: ServiceItem) {
    setEditingServiceId(srv.id);
    setSrvTitle(srv.title);
    setSrvCategory(srv.category);
    setSrvSummary(srv.summary);
    setSrvHighlightsText(srv.highlights.join('\n'));
    setSrvImageUrl(srv.imageUrl);
    setSrvFeatured(srv.featured);
    setSrvActive(srv.active);
  }

  function resetServiceForm() {
    setEditingServiceId(null);
    setSrvTitle('');
    setSrvCategory('Automation');
    setSrvSummary('');
    setSrvHighlightsText('');
    setSrvImageUrl(siteState.gallery[0]?.url || '');
    setSrvFeatured(false);
    setSrvActive(true);
  }

  async function handleSaveService(e: FormEvent) {
    e.preventDefault();
    if (!adminToken) return;
    if (!srvTitle.trim() || !srvSummary.trim()) {
      notify('err', 'Service title and summary are required.');
      return;
    }
    const highlights = srvHighlightsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    setSrvBusy(true);
    try {
      const url = editingServiceId
        ? `/api/admin/services/${editingServiceId}`
        : '/api/admin/services';
      const method = editingServiceId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: srvTitle.trim(),
          category: srvCategory.trim(),
          summary: srvSummary.trim(),
          highlights,
          imageUrl: srvImageUrl.trim(),
          featured: srvFeatured,
          active: srvActive,
        }),
      });
      const data = (await res.json()) as {error?: string};
      if (!res.ok) throw new Error(data.error || 'Could not save service.');
      notify(
        'ok',
        editingServiceId
          ? 'Service updated and synced live.'
          : 'New service added and synced live.',
      );
      resetServiceForm();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Service save failed.');
    } finally {
      setSrvBusy(false);
    }
  }

  async function handleDeleteService(id: string) {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      if (!res.ok) throw new Error('Could not delete service.');
      if (editingServiceId === id) resetServiceForm();
      notify('ok', 'Service removed and synced live.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  // FAQ actions
  function startEditFaq(faq: FaqItem) {
    setEditingFaqId(faq.id);
    setFaqCategory(faq.category);
    setFaqQuestion(faq.question);
    setFaqAnswer(faq.answer);
    setFaqActive(faq.active);
  }

  function resetFaqForm() {
    setEditingFaqId(null);
    setFaqCategory('Warranty');
    setFaqQuestion('');
    setFaqAnswer('');
    setFaqActive(true);
  }

  async function handleSaveFaq(e: FormEvent) {
    e.preventDefault();
    if (!adminToken) return;
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      notify('err', 'FAQ question and answer are required.');
      return;
    }

    setFaqBusy(true);
    try {
      const url = editingFaqId
        ? `/api/admin/faqs/${editingFaqId}`
        : '/api/admin/faqs';
      const method = editingFaqId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          category: faqCategory.trim() || 'General',
          question: faqQuestion.trim(),
          answer: faqAnswer.trim(),
          active: faqActive,
        }),
      });
      const data = (await res.json()) as {error?: string};
      if (!res.ok) throw new Error(data.error || 'Could not save FAQ.');
      notify(
        'ok',
        editingFaqId
          ? 'FAQ updated and synced live.'
          : 'New FAQ added and synced live.',
      );
      resetFaqForm();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'FAQ save failed.');
    } finally {
      setFaqBusy(false);
    }
  }

  async function handleToggleFaqActive(faq: FaqItem) {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/faqs/${faq.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({active: !faq.active}),
      });
      const data = (await res.json()) as {error?: string};
      if (!res.ok) throw new Error(data.error || 'Could not update FAQ visibility.');
      notify('ok', `FAQ ${!faq.active ? 'published' : 'hidden'} live.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Visibility update failed.');
    }
  }

  async function handleDeleteFaq(id: string) {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/faqs/${id}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      if (!res.ok) throw new Error('Could not delete FAQ.');
      if (editingFaqId === id) resetFaqForm();
      notify('ok', 'FAQ removed and synced live.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'FAQ delete failed.');
    }
  }

  async function handleServiceImageFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSrvBusy(true);
    try {
      const uploadedUrl = await uploadImageFile(file, {
        title: srvTitle || file.name,
        category: 'Service Media',
        addToGallery: true,
      });
      setSrvImageUrl(uploadedUrl);
      notify('ok', 'Service image uploaded. Save service to publish.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setSrvBusy(false);
      e.target.value = '';
    }
  }

  // Brand & Page Copy actions
  async function persistBrand(nextBrand: BrandSettings, successMessage: string) {
    if (!adminToken) return;
    setBrandBusy(true);
    try {
      const res = await fetch('/api/admin/brand', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(nextBrand),
      });
      const data = (await res.json()) as BrandSettings & {error?: string};
      if (!res.ok) throw new Error(data.error || 'Failed to update settings.');
      notify('ok', successMessage);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setBrandBusy(false);
    }
  }

  async function handleSaveBrandAndPages(e: FormEvent) {
    e.preventDefault();
    const parsedPhrases = phrasesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const payload: BrandSettings = {
      ...brandDraft,
      typewriterPhrases:
        parsedPhrases.length > 0 ? parsedPhrases : brandDraft.typewriterPhrases,
    };
    await persistBrand(payload, 'All site pages, copy & brand settings broadcast live.');
  }

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !adminToken) return;
    setBrandBusy(true);
    try {
      const url = await uploadImageFile(file, {
        title: 'Company Logo',
        category: 'Branding',
        addToGallery: false,
      });
      const nextBrand = {...brandDraft, logoUrl: url};
      setBrandDraft(nextBrand);
      await persistBrand(nextBrand, 'Custom logo uploaded and live across all sessions.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Logo upload failed.');
      setBrandBusy(false);
    } finally {
      e.target.value = '';
    }
  }

  async function handleHeroUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !adminToken) return;
    setBrandBusy(true);
    try {
      const url = await uploadImageFile(file, {
        title: 'Hero Carousel Photo',
        category: 'Hero',
        addToGallery: true,
      });
      const existingSlides =
        Array.isArray(brandDraft.heroImages) && brandDraft.heroImages.length > 0
          ? brandDraft.heroImages
          : [brandDraft.heroImageUrl];
      const nextSlides = Array.from(new Set([url, ...existingSlides])).slice(0, 8);
      const nextBrand = {
        ...brandDraft,
        heroImageUrl: nextSlides[0],
        heroImages: nextSlides,
      };
      setBrandDraft(nextBrand);
      await persistBrand(nextBrand, 'Hero carousel updated and synced live.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Hero upload failed.');
      setBrandBusy(false);
    } finally {
      e.target.value = '';
    }
  }

  function updateDraftHeroSlides(nextSlides: string[]) {
    const cleaned = Array.from(new Set(nextSlides.filter(Boolean))).slice(0, 8);
    if (cleaned.length === 0) return;
    setBrandDraft((prev) => ({
      ...prev,
      heroImageUrl: cleaned[0],
      heroImages: cleaned,
    }));
  }

  function handleAddHeroSlideFromInput() {
    const url = heroSlideUrlInput.trim();
    if (!url) return;
    const current =
      Array.isArray(brandDraft.heroImages) && brandDraft.heroImages.length > 0
        ? brandDraft.heroImages
        : [brandDraft.heroImageUrl];
    updateDraftHeroSlides([...current, url]);
    setHeroSlideUrlInput('');
  }

  function handleMoveHeroSlide(index: number, delta: -1 | 1) {
    const current = [...(brandDraft.heroImages || [brandDraft.heroImageUrl])];
    const target = index + delta;
    if (target < 0 || target >= current.length) return;
    [current[index], current[target]] = [current[target], current[index]];
    updateDraftHeroSlides(current);
  }

  function handleRemoveHeroSlide(url: string) {
    const current = brandDraft.heroImages || [brandDraft.heroImageUrl];
    if (current.length <= 1) {
      notify('err', 'At least 1 hero background image is required.');
      return;
    }
    updateDraftHeroSlides(current.filter((u) => u !== url));
  }

  async function handleApplyOpacityLive(nextOpacity: number) {
    const clamped = clampHeroOpacity(nextOpacity);
    const nextBrand = {...brandDraft, heroImageOpacity: clamped};
    setBrandDraft(nextBrand);
    await persistBrand(nextBrand, `Hero image opacity set to ${clamped}% live.`);
  }

  // Gallery / Media actions
  async function handleGalleryUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadBusy(true);
    try {
      await uploadImageFile(file, {
        title: uploadTitle.trim() || file.name.replace(/\.[^.]+$/, ''),
        category: uploadCategory.trim() || 'Installations',
        caption: uploadCaption.trim() || 'Uploaded via Admin Console.',
        addToGallery: true,
      });
      setUploadTitle('');
      setUploadCaption('');
      notify('ok', 'Image uploaded to gallery and synced live.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadBusy(false);
      e.target.value = '';
    }
  }

  async function handleDeleteGalleryImage(img: GalleryImage) {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/gallery/${img.id}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      if (!res.ok) throw new Error('Could not delete gallery image.');
      notify('ok', 'Gallery image removed.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  async function handleToggleGalleryInHero(url: string) {
    const current =
      Array.isArray(siteState.brand.heroImages) && siteState.brand.heroImages.length > 0
        ? siteState.brand.heroImages
        : [siteState.brand.heroImageUrl];
    const exists = current.includes(url);
    if (exists && current.length <= 1) {
      notify('err', 'At least 1 image must remain in the Hero Carousel.');
      return;
    }
    const nextSlides = exists
      ? current.filter((item) => item !== url)
      : [url, ...current].slice(0, 8);
    await persistBrand(
      {
        ...siteState.brand,
        heroImageUrl: nextSlides[0],
        heroImages: nextSlides,
      },
      exists
        ? 'Removed image from Hero Carousel live.'
        : 'Added image to Hero Carousel live.',
    );
  }

  async function handleAssignToService(imageUrl: string, serviceId: string) {
    if (!adminToken || !serviceId) return;
    try {
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({imageUrl}),
      });
      if (!res.ok) throw new Error('Could not assign image to service.');
      notify('ok', 'Service image updated and synced live across the network.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Service update failed.');
    }
  }

  async function handleAddGalleryUrl(e: FormEvent) {
    e.preventDefault();
    if (!adminToken) return;
    if (!uploadUrlInput.trim()) {
      notify('err', 'Enter an image URL starting with https:// or /uploads/.');
      return;
    }
    setUploadBusy(true);
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: uploadTitle.trim() || 'Site Photo',
          category: uploadCategory.trim() || 'Installations',
          url: uploadUrlInput.trim(),
          caption: uploadCaption.trim() || 'Added via Admin Console.',
        }),
      });
      const data = (await res.json()) as {error?: string};
      if (!res.ok) throw new Error(data.error || 'Could not add gallery URL.');
      setUploadTitle('');
      setUploadCaption('');
      setUploadUrlInput('');
      notify('ok', 'Image URL added to gallery and synced across all viewers.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Add URL failed.');
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleTestEmail() {
    if (!adminToken) return;
    setTestEmailBusy(true);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({to: brandDraft.contactEmail}),
      });
      const data = (await res.json()) as {sentTo?: string; error?: string};
      if (!res.ok) throw new Error(data.error || 'Failed to send test email.');
      notify('ok', `Test email sent to ${data.sentTo}.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Test email failed.');
    } finally {
      setTestEmailBusy(false);
    }
  }

  async function handleUpdateInquiryStatus(id: string, status: InquiryStatus) {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({status}),
      });
      if (!res.ok) throw new Error('Could not update inquiry status.');
      const updated = (await res.json()) as QuoteInquiry;
      onInquiriesChange(inquiries.map((i) => (i.id === id ? updated : i)));
      notify('ok', `Inquiry marked as ${status}.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Status update failed.');
    }
  }

  async function handleDeleteInquiry(id: string) {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      if (!res.ok) throw new Error('Could not remove inquiry.');
      onInquiriesChange(inquiries.filter((i) => i.id !== id));
      notify('ok', 'Inquiry removed.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  function updatePillar(index: number, field: 'title' | 'description', value: string) {
    const next = brandDraft.aboutPillars.map((p, i) =>
      i === index ? {...p, [field]: value} : p,
    );
    setBrandDraft({...brandDraft, aboutPillars: next});
  }

  // Unauthenticated gate (Claim on first run or Login)
  if (!adminToken) {
    const needsClaim = adminStatus !== null && !adminStatus.configured && !adminStatus.envOverride;

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-16 px-6 flex items-center justify-center">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BrandMark logoUrl={siteState.brand.logoUrl} companyName={siteState.brand.companyName} />
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {needsClaim ? 'Set Admin Passcode' : 'Admin Console Sign-In'}
                </h1>
                <p className="text-xs text-slate-500">Binwells Real-Time Content Control</p>
              </div>
            </div>
            <Lock className="w-5 h-5 text-slate-400" aria-hidden="true" />
          </div>

          {needsClaim ? (
            <form onSubmit={handleClaimAdmin} className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                No admin passcode has been configured yet. Set a passcode now to lock the console
                and customize every page, logo, image, and service.
              </p>
              <div>
                <label htmlFor="claim-pass" className="block text-xs font-medium text-slate-700 mb-1.5">
                  New Admin Passcode (min 6 characters)
                </label>
                <input
                  id="claim-pass"
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
                />
              </div>
              <div>
                <label htmlFor="claim-confirm" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Confirm Passcode
                </label>
                <input
                  id="claim-confirm"
                  type="password"
                  required
                  value={authConfirmPassword}
                  onChange={(e) => setAuthConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
                />
              </div>
              {authError && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {authError}
                </p>
              )}
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {authBusy ? 'Claiming Admin Access...' : 'Claim & Open Admin Console'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-sm text-slate-600">
                Enter your administrator passcode to customize pages, services, brand logo, and gallery photos.
              </p>
              <div>
                <label htmlFor="login-pass" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Admin Passcode
                </label>
                <input
                  id="login-pass"
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
                />
              </div>
              {authError && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {authError}
                </p>
              )}
              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {authBusy ? 'Signing In...' : 'Sign In to Console'}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={onExitAdmin}
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Return to Public Website
          </button>
        </div>
      </div>
    );
  }

  const navItems: {id: AdminTab; label: string; icon: typeof FileText; count?: number}[] = [
    {id: 'pages', label: 'Pages & Copy', icon: FileText},
    {id: 'brand', label: 'Brand, Logo & Contact', icon: Settings},
    {id: 'services', label: 'Services Editor', icon: Wrench, count: siteState.services.length},
    {id: 'media', label: 'Images & Gallery', icon: ImageIcon, count: siteState.gallery.length},
    {id: 'faqs', label: 'FAQ Manager', icon: HelpCircle, count: siteState.faqs.length},
    {
      id: 'inquiries',
      label: 'Quote Inquiries',
      icon: Inbox,
      count: inquiries.filter((i) => i.status === 'New').length,
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-8">
        {/* Console Top Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              View Live Site
            </button>
            <span className="text-slate-300" aria-hidden="true">/</span>
            <h1 className="text-lg font-bold text-slate-900">Admin Console</h1>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {siteState.connectedClients} live client{siteState.connectedClients === 1 ? '' : 's'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sign Out
          </button>
        </div>

        {feedback && (
          <div
            role="status"
            className={`mt-5 flex items-center justify-between gap-4 px-4 py-3 text-sm rounded-lg border ${
              feedback.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-medium underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && (
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        active ? 'text-amber-300' : 'text-slate-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {/* Main Workspace */}
          <div className="lg:col-span-9 space-y-6">
            {/* TAB 1: PAGES & COPY (HOME, SERVICES, ABOUT US, CONTACT US, FOOTER) */}
            {activeTab === 'pages' && (
              <form
                onSubmit={handleSaveBrandAndPages}
                className="space-y-6"
              >
                {/* Home Page Hero & Typewriter */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Home Page — Animated Hero &amp; Overview</h2>
                    <p className="text-xs text-slate-500">
                      Customize the hero headline, animated typewriter lines, and what-we-do overview.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="pg-hero-title" className="block text-xs font-medium text-slate-700 mb-1">
                      Hero Main Headline
                    </label>
                    <input
                      id="pg-hero-title"
                      type="text"
                      value={brandDraft.heroTitle}
                      onChange={(e) => setBrandDraft({...brandDraft, heroTitle: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="pg-typewriter" className="block text-xs font-medium text-slate-700 mb-1">
                      Hero Typewriter Phrases (One phrase per line)
                    </label>
                    <textarea
                      id="pg-typewriter"
                      rows={4}
                      value={phrasesText}
                      onChange={(e) => setPhrasesText(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="pg-hero-sub" className="block text-xs font-medium text-slate-700 mb-1">
                      Hero Subtitle
                    </label>
                    <textarea
                      id="pg-hero-sub"
                      rows={2}
                      value={brandDraft.heroSubtitle}
                      onChange={(e) => setBrandDraft({...brandDraft, heroSubtitle: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label htmlFor="pg-home-eye" className="block text-xs font-medium text-slate-700 mb-1">
                        Overview Eyebrow
                      </label>
                      <input
                        id="pg-home-eye"
                        type="text"
                        value={brandDraft.homeOverviewEyebrow}
                        onChange={(e) => setBrandDraft({...brandDraft, homeOverviewEyebrow: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="pg-home-title" className="block text-xs font-medium text-slate-700 mb-1">
                        Overview Heading
                      </label>
                      <input
                        id="pg-home-title"
                        type="text"
                        value={brandDraft.homeOverviewTitle}
                        onChange={(e) => setBrandDraft({...brandDraft, homeOverviewTitle: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="pg-home-sub" className="block text-xs font-medium text-slate-700 mb-1">
                      Overview Description
                    </label>
                    <textarea
                      id="pg-home-sub"
                      rows={2}
                      value={brandDraft.homeOverviewSubtitle}
                      onChange={(e) => setBrandDraft({...brandDraft, homeOverviewSubtitle: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Services Page Header */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Services Page Header</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="pg-srv-eye" className="block text-xs font-medium text-slate-700 mb-1">
                        Eyebrow
                      </label>
                      <input
                        id="pg-srv-eye"
                        type="text"
                        value={brandDraft.servicesPageEyebrow}
                        onChange={(e) => setBrandDraft({...brandDraft, servicesPageEyebrow: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="pg-srv-title" className="block text-xs font-medium text-slate-700 mb-1">
                        Page Title
                      </label>
                      <input
                        id="pg-srv-title"
                        type="text"
                        value={brandDraft.servicesPageTitle}
                        onChange={(e) => setBrandDraft({...brandDraft, servicesPageTitle: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="pg-srv-sub" className="block text-xs font-medium text-slate-700 mb-1">
                      Page Subtitle
                    </label>
                    <textarea
                      id="pg-srv-sub"
                      rows={2}
                      value={brandDraft.servicesPageSubtitle}
                      onChange={(e) => setBrandDraft({...brandDraft, servicesPageSubtitle: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* About Us Page Content */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-base font-bold text-slate-900">About Us Page &amp; Company Pillars</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="pg-abt-eye" className="block text-xs font-medium text-slate-700 mb-1">
                        Eyebrow
                      </label>
                      <input
                        id="pg-abt-eye"
                        type="text"
                        value={brandDraft.aboutPageEyebrow}
                        onChange={(e) => setBrandDraft({...brandDraft, aboutPageEyebrow: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="pg-abt-title" className="block text-xs font-medium text-slate-700 mb-1">
                        Page Title
                      </label>
                      <input
                        id="pg-abt-title"
                        type="text"
                        value={brandDraft.aboutPageTitle}
                        onChange={(e) => setBrandDraft({...brandDraft, aboutPageTitle: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="pg-abt-sub" className="block text-xs font-medium text-slate-700 mb-1">
                      Page Subtitle
                    </label>
                    <input
                      id="pg-abt-sub"
                      type="text"
                      value={brandDraft.aboutPageSubtitle}
                      onChange={(e) => setBrandDraft({...brandDraft, aboutPageSubtitle: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="pg-abt-story-title" className="block text-xs font-medium text-slate-700 mb-1">
                      Story Heading
                    </label>
                    <input
                      id="pg-abt-story-title"
                      type="text"
                      value={brandDraft.aboutStoryTitle}
                      onChange={(e) => setBrandDraft({...brandDraft, aboutStoryTitle: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="pg-abt-story-body" className="block text-xs font-medium text-slate-700 mb-1">
                      Story Body
                    </label>
                    <textarea
                      id="pg-abt-story-body"
                      rows={3}
                      value={brandDraft.aboutStoryBody}
                      onChange={(e) => setBrandDraft({...brandDraft, aboutStoryBody: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    {brandDraft.aboutPillars.map((pillar, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <label className="block text-xs font-semibold text-slate-700">
                          Pillar {idx + 1} Title
                        </label>
                        <input
                          type="text"
                          value={pillar.title}
                          onChange={(e) => updatePillar(idx, 'title', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                        />
                        <label className="block text-xs font-semibold text-slate-700">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={pillar.description}
                          onChange={(e) => updatePillar(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Page & Footer Credit */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-base font-bold text-slate-900">Contact Page &amp; Footer Credit</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="pg-cnt-eye" className="block text-xs font-medium text-slate-700 mb-1">
                        Contact Eyebrow
                      </label>
                      <input
                        id="pg-cnt-eye"
                        type="text"
                        value={brandDraft.contactPageEyebrow}
                        onChange={(e) => setBrandDraft({...brandDraft, contactPageEyebrow: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="pg-cnt-title" className="block text-xs font-medium text-slate-700 mb-1">
                        Contact Heading
                      </label>
                      <input
                        id="pg-cnt-title"
                        type="text"
                        value={brandDraft.contactPageTitle}
                        onChange={(e) => setBrandDraft({...brandDraft, contactPageTitle: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="pg-cnt-sub" className="block text-xs font-medium text-slate-700 mb-1">
                      Contact Subtitle
                    </label>
                    <textarea
                      id="pg-cnt-sub"
                      rows={2}
                      value={brandDraft.contactPageSubtitle}
                      onChange={(e) => setBrandDraft({...brandDraft, contactPageSubtitle: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="pg-transparency" className="block text-xs font-medium text-slate-700 mb-1">
                      Upfront Scope, Warranty &amp; Call-Out Notice
                    </label>
                    <textarea
                      id="pg-transparency"
                      rows={2}
                      value={brandDraft.transparencyNote}
                      onChange={(e) => setBrandDraft({...brandDraft, transparencyNote: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="pg-footer-credit" className="block text-xs font-medium text-slate-700 mb-1">
                      Footer Developer Credit
                    </label>
                    <input
                      id="pg-footer-credit"
                      type="text"
                      value={brandDraft.footerCredit}
                      onChange={(e) => setBrandDraft({...brandDraft, footerCredit: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={brandBusy}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {brandBusy ? 'Publishing...' : 'Save & Broadcast All Pages'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 2: BRAND, LOGO & CONTACT DETAILS */}
            {activeTab === 'brand' && (
              <form
                onSubmit={handleSaveBrandAndPages}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
              >
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-base font-bold text-slate-900">Brand Identity, Logo &amp; Locations</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Updates sync instantaneously to all active visitors.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                    <span className="block text-xs font-semibold text-slate-800">Company Logo</span>
                    <div className="flex items-center gap-4">
                      <BrandMark
                        logoUrl={brandDraft.logoUrl}
                        companyName={brandDraft.companyName}
                        sizeClass="w-12 h-12"
                      />
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap">
                          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                          Upload Logo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleLogoUpload}
                            className="sr-only"
                          />
                        </label>
                        {brandDraft.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setBrandDraft({...brandDraft, logoUrl: ''})}
                            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                          >
                            Use Default Emblem
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="text"
                      aria-label="Logo Image URL"
                      value={brandDraft.logoUrl}
                      onChange={(e) => setBrandDraft({...brandDraft, logoUrl: e.target.value})}
                      placeholder="Or paste HTTPS logo URL..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>

                  <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="block text-xs font-semibold text-slate-800">
                        Hero Carousel &amp; Background Opacity
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {(brandDraft.heroImages?.length || 1)} slide
                        {(brandDraft.heroImages?.length || 1) === 1 ? '' : 's'} ·{' '}
                        {clampHeroOpacity(brandDraft.heroImageOpacity)}% opacity
                      </span>
                    </div>

                    {/* Live Hero Opacity Preview */}
                    <div className="relative h-28 rounded-lg overflow-hidden bg-slate-950 border border-slate-300">
                      <div
                        className={`absolute inset-0 transition-opacity duration-200 ${getHeroOpacityClass(
                          brandDraft.heroImageOpacity,
                        )}`}
                      >
                        <ResilientImage
                          src={brandDraft.heroImages?.[0] || brandDraft.heroImageUrl}
                          alt="Hero opacity preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/20" />
                      <div className="relative z-10 h-full px-4 flex flex-col justify-center">
                        <span className="text-sm font-bold text-white line-clamp-1">
                          {brandDraft.heroTitle}
                        </span>
                        <span className="text-xs text-amber-400 font-medium mt-0.5">
                          Live Opacity Preview ({clampHeroOpacity(brandDraft.heroImageOpacity)}%)
                        </span>
                      </div>
                    </div>

                    {/* Opacity Slider & Quick Presets */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label
                          htmlFor="hero-opacity-slider"
                          className="text-xs font-medium text-slate-700"
                        >
                          Image Brightness / Opacity
                        </label>
                        <div className="flex items-center gap-1.5">
                          {[35, 55, 75, 90].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleApplyOpacityLive(preset)}
                              disabled={brandBusy}
                              className={`px-2 py-0.5 text-xs font-mono tabular-nums rounded border transition-colors cursor-pointer ${
                                clampHeroOpacity(brandDraft.heroImageOpacity) === preset
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          id="hero-opacity-slider"
                          type="range"
                          min={20}
                          max={95}
                          step={5}
                          value={clampHeroOpacity(brandDraft.heroImageOpacity)}
                          onChange={(e) =>
                            setBrandDraft({
                              ...brandDraft,
                              heroImageOpacity: Number(e.target.value),
                            })
                          }
                          className="flex-1 accent-amber-600 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleApplyOpacityLive(brandDraft.heroImageOpacity ?? 55)
                          }
                          disabled={brandBusy}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                        >
                          Apply Live
                        </button>
                      </div>
                    </div>

                    {/* Active Carousel Slides */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-700">
                          Carousel Slides (auto-rotates every 5.5s)
                        </span>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap">
                          <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                          Add Photo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleHeroUpload}
                            className="sr-only"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {(brandDraft.heroImages && brandDraft.heroImages.length > 0
                          ? brandDraft.heroImages
                          : [brandDraft.heroImageUrl]
                        ).map((slideUrl, idx, arr) => (
                          <div
                            key={`${slideUrl}-${idx}`}
                            className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col"
                          >
                            <div className="aspect-[16/10] bg-slate-100 relative">
                              <ResilientImage
                                src={slideUrl}
                                alt={`Hero slide ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[11px] font-mono tabular-nums font-semibold bg-slate-950/80 text-white rounded">
                                #{idx + 1}
                              </span>
                            </div>
                            <div className="p-1.5 flex items-center justify-between gap-1 bg-white">
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  aria-label={`Move slide ${idx + 1} earlier`}
                                  disabled={idx === 0}
                                  onClick={() => handleMoveHeroSlide(idx, -1)}
                                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Move slide ${idx + 1} later`}
                                  disabled={idx === arr.length - 1}
                                  onClick={() => handleMoveHeroSlide(idx, 1)}
                                  className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove slide ${idx + 1}`}
                                onClick={() => handleRemoveHeroSlide(slideUrl)}
                                className="p-1 text-slate-500 hover:text-red-700 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <select
                          aria-label="Add existing gallery photo to hero carousel"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const current =
                                brandDraft.heroImages?.length
                                  ? brandDraft.heroImages
                                  : [brandDraft.heroImageUrl];
                              updateDraftHeroSlides([...current, e.target.value]);
                              e.target.value = '';
                            }
                          }}
                          className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-700"
                        >
                          <option value="">+ Pick from Gallery...</option>
                          {siteState.gallery.map((g) => (
                            <option key={g.id} value={g.url}>
                              {g.title}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            aria-label="Add Hero Slide URL"
                            value={heroSlideUrlInput}
                            onChange={(e) => setHeroSlideUrlInput(e.target.value)}
                            placeholder="Or paste HTTPS image URL..."
                            className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                          />
                          <button
                            type="button"
                            onClick={handleAddHeroSlideFromInput}
                            aria-label="Add slide URL"
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer shrink-0 inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand-name" className="block text-xs font-medium text-slate-700 mb-1">
                      Company Name
                    </label>
                    <input
                      id="brand-name"
                      type="text"
                      value={brandDraft.companyName}
                      onChange={(e) => setBrandDraft({...brandDraft, companyName: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="brand-trading" className="block text-xs font-medium text-slate-700 mb-1">
                      Trading / Facebook Page Name
                    </label>
                    <input
                      id="brand-trading"
                      type="text"
                      value={brandDraft.facebookPageName}
                      onChange={(e) => setBrandDraft({...brandDraft, facebookPageName: e.target.value, tradingAs: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand-tagline" className="block text-xs font-medium text-slate-700 mb-1">
                      Footer Tagline
                    </label>
                    <input
                      id="brand-tagline"
                      type="text"
                      value={brandDraft.tagline}
                      onChange={(e) => setBrandDraft({...brandDraft, tagline: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="brand-fb-url" className="block text-xs font-medium text-slate-700 mb-1">
                      Facebook URL
                    </label>
                    <input
                      id="brand-fb-url"
                      type="url"
                      value={brandDraft.facebookUrl}
                      onChange={(e) => setBrandDraft({...brandDraft, facebookUrl: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand-phone1" className="block text-xs font-medium text-slate-700 mb-1">
                      Primary Phone
                    </label>
                    <input
                      id="brand-phone1"
                      type="text"
                      value={brandDraft.primaryPhone}
                      onChange={(e) => setBrandDraft({...brandDraft, primaryPhone: e.target.value})}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="brand-phone2" className="block text-xs font-medium text-slate-700 mb-1">
                      Secondary / Promo Phone
                    </label>
                    <input
                      id="brand-phone2"
                      type="text"
                      value={brandDraft.secondaryPhone}
                      onChange={(e) => setBrandDraft({...brandDraft, secondaryPhone: e.target.value})}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand-addr1" className="block text-xs font-medium text-slate-700 mb-1">
                      Bishopscourt Address
                    </label>
                    <input
                      id="brand-addr1"
                      type="text"
                      value={brandDraft.bishopscourtAddress}
                      onChange={(e) => setBrandDraft({...brandDraft, bishopscourtAddress: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="brand-addr2" className="block text-xs font-medium text-slate-700 mb-1">
                      Retreat Address
                    </label>
                    <input
                      id="brand-addr2"
                      type="text"
                      value={brandDraft.retreatAddress}
                      onChange={(e) => setBrandDraft({...brandDraft, retreatAddress: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand-retreat-note" className="block text-xs font-medium text-slate-700 mb-1">
                      Retreat Distance Note
                    </label>
                    <input
                      id="brand-retreat-note"
                      type="text"
                      value={brandDraft.retreatNote}
                      onChange={(e) => setBrandDraft({...brandDraft, retreatNote: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="brand-hours" className="block text-xs font-medium text-slate-700 mb-1">
                      Operating Hours
                    </label>
                    <input
                      id="brand-hours"
                      type="text"
                      value={brandDraft.operatingHours}
                      onChange={(e) => setBrandDraft({...brandDraft, operatingHours: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Domain Email & SMTP Forwarding */}
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-amber-700" aria-hidden="true" />
                      <span className="text-xs font-semibold text-slate-900">
                        Domain Email &amp; Quote Forwarding
                      </span>
                    </div>
                    <span className="text-xs font-medium text-slate-600">
                      {adminStatus?.smtpConfigured
                        ? 'SMTP Active on Server'
                        : 'SMTP Env Vars Not Set Yet'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-8">
                      <label htmlFor="brand-email" className="block text-xs font-medium text-slate-700 mb-1">
                        Business Email (shown on Contact Us &amp; receives quote alerts)
                      </label>
                      <input
                        id="brand-email"
                        type="email"
                        value={brandDraft.contactEmail}
                        onChange={(e) => setBrandDraft({...brandDraft, contactEmail: e.target.value})}
                        placeholder="e.g. info@binwells.co.za"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <button
                        type="button"
                        onClick={handleTestEmail}
                        disabled={testEmailBusy}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                      >
                        {testEmailBusy ? 'Sending...' : 'Send Test Email'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    To forward quote submissions to your domain inbox, configure{' '}
                    <code className="font-mono">SMTP_HOST</code>, <code className="font-mono">SMTP_PORT</code>,{' '}
                    <code className="font-mono">SMTP_USER</code>, and <code className="font-mono">SMTP_PASS</code>{' '}
                    in your deployment secrets.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={brandBusy}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {brandBusy ? 'Saving...' : 'Save & Broadcast Brand Settings'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: SERVICES EDITOR */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                <form
                  onSubmit={handleSaveService}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                      {editingServiceId ? 'Edit Service Offering' : 'Add New Service Offering'}
                    </h2>
                    {editingServiceId && (
                      <button
                        type="button"
                        onClick={resetServiceForm}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="srv-title" className="block text-xs font-medium text-slate-700 mb-1">
                        Service Title *
                      </label>
                      <input
                        id="srv-title"
                        type="text"
                        required
                        value={srvTitle}
                        onChange={(e) => setSrvTitle(e.target.value)}
                        placeholder="e.g. Gate & Garage Automation"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="srv-cat" className="block text-xs font-medium text-slate-700 mb-1">
                        Category Label
                      </label>
                      <input
                        id="srv-cat"
                        type="text"
                        value={srvCategory}
                        onChange={(e) => setSrvCategory(e.target.value)}
                        placeholder="e.g. Automation, Perimeter, Surveillance"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="srv-summary" className="block text-xs font-medium text-slate-700 mb-1">
                      Summary *
                    </label>
                    <textarea
                      id="srv-summary"
                      rows={2}
                      required
                      value={srvSummary}
                      onChange={(e) => setSrvSummary(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label htmlFor="srv-highlights" className="block text-xs font-medium text-slate-700 mb-1">
                      Scope Bullet Points (One per line)
                    </label>
                    <textarea
                      id="srv-highlights"
                      rows={4}
                      value={srvHighlightsText}
                      onChange={(e) => setSrvHighlightsText(e.target.value)}
                      placeholder={'Sliding and swing gate motors\nDriveway gates & tracks\nGarage doors and roller shutters'}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                      <label htmlFor="srv-img-select" className="block text-xs font-medium text-slate-700 mb-1">
                        Select Service Image
                      </label>
                      <select
                        id="srv-img-select"
                        value={srvImageUrl}
                        onChange={(e) => setSrvImageUrl(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        {siteState.gallery.map((g) => (
                          <option key={g.id} value={g.url}>
                            {g.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap">
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        Upload New Service Photo
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleServiceImageFile}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div className="flex items-center gap-6">
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={srvActive}
                          onChange={(e) => setSrvActive(e.target.checked)}
                          className="rounded border-slate-300 text-amber-600"
                        />
                        Visible on Public Site
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={srvFeatured}
                          onChange={(e) => setSrvFeatured(e.target.checked)}
                          className="rounded border-slate-300 text-amber-600"
                        />
                        Featured Wide Card
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={srvBusy}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      {srvBusy ? 'Saving...' : editingServiceId ? 'Save Changes Live' : 'Create Service'}
                    </button>
                  </div>
                </form>

                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                  <div className="px-6 py-4">
                    <h3 className="text-sm font-bold text-slate-900">Current Services</h3>
                  </div>
                  {siteState.services.map((srv) => (
                    <div key={srv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <ResilientImage
                          src={srv.imageUrl}
                          alt={srv.title}
                          className="w-20 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{srv.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{srv.active ? 'Active' : 'Hidden'}</span>
                            {srv.featured && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-700 font-medium">Featured</span>
                              </>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 mt-0.5">{srv.title}</h4>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{srv.summary}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditService(srv)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(srv.id)}
                          aria-label={`Delete ${srv.title}`}
                          className="p-1.5 text-slate-500 hover:text-red-700 border border-slate-200 rounded-lg hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: IMAGES & GALLERY */}
            {activeTab === 'media' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h2 className="text-base font-bold text-slate-900">Upload New Installation or Site Photo</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="up-title" className="block text-xs font-medium text-slate-700 mb-1">
                        Photo Title
                      </label>
                      <input
                        id="up-title"
                        type="text"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="e.g. Constantia Swing Gate Motor"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="up-cat" className="block text-xs font-medium text-slate-700 mb-1">
                        Category
                      </label>
                      <input
                        id="up-cat"
                        type="text"
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="up-cap" className="block text-xs font-medium text-slate-700 mb-1">
                        Caption
                      </label>
                      <input
                        id="up-cap"
                        type="text"
                        value={uploadCaption}
                        onChange={(e) => setUploadCaption(e.target.value)}
                        placeholder="Brief technical description"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <span className="text-xs text-slate-500">PNG, JPEG, or WEBP up to 3 MB — syncs live to all connected viewers</span>
                    <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      {uploadBusy ? 'Uploading...' : 'Choose & Upload Image'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleGalleryUpload}
                        disabled={uploadBusy}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <form onSubmit={handleAddGalleryUrl} className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                    <input
                      type="url"
                      aria-label="External CDN Image URL"
                      value={uploadUrlInput}
                      onChange={(e) => setUploadUrlInput(e.target.value)}
                      placeholder="Or paste an external HTTPS CDN image URL..."
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      disabled={uploadBusy}
                      className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 cursor-pointer whitespace-nowrap"
                    >
                      Add Image URL
                    </button>
                  </form>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {siteState.gallery.map((img) => {
                    const heroList =
                      Array.isArray(siteState.brand.heroImages) &&
                      siteState.brand.heroImages.length > 0
                        ? siteState.brand.heroImages
                        : [siteState.brand.heroImageUrl];
                    const isHero = heroList.includes(img.url);
                    return (
                      <div key={img.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                        <div className="aspect-[4/3] bg-slate-100">
                          <ResilientImage
                            src={img.url}
                            alt={img.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <div className="text-xs text-slate-500">{img.category}</div>
                            <h4 className="text-sm font-semibold text-slate-900 mt-0.5">{img.title}</h4>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{img.caption}</p>
                          </div>
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleGalleryInHero(img.url)}
                                className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                                  isHero
                                    ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {isHero ? 'In Hero Carousel (Remove)' : '+ Add to Hero Carousel'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGalleryImage(img)}
                                aria-label={`Delete ${img.title}`}
                                className="p-1.5 text-slate-500 hover:text-red-700 rounded-md hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                            <select
                              aria-label={`Assign ${img.title} to a service`}
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  void handleAssignToService(img.url, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700"
                            >
                              <option value="">Assign to service...</option>
                              {siteState.services.map((srv) => (
                                <option key={srv.id} value={srv.id}>
                                  {srv.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: FAQ MANAGER */}
            {activeTab === 'faqs' && (
              <div className="space-y-6">
                <form
                  onSubmit={handleSaveFaq}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {editingFaqId ? 'Edit FAQ Entry' : 'Add New FAQ Entry'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Displayed in the accordion on the About Us page and synced live across sessions.
                      </p>
                    </div>
                    {editingFaqId && (
                      <button
                        type="button"
                        onClick={resetFaqForm}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="faq-cat" className="block text-xs font-medium text-slate-700 mb-1">
                        Topic Category
                      </label>
                      <input
                        id="faq-cat"
                        type="text"
                        list="faq-category-suggestions"
                        required
                        value={faqCategory}
                        onChange={(e) => setFaqCategory(e.target.value)}
                        placeholder="e.g. Warranty, Call-Out Fees"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                      <datalist id="faq-category-suggestions">
                        <option value="Call-Out Fees" />
                        <option value="Warranty" />
                        <option value="Service Areas" />
                        <option value="Installations" />
                        <option value="Services" />
                      </datalist>
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="faq-question" className="block text-xs font-medium text-slate-700 mb-1">
                        Question
                      </label>
                      <input
                        id="faq-question"
                        type="text"
                        required
                        value={faqQuestion}
                        onChange={(e) => setFaqQuestion(e.target.value)}
                        placeholder="e.g. How do call-out fees work before an assessment?"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="faq-answer" className="block text-xs font-medium text-slate-700 mb-1">
                      Answer
                    </label>
                    <textarea
                      id="faq-answer"
                      rows={4}
                      required
                      value={faqAnswer}
                      onChange={(e) => setFaqAnswer(e.target.value)}
                      placeholder="Write a clear, transparent answer covering terms, coverage, or pricing..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={faqActive}
                        onChange={(e) => setFaqActive(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Visible on public About Us page
                    </label>

                    <button
                      type="submit"
                      disabled={faqBusy}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                    >
                      {faqBusy
                        ? 'Saving...'
                        : editingFaqId
                          ? 'Update FAQ'
                          : 'Add FAQ Entry'}
                    </button>
                  </div>
                </form>

                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
                  {siteState.faqs.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      No FAQ entries configured yet. Add your first question above.
                    </div>
                  ) : (
                    siteState.faqs.map((faq, idx) => (
                      <div
                        key={faq.id}
                        className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono tabular-nums font-semibold text-amber-700">
                              0{idx + 1}.
                            </span>
                            <span>{faq.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className={faq.active ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                              {faq.active ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900">{faq.question}</h4>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {faq.answer}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleFaqActive(faq)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                          >
                            {faq.active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditFaq(faq)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFaq(faq.id)}
                            aria-label={`Delete ${faq.question}`}
                            className="p-1.5 text-slate-500 hover:text-red-700 border border-slate-200 rounded-lg hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: QUOTE INQUIRIES */}
            {activeTab === 'inquiries' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Incoming Quote &amp; Repair Requests</h2>
                    <p className="text-xs text-slate-500">Live-synced as Cape Town clients submit requests</p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {inquiries.length} total
                  </span>
                </div>

                {inquiries.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">
                    No customer inquiries submitted yet. New requests submitted on the public site appear here immediately.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {inquiries.map((inq) => (
                      <div key={inq.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono tabular-nums text-slate-700">{inq.id}</span>
                            <span aria-hidden="true">·</span>
                            <span>{inq.requestType}</span>
                            <span aria-hidden="true">·</span>
                            <span>{inq.propertyType}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {new Date(inq.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            {inq.name} — <span className="font-mono tabular-nums">{inq.phone}</span> ({inq.suburb})
                          </h4>
                          <p className="text-xs text-slate-700">
                            Service: <span className="font-medium">{inq.serviceTitle}</span>
                            {inq.email ? ` · ${inq.email}` : ''}
                          </p>
                          {inq.details && (
                            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2.5 mt-1">
                              {inq.details}
                            </p>
                          )}
                          <div className="text-xs text-slate-500 pt-1">
                            Requested upfront:{' '}
                            {[
                              inq.confirmCalloutFee && 'Call-out fee',
                              inq.confirmWarranty && 'Warranty terms',
                              inq.confirmScope && 'Written scope',
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Standard quote'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            aria-label={`Status for ${inq.name}`}
                            value={inq.status}
                            onChange={(e) =>
                              handleUpdateInquiryStatus(inq.id, e.target.value as InquiryStatus)
                            }
                            className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg"
                          >
                            {INQUIRY_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteInquiry(inq.id)}
                            aria-label={`Delete inquiry from ${inq.name}`}
                            className="p-1.5 text-slate-500 hover:text-red-700 border border-slate-200 rounded-lg hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
