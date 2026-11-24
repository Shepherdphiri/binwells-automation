import {useCallback, useEffect, useMemo, useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {
  ArrowRight,
  Camera,
  Check,
  Cog,
  MapPin,
  Menu,
  Phone,
  Search,
  Shield,
  ShieldCheck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {AdminConsole} from './components/AdminConsole.tsx';
import {BrandMark} from './components/BrandMark.tsx';
import {FaqAccordion} from './components/FaqAccordion.tsx';
import {NavSearch} from './components/NavSearch.tsx';
import {QuoteSection} from './components/QuoteSection.tsx';
import {ResilientImage} from './components/ResilientImage.tsx';
import {TypewriterText} from './components/TypewriterText.tsx';
import {useRealtimeSite} from './hooks/useRealtimeSite.ts';
import {getHeroOpacityClass} from './utils/heroOpacity.ts';
import type {GalleryImage, QuoteInquiry} from './types.ts';

type PageRoute = 'home' | 'services' | 'about' | 'contact' | 'admin';

function parseHashRoute(): PageRoute {
  const h = window.location.hash.replace('#', '').toLowerCase();
  if (h === 'services') return 'services';
  if (h === 'about') return 'about';
  if (h === 'contact' || h === 'quote') return 'contact';
  if (h === 'admin') return 'admin';
  return 'home';
}

function getServiceIcon(index: number) {
  const icons = [Cog, Zap, Camera, Wrench];
  return icons[index % icons.length];
}

function getPillarIcon(index: number) {
  const icons = [Wrench, MapPin, ShieldCheck];
  return icons[index % icons.length];
}

export default function App() {
  const shouldReduceMotion = useReducedMotion();
  const [page, setPage] = useState<PageRoute>(parseHashRoute);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<QuoteInquiry[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [focusedFaqId, setFocusedFaqId] = useState<string | null>(null);
  const [galleryFilter, setGalleryFilter] = useState<string>('All');
  const [showAllHomeGallery, setShowAllHomeGallery] = useState(false);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);

  const handleIncomingInquiry = useCallback((inq: QuoteInquiry) => {
    setInquiries((prev) => {
      if (prev.some((existing) => existing.id === inq.id)) return prev;
      return [inq, ...prev];
    });
  }, []);

  const {siteState, error, refresh} = useRealtimeSite({
    adminToken,
    onAdminInquiryCreated: handleIncomingInquiry,
  });

  useEffect(() => {
    const onHashChange = () => {
      setPage(parseHashRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
        setMobileMenuOpen(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navigateTo = (target: PageRoute, scrollToId?: string) => {
    setPage(target);
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    window.location.hash = target;
    if (scrollToId) {
      window.setTimeout(() => {
        document.getElementById(scrollToId)?.scrollIntoView({behavior: shouldReduceMotion ? 'auto' : 'smooth'});
      }, 90);
    } else {
      window.scrollTo({top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth'});
    }
  };

  const handleSelectServiceForQuote = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (page === 'home') {
      document.getElementById('quote')?.scrollIntoView({behavior: shouldReduceMotion ? 'auto' : 'smooth'});
    } else {
      navigateTo('contact', 'quote');
    }
  };

  const activeServices = useMemo(
    () => (siteState ? siteState.services.filter((s) => s.active) : []),
    [siteState],
  );

  const galleryCategories = useMemo(() => {
    if (!siteState) return ['All'];
    const cats = Array.from(new Set(siteState.gallery.map((g) => g.category)));
    return ['All', ...cats];
  }, [siteState]);

  const filteredGallery = useMemo(() => {
    if (!siteState) return [];
    if (galleryFilter === 'All') return siteState.gallery;
    return siteState.gallery.filter((g) => g.category === galleryFilter);
  }, [siteState, galleryFilter]);

  const heroSlides = useMemo(() => {
    if (!siteState) return [];
    const raw =
      Array.isArray(siteState.brand.heroImages) && siteState.brand.heroImages.length > 0
        ? siteState.brand.heroImages
        : [siteState.brand.heroImageUrl];
    return Array.from(new Set(raw.filter(Boolean)));
  }, [siteState]);

  useEffect(() => {
    if (heroSlideIndex >= heroSlides.length) {
      setHeroSlideIndex(0);
    }
  }, [heroSlideIndex, heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1 || shouldReduceMotion) return;
    const timer = window.setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [heroSlides.length, shouldReduceMotion]);

  if (!siteState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-xl p-6 text-center space-y-3">
          {error ? (
            <>
              <p className="text-sm font-medium text-red-700">{error}</p>
              <button
                type="button"
                onClick={refresh}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Retry Connection
              </button>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-600">Loading Binwells Automation &amp; Security...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const {brand} = siteState;

  const navItems: {route: PageRoute; label: string}[] = [
    {route: 'home', label: 'HOME'},
    {route: 'services', label: 'SERVICES'},
    {route: 'about', label: 'ABOUT US'},
    {route: 'contact', label: 'CONTACT US'},
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Navigation Bar: HOME | SERVICES | ABOUT US | CONTACT US */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home');
            }}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded-md"
          >
            <BrandMark logoUrl={brand.logoUrl} companyName={brand.companyName} sizeClass="w-8 h-8" />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate max-w-[210px] sm:max-w-[300px] lg:max-w-[250px] xl:max-w-none">
              {brand.companyName}
            </span>
          </a>

          {/* Zone 2: HOME | SERVICES | ABOUT US | CONTACT US */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-4 text-xs font-semibold tracking-wide text-slate-700"
          >
            {navItems.map((item, idx) => {
              const isActive = page === item.route;
              return (
                <div key={item.route} className="flex items-center gap-4">
                  {idx > 0 && (
                    <span aria-hidden="true" className="text-slate-300 select-none">
                      |
                    </span>
                  )}
                  <a
                    href={`#${item.route}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo(item.route);
                    }}
                    className={`transition-colors whitespace-nowrap shrink-0 underline-offset-4 ${
                      isActive
                        ? 'text-amber-700 underline'
                        : 'hover:text-slate-950 hover:underline'
                    }`}
                  >
                    {item.label}
                  </a>
                </div>
              );
            })}
          </nav>

          {/* Zone 3: Search Bar + 1 Primary CTA + Mobile Toggles */}
          <div className="flex items-center gap-3 shrink-0">
            <NavSearch
              siteState={siteState}
              onNavigate={(route, scrollId) => navigateTo(route, scrollId)}
              onSelectFaq={(faqId) => {
                setFocusedFaqId(faqId);
                navigateTo('about', 'faq-section');
              }}
              onOpenImage={(img) => setLightboxImage(img)}
              className="hidden xl:block w-56 2xl:w-64"
            />
            <button
              type="button"
              aria-label={mobileSearchOpen ? 'Close site search' : 'Search website'}
              onClick={() => {
                setMobileSearchOpen((prev) => !prev);
                setMobileMenuOpen(false);
              }}
              className="xl:hidden p-2 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
            >
              {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => navigateTo('contact', 'quote')}
              className="group hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Request Quote
              <ArrowRight
                className="w-3.5 h-3.5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => {
                setMobileMenuOpen((prev) => !prev);
                setMobileSearchOpen(false);
              }}
              className="lg:hidden p-2 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Expandable Search Bar for Tablet / Mobile (< xl) */}
        {mobileSearchOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white px-6 sm:px-10 py-3">
            <NavSearch
              siteState={siteState}
              onNavigate={(route, scrollId) => navigateTo(route, scrollId)}
              onSelectFaq={(faqId) => {
                setFocusedFaqId(faqId);
                navigateTo('about', 'faq-section');
              }}
              onOpenImage={(img) => setLightboxImage(img)}
              autoFocus
              onResultChosen={() => setMobileSearchOpen(false)}
              className="w-full"
            />
          </div>
        )}

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-3">
            <NavSearch
              siteState={siteState}
              onNavigate={(route, scrollId) => navigateTo(route, scrollId)}
              onSelectFaq={(faqId) => {
                setFocusedFaqId(faqId);
                navigateTo('about', 'faq-section');
              }}
              onOpenImage={(img) => setLightboxImage(img)}
              onResultChosen={() => setMobileMenuOpen(false)}
              className="w-full"
            />
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => navigateTo(item.route)}
                  className={`block w-full text-left py-2 text-xs font-semibold tracking-wide cursor-pointer ${
                    page === item.route ? 'text-amber-700' : 'text-slate-800 hover:text-slate-950'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigateTo('contact', 'quote')}
              className="mt-2 w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Request Quote
            </button>
          </div>
        )}
      </header>

      {/* Main Page Viewport */}
      <AnimatePresence mode="wait">
        {page === 'admin' && (
          <motion.main
            key="admin"
            initial={shouldReduceMotion ? false : {opacity: 0}}
            animate={{opacity: 1}}
            exit={shouldReduceMotion ? undefined : {opacity: 0}}
            transition={{duration: 0.16}}
            className="flex-1"
          >
            <AdminConsole
              siteState={siteState}
              adminToken={adminToken}
              onAdminTokenChange={setAdminToken}
              inquiries={inquiries}
              onInquiriesChange={setInquiries}
              onExitAdmin={() => navigateTo('home')}
            />
          </motion.main>
        )}

        {/* PAGE 1: HOME (Animated Hero + Overview of What We Do + Contact Form Below) */}
        {page === 'home' && (
          <motion.main
            key="home"
            initial={shouldReduceMotion ? false : {opacity: 0}}
            animate={{opacity: 1}}
            exit={shouldReduceMotion ? undefined : {opacity: 0}}
            transition={{duration: 0.18}}
            className="flex-1"
          >
            {/* Animated Hero Section with Background Carousel & Adjustable Opacity */}
            <section className="relative overflow-hidden bg-slate-950 text-white">
              <div
                aria-hidden="true"
                className={`absolute inset-0 transition-opacity duration-300 ${getHeroOpacityClass(
                  brand.heroImageOpacity,
                )}`}
              >
                <AnimatePresence initial={false} mode="sync">
                  {heroSlides.length > 0 && (
                    <motion.div
                      key={heroSlides[heroSlideIndex % heroSlides.length]}
                      className="absolute inset-0"
                      initial={shouldReduceMotion ? false : {opacity: 0, scale: 1.04}}
                      animate={{
                        opacity: 1,
                        scale: shouldReduceMotion ? 1 : [1.02, 1.07],
                      }}
                      exit={shouldReduceMotion ? undefined : {opacity: 0}}
                      transition={{
                        opacity: {duration: 1.0, ease: 'easeInOut'},
                        scale: {duration: 12, ease: 'easeOut'},
                      }}
                    >
                      <ResilientImage
                        src={heroSlides[heroSlideIndex % heroSlides.length]}
                        alt={`${brand.companyName} installation showcase ${heroSlideIndex + 1}`}
                        fallbackLabel={brand.companyName}
                        eager
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/20"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/20"
              />

              <div className="relative z-10 w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-24 sm:py-28 lg:py-36">
                <motion.div
                  initial={shouldReduceMotion ? false : {opacity: 0, y: 12}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: 0.35, ease: [0.16, 1, 0.3, 1]}}
                  className="w-full space-y-6"
                >
                  <h1
                    className="font-display font-bold tracking-tight text-white text-balance leading-[1.08]"
                    style={{fontSize: 'clamp(2.35rem, 4.1vw, 4.25rem)'}}
                  >
                    {brand.heroTitle}
                  </h1>

                  <div className="min-h-[2.5rem] sm:min-h-[2.75rem] flex items-center">
                    <p className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold text-amber-400 tracking-tight">
                      <TypewriterText phrases={brand.typewriterPhrases} />
                    </p>
                  </div>

                  <p className="text-base sm:text-lg lg:text-xl text-slate-200 leading-relaxed max-w-5xl">
                    {brand.heroSubtitle}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById('quote')
                          ?.scrollIntoView({behavior: shouldReduceMotion ? 'auto' : 'smooth'})
                      }
                      className="group inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Request Site Quote
                      <ArrowRight
                        className="w-4 h-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </button>
                    <a
                      href={`tel:${brand.primaryPhone.replace(/\s+/g, '')}`}
                      className="group inline-flex items-center gap-2 px-5 py-3.5 text-sm font-mono font-medium tabular-nums text-white bg-slate-900/70 border border-white/25 rounded-lg hover:bg-slate-900 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Phone
                        className="w-4 h-4 text-amber-400 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-rotate-12 group-hover:scale-110"
                        aria-hidden="true"
                      />
                      {brand.primaryPhone}
                    </a>
                  </div>
                </motion.div>
              </div>

              {heroSlides.length > 1 && (
                <div
                  aria-label="Hero background slide selector"
                  className="relative z-20 px-6 sm:px-10 lg:px-14 xl:px-16 pb-6 flex items-center justify-end gap-2"
                >
                  {heroSlides.map((slideUrl, idx) => {
                    const active = idx === heroSlideIndex % heroSlides.length;
                    return (
                      <button
                        key={slideUrl}
                        type="button"
                        aria-label={`Show hero background ${idx + 1} of ${heroSlides.length}`}
                        aria-pressed={active}
                        onClick={() => setHeroSlideIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                          active ? 'w-8 bg-amber-400' : 'w-4 bg-white/40 hover:bg-white/75'
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {/* Recent Completed Work (Immediately Below Hero) */}
            {siteState.gallery.length > 0 && (() => {
              const displayedGallery = showAllHomeGallery
                ? siteState.gallery
                : siteState.gallery.slice(0, 5);
              const featuredProject = displayedGallery[0];
              const secondaryProjects = displayedGallery.slice(1, 5);
              const extraProjects = displayedGallery.slice(5);

              return (
                <section
                  aria-labelledby="previous-work-heading"
                  className="py-16 sm:py-20 bg-white border-b border-slate-200"
                >
                  <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                      <div className="max-w-2xl">
                        <p className="text-xs font-medium text-amber-700 tracking-wide mb-2">
                          Completed Installations
                        </p>
                        <h2
                          id="previous-work-heading"
                          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance"
                        >
                          Recent gate automation, perimeter &amp; metalwork across Cape Town
                        </h2>
                        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                          Real site installations, custom steel fabrication, solar electric fencing,
                          and access control completed for residential and commercial properties.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 self-start md:self-auto shrink-0">
                        {siteState.gallery.length > 5 && (
                          <button
                            type="button"
                            onClick={() => setShowAllHomeGallery((prev) => !prev)}
                            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {showAllHomeGallery
                              ? 'Show Fewer'
                              : `Show All (${siteState.gallery.length})`}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigateTo('about')}
                          className="group inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          View Full Gallery
                          <ArrowRight
                            className="w-3.5 h-3.5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      {/* Lead Featured Project */}
                      {featuredProject && (
                        <button
                          type="button"
                          onClick={() => setLightboxImage(featuredProject)}
                          className={`group relative text-left rounded-xl overflow-hidden border border-slate-200 bg-slate-950 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                            secondaryProjects.length > 0 ? 'lg:col-span-6 min-h-[320px] sm:min-h-[400px] lg:h-full' : 'lg:col-span-12 aspect-[16/9]'
                          }`}
                        >
                          <ResilientImage
                            src={featuredProject.url}
                            alt={featuredProject.title}
                            fallbackLabel={featuredProject.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                          />
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent"
                          />
                          <div className="absolute inset-x-0 bottom-0 p-6 space-y-1.5">
                            <p className="text-xs font-medium text-amber-400">
                              <span className="font-mono tabular-nums">01.</span> {featuredProject.category}
                            </p>
                            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                              {featuredProject.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-2 max-w-xl">
                              {featuredProject.caption}
                            </p>
                          </div>
                        </button>
                      )}

                      {/* Supporting 2x2 Completed Work Grid */}
                      {secondaryProjects.length > 0 && (
                        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                          {secondaryProjects.map((img, idx) => (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => setLightboxImage(img)}
                              className="group text-left bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors cursor-pointer flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                            >
                              <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                                <ResilientImage
                                  src={img.url}
                                  alt={img.title}
                                  fallbackLabel={img.title}
                                  className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                                />
                              </div>
                              <div className="p-4 flex-1 flex flex-col justify-between gap-1">
                                <div className="text-xs text-slate-500">
                                  <span className="font-mono tabular-nums font-semibold text-amber-700">
                                    0{idx + 2}.
                                  </span>{' '}
                                  {img.category}
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                                  {img.title}
                                </h3>
                                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                  {img.caption}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Additional Projects when expanded */}
                    {extraProjects.length > 0 && (
                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {extraProjects.map((img, idx) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => setLightboxImage(img)}
                            className="group text-left bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors cursor-pointer flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                          >
                            <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                              <ResilientImage
                                src={img.url}
                                alt={img.title}
                                fallbackLabel={img.title}
                                className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                              />
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between gap-1">
                              <div className="text-xs text-slate-500">
                                <span className="font-mono tabular-nums font-semibold text-amber-700">
                                  {String(idx + 6).padStart(2, '0')}.
                                </span>{' '}
                                {img.category}
                              </div>
                              <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                                {img.title}
                              </h3>
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {img.caption}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}

            {/* Overview of What We Do */}
            <section className="py-20 bg-slate-50">
              <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                  <div className="max-w-2xl">
                    <p className="text-xs font-medium text-amber-700 tracking-wide mb-2">
                      {brand.homeOverviewEyebrow}
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                      {brand.homeOverviewTitle}
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                      {brand.homeOverviewSubtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('services')}
                    className="group inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start md:self-auto"
                  >
                    Explore All Services
                    <ArrowRight
                      className="w-3.5 h-3.5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {activeServices.slice(0, 4).map((srv, idx) => {
                    const Icon = getServiceIcon(idx);
                    return (
                      <div
                        key={srv.id}
                        className="group bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5 hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono tabular-nums font-semibold text-amber-700">
                              0{idx + 1}. {srv.category}
                            </span>
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 group-hover:bg-slate-900 group-hover:text-amber-400 transition-colors duration-200">
                              <Icon
                                className="w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:rotate-6"
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                          <h3 className="text-lg font-bold tracking-tight text-slate-900">
                            {srv.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            {srv.summary}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => navigateTo('services')}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 hover:text-amber-700 transition-colors cursor-pointer"
                          >
                            View Scope
                            <ArrowRight
                              className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectServiceForQuote(srv.id)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                          >
                            Select for Quote
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Contact Form Below on Home Page */}
            <QuoteSection
              brand={brand}
              services={siteState.services}
              selectedServiceId={selectedServiceId}
              onSelectServiceId={setSelectedServiceId}
            />
          </motion.main>
        )}

        {/* PAGE 2: SERVICES */}
        {page === 'services' && (
          <motion.main
            key="services"
            initial={shouldReduceMotion ? false : {opacity: 0}}
            animate={{opacity: 1}}
            exit={shouldReduceMotion ? undefined : {opacity: 0}}
            transition={{duration: 0.18}}
            className="flex-1 bg-slate-50"
          >
            <section className="bg-white border-b border-slate-200 py-14">
              <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
                <p className="text-xs font-medium text-amber-700 tracking-wide mb-2">
                  {brand.servicesPageEyebrow}
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance max-w-4xl">
                  {brand.servicesPageTitle}
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
                  {brand.servicesPageSubtitle}
                </p>
              </div>
            </section>

            <section className="py-16">
              <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {activeServices.map((srv, idx) => {
                  const Icon = getServiceIcon(idx);
                  const isWide = srv.featured || (activeServices.length % 2 === 1 && idx === 0);
                  return (
                    <article
                      id={`service-${srv.id}`}
                      key={srv.id}
                      className={`group scroll-mt-20 ${
                        isWide ? 'lg:col-span-7' : 'lg:col-span-5'
                      } bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between`}
                    >
                      <div>
                        <div className="aspect-[4/3] sm:aspect-[16/10] bg-slate-100 overflow-hidden border-b border-slate-200">
                          <ResilientImage
                            src={srv.imageUrl}
                            alt={srv.title}
                            fallbackLabel={srv.title}
                            className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02]"
                          />
                        </div>
                        <div className="p-6 space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="font-mono tabular-nums font-semibold text-amber-700">
                                0{idx + 1}.
                              </span>
                              <span>{srv.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>Residential, Commercial &amp; Industrial</span>
                            </div>
                            <Icon
                              className="w-4 h-4 text-slate-400 transition-transform duration-200 group-hover:text-amber-700 group-hover:rotate-6"
                              aria-hidden="true"
                            />
                          </div>

                          <h2 className="text-xl font-bold tracking-tight text-slate-900">
                            {srv.title}
                          </h2>
                          <p className="text-sm text-slate-600 leading-relaxed">{srv.summary}</p>

                          <ul className="space-y-2 pt-2 border-t border-slate-100">
                            {srv.highlights.map((bullet, bIdx) => (
                              <li key={bIdx} className="flex items-start gap-2.5 text-sm text-slate-700">
                                <Check
                                  className="w-4 h-4 text-amber-700 mt-0.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="px-6 pb-6 pt-2 flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => handleSelectServiceForQuote(srv.id)}
                          className="group/btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Quote This Service
                          <ArrowRight
                            className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </button>
                        <span className="text-xs text-slate-500">New installs &amp; repairs</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </motion.main>
        )}

        {/* PAGE 3: ABOUT US */}
        {page === 'about' && (
          <motion.main
            key="about"
            initial={shouldReduceMotion ? false : {opacity: 0}}
            animate={{opacity: 1}}
            exit={shouldReduceMotion ? undefined : {opacity: 0}}
            transition={{duration: 0.18}}
            className="flex-1 bg-white"
          >
            <section className="bg-slate-50 border-b border-slate-200 py-14">
              <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
                <p className="text-xs font-medium text-amber-700 tracking-wide mb-2">
                  {brand.aboutPageEyebrow}
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance max-w-4xl">
                  {brand.aboutPageTitle}
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
                  {brand.aboutPageSubtitle}
                </p>
              </div>
            </section>

            <section className="py-16">
              <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 space-y-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                  <div className="lg:col-span-5 space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
                      {brand.aboutStoryTitle}
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                      {brand.aboutStoryBody}
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => navigateTo('contact', 'quote')}
                        className="group inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Speak With Our Team
                        <ArrowRight
                          className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {brand.aboutPillars.map((pillar, idx) => {
                      const Icon = getPillarIcon(idx);
                      return (
                        <div
                          key={idx}
                          className="group p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3 hover:border-slate-300 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-700 group-hover:bg-slate-900 group-hover:text-amber-400 transition-colors duration-200">
                            <Icon
                              className="w-4 h-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-6"
                              aria-hidden="true"
                            />
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">{pillar.title}</h3>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {pillar.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Frequently Asked Questions */}
                <FaqAccordion
                  faqs={siteState.faqs}
                  focusedFaqId={focusedFaqId}
                  onRequestQuote={() => navigateTo('contact', 'quote')}
                />

                {/* Project & Workshop Gallery */}
                <div className="pt-12 border-t border-slate-200">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                      <p className="text-xs font-medium text-amber-700 tracking-wide mb-2">
                        Project &amp; Equipment Gallery
                      </p>
                      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                        Recent Cape Town installations &amp; workshop fabrication
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg self-start md:self-auto">
                      {galleryCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setGalleryFilter(cat)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            galleryFilter === cat
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGallery.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setLightboxImage(img)}
                        className="group text-left bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                      >
                        <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                          <ResilientImage
                            src={img.url}
                            alt={img.title}
                            fallbackLabel={img.title}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                          />
                        </div>
                        <div className="p-4">
                          <div className="text-xs text-slate-500">{img.category}</div>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5">{img.title}</h4>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{img.caption}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </motion.main>
        )}

        {/* PAGE 4: CONTACT US */}
        {page === 'contact' && (
          <motion.main
            key="contact"
            initial={shouldReduceMotion ? false : {opacity: 0}}
            animate={{opacity: 1}}
            exit={shouldReduceMotion ? undefined : {opacity: 0}}
            transition={{duration: 0.18}}
            className="flex-1 bg-white"
          >
            <QuoteSection
              brand={brand}
              services={siteState.services}
              selectedServiceId={selectedServiceId}
              onSelectServiceId={setSelectedServiceId}
            />
          </motion.main>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxImage.title}
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 p-6 flex items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full bg-white rounded-xl overflow-hidden border border-slate-200"
          >
            <div className="aspect-[16/10] bg-slate-900">
              <ResilientImage
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">{lightboxImage.category}</p>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{lightboxImage.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{lightboxImage.caption}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiet Footer with Credit & Discreet Shield Admin Trigger */}
      <footer className="bg-slate-950 text-slate-300 border-t border-slate-900">
        <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <BrandMark logoUrl={brand.logoUrl} companyName={brand.companyName} sizeClass="w-8 h-8" />
                <span className="font-display text-base font-bold text-white">
                  {brand.companyName}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                {brand.tagline}. Listed online as {brand.tradingAs}. Confirm exact job scope,
                warranty coverage, and call-out fees before dispatch.
              </p>
            </div>

            <div className="md:col-span-4 space-y-2 text-xs">
              <h4 className="font-semibold text-white">Cape Town Bases</h4>
              <p className="text-slate-400">{brand.bishopscourtAddress}</p>
              <p className="text-slate-400">{brand.retreatAddress}</p>
              <p className="font-mono tabular-nums text-amber-400 pt-1">
                {brand.primaryPhone} · {brand.secondaryPhone}
              </p>
            </div>

            <div className="md:col-span-3 space-y-2 text-xs">
              <h4 className="font-semibold text-white">Navigation</h4>
              <div className="flex flex-col items-start gap-1.5 text-slate-400">
                <button
                  type="button"
                  onClick={() => navigateTo('home')}
                  className="hover:text-white cursor-pointer"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('services')}
                  className="hover:text-white cursor-pointer"
                >
                  Services
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('about')}
                  className="hover:text-white cursor-pointer"
                >
                  About Us
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('contact')}
                  className="hover:text-white cursor-pointer"
                >
                  Contact Us
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} {brand.companyName}. Cape Town, South Africa.</span>
            <div className="flex items-center gap-3">
              <span>{brand.footerCredit}</span>
              <button
                type="button"
                onClick={() => navigateTo('admin')}
                aria-label="Administrator Sign-In"
                title="Administrator Sign-In"
                className="p-1.5 text-slate-600 hover:text-amber-400 transition-colors cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Shield
                  className="w-4 h-4 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Action Button (bottom-right on public pages) */}
      {page !== 'admin' && !lightboxImage && (() => {
        const rawDigits = brand.primaryPhone.replace(/\D/g, '');
        const waDigits = rawDigits.startsWith('0') ? `27${rawDigits.slice(1)}` : rawDigits;
        const waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(
          `Hello ${brand.companyName}, I would like to inquire about an installation or repair in Cape Town.`,
        )}`;
        return (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            title="Chat on WhatsApp"
            className="group fixed bottom-5 right-5 z-40 inline-flex items-center justify-center gap-2 h-12 w-12 sm:w-auto sm:px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-slate-950/20 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
              aria-hidden="true"
            >
              <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.422-.531.078-1.203.109-1.938-.125-.453-.141-1.031-.328-1.766-.641-3.094-1.344-5.109-4.469-5.266-4.672-.156-.203-1.266-1.688-1.266-3.219 0-1.531.797-2.281 1.078-2.594.281-.313.625-.391.828-.391.203 0 .422.016.609.016.188 0 .453-.078.703.531.266.625.891 2.172.969 2.328.078.156.125.344.031.547-.094.203-.156.344-.313.516-.156.172-.328.391-.469.531-.156.156-.328.328-.141.641.188.313.844 1.391 1.813 2.25 1.25 1.109 2.297 1.453 2.609 1.609.313.156.5.125.688-.078.188-.203.797-.938 1.016-1.25.219-.313.422-.266.719-.156.297.109 1.875.891 2.203 1.047.328.156.547.234.625.375.078.141.078.813-.172 1.516z" />
            </svg>
            <span className="hidden sm:inline text-xs font-semibold tracking-wide whitespace-nowrap">
              WhatsApp
            </span>
          </a>
        );
      })()}
    </div>
  );
}
