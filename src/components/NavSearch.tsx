import {KeyboardEvent, useEffect, useMemo, useRef, useState} from 'react';
import {ArrowRight, Camera, HelpCircle, MapPin, Search, Wrench, X} from 'lucide-react';
import type {GalleryImage, PublicSiteState} from '../types.ts';

export type NavSearchRoute = 'home' | 'services' | 'about' | 'contact';

interface NavSearchProps {
  siteState: PublicSiteState;
  onNavigate: (route: NavSearchRoute, scrollToId?: string) => void;
  onSelectFaq: (faqId: string) => void;
  onOpenImage: (img: GalleryImage) => void;
  className?: string;
  autoFocus?: boolean;
  onResultChosen?: () => void;
}

interface SearchResultItem {
  id: string;
  kind: 'Service' | 'Gallery' | 'FAQ' | 'Page';
  meta: string;
  title: string;
  snippet: string;
  score: number;
  action: () => void;
}

const QUICK_TERMS = ['Gate motor', 'Electric fence', 'CCTV', 'Warranty', 'Bishopscourt'];

export function NavSearch({
  siteState,
  onNavigate,
  onSelectFaq,
  onOpenImage,
  className = '',
  autoFocus = false,
  onResultChosen,
}: NavSearchProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const tokens = q.split(/\s+/).filter(Boolean);
    const matchesAll = (text: string) => {
      const lower = text.toLowerCase();
      return tokens.every((t) => lower.includes(t));
    };

    const list: SearchResultItem[] = [];
    const {brand, services, gallery, faqs} = siteState;

    // 1. Active Services
    services
      .filter((s) => s.active)
      .forEach((srv) => {
        const haystack = [srv.title, srv.category, srv.summary, ...srv.highlights].join(' ');
        if (matchesAll(haystack)) {
          const titleMatch = srv.title.toLowerCase().includes(q) ? 10 : 4;
          list.push({
            id: `srv-${srv.id}`,
            kind: 'Service',
            meta: `Service · ${srv.category}`,
            title: srv.title,
            snippet: srv.summary,
            score: titleMatch + 5,
            action: () => onNavigate('services', `service-${srv.id}`),
          });
        }
      });

    // 2. FAQs
    faqs
      .filter((f) => f.active)
      .forEach((faq) => {
        const haystack = `${faq.category} ${faq.question} ${faq.answer}`;
        if (matchesAll(haystack)) {
          const questionMatch = faq.question.toLowerCase().includes(q) ? 8 : 3;
          list.push({
            id: `faq-${faq.id}`,
            kind: 'FAQ',
            meta: `FAQ · ${faq.category}`,
            title: faq.question,
            snippet: faq.answer,
            score: questionMatch + 2,
            action: () => onSelectFaq(faq.id),
          });
        }
      });

    // 3. Completed Work Gallery
    gallery.forEach((img) => {
      const haystack = `${img.title} ${img.category} ${img.caption}`;
      if (matchesAll(haystack)) {
        const titleMatch = img.title.toLowerCase().includes(q) ? 7 : 2;
        list.push({
          id: `gal-${img.id}`,
          kind: 'Gallery',
          meta: `Project Photo · ${img.category}`,
          title: img.title,
          snippet: img.caption,
          score: titleMatch + 1,
          action: () => onOpenImage(img),
        });
      }
    });

    // 4. Pages, Locations & Contact
    const staticSections: Array<{
      id: string;
      meta: string;
      title: string;
      snippet: string;
      keywords: string;
      route: NavSearchRoute;
      scrollToId?: string;
    }> = [
      {
        id: 'page-quote',
        meta: 'Contact · Instant Quote',
        title: 'Request a Site Quote or Repair Assessment',
        snippet: `Prefilled WhatsApp & dispatch quote form (${brand.primaryPhone})`,
        keywords: `quote estimate price repair installation whatsapp contact phone ${brand.primaryPhone} ${brand.secondaryPhone}`,
        route: 'contact',
        scrollToId: 'quote',
      },
      {
        id: 'page-locations',
        meta: 'Contact · Cape Town Bases',
        title: 'Bishopscourt & Retreat Locations',
        snippet: `${brand.bishopscourtAddress} · ${brand.retreatAddress}`,
        keywords: `address location cape town bishopscourt retreat foreshore cbd directions hours ${brand.bishopscourtAddress} ${brand.retreatAddress} ${brand.operatingHours}`,
        route: 'contact',
      },
      {
        id: 'page-about',
        meta: 'About Us · Company & Pillars',
        title: brand.aboutStoryTitle,
        snippet: brand.aboutStoryBody,
        keywords: `about binwells company story fabrication welding warranty transparency ${brand.aboutStoryTitle} ${brand.aboutStoryBody} ${brand.aboutPillars.map((p) => `${p.title} ${p.description}`).join(' ')}`,
        route: 'about',
      },
      {
        id: 'page-services',
        meta: 'Services · Full Catalog',
        title: 'All Automation, Security & Metalwork Services',
        snippet: brand.servicesPageSubtitle,
        keywords: `services catalog garage door roller shutter intercom alarm cctv burglar bars solar welding electrical`,
        route: 'services',
      },
    ];

    staticSections.forEach((sec) => {
      if (matchesAll(`${sec.title} ${sec.snippet} ${sec.keywords}`)) {
        list.push({
          id: sec.id,
          kind: 'Page',
          meta: sec.meta,
          title: sec.title,
          snippet: sec.snippet,
          score: 3,
          action: () => onNavigate(sec.route, sec.scrollToId),
        });
      }
    });

    return list.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [query, siteState, onNavigate, onSelectFaq, onOpenImage]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function triggerItem(item: SearchResultItem) {
    item.action();
    setIsOpen(false);
    setQuery('');
    onResultChosen?.();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex] || results[0];
      if (target) triggerItem(target);
    }
  }

  function renderKindIcon(kind: SearchResultItem['kind']) {
    if (kind === 'Service') return <Wrench className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />;
    if (kind === 'Gallery') return <Camera className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />;
    if (kind === 'FAQ') return <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />;
    return <MapPin className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />;
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search
          className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="site-search-results"
          aria-label="Search services, FAQs, or locations"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search services, CCTV, FAQs..."
          className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition-colors"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          id="site-search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute right-0 left-0 sm:left-auto sm:w-[420px] mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50"
        >
          {!query.trim() ? (
            <div className="p-4 space-y-2.5">
              <p className="text-xs font-medium text-slate-500">Popular searches</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TERMS.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      inputRef.current?.focus();
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-5 text-center space-y-2">
              <p className="text-sm font-medium text-slate-800">
                No matching services or pages for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-slate-500">
                Try searching for gate motors, solar fencing, CCTV, welding, warranty, or Retreat.
              </p>
              <button
                type="button"
                onClick={() => {
                  onNavigate('contact', 'quote');
                  setIsOpen(false);
                  setQuery('');
                  onResultChosen?.();
                }}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
              >
                Ask our team directly
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
              {results.map((item, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => triggerItem(item)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5">{renderKindIcon(item.kind)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-500 truncate">{item.meta}</div>
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {item.title}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{item.snippet}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
