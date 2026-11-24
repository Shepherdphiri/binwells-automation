import {useEffect, useMemo, useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {ArrowRight, ChevronDown} from 'lucide-react';
import type {FaqItem} from '../types.ts';

interface FaqAccordionProps {
  faqs: FaqItem[];
  onRequestQuote: () => void;
  focusedFaqId?: string | null;
}

export function FaqAccordion({faqs, onRequestQuote, focusedFaqId}: FaqAccordionProps) {
  const shouldReduceMotion = useReducedMotion();
  const activeFaqs = useMemo(() => faqs.filter((f) => f.active), [faqs]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openId, setOpenId] = useState<string | null>(activeFaqs[0]?.id || null);

  useEffect(() => {
    if (focusedFaqId) {
      setSelectedCategory('All');
      setOpenId(focusedFaqId);
    }
  }, [focusedFaqId]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(activeFaqs.map((f) => f.category)));
    return ['All', ...unique];
  }, [activeFaqs]);

  const visibleFaqs = useMemo(() => {
    if (selectedCategory === 'All') return activeFaqs;
    return activeFaqs.filter((f) => f.category === selectedCategory);
  }, [activeFaqs, selectedCategory]);

  if (activeFaqs.length === 0) {
    return null;
  }

  return (
    <div id="faq-section" className="pt-12 border-t border-slate-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Sticky Intro */}
        <div className="lg:col-span-4 space-y-4">
          <p className="text-xs font-medium text-amber-700 tracking-wide">
            Frequently Asked Questions
          </p>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 text-balance">
            Warranty, call-out fees &amp; Cape Town service coverage
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Clear answers on pre-dispatch pricing, hardware vs. workmanship warranties, and our
            Bishopscourt and Retreat response footprint.
          </p>

          <button
            type="button"
            onClick={onRequestQuote}
            className="group inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            Ask About Your Setup
            <ArrowRight
              className="w-3.5 h-3.5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Right Accordion Stack */}
        <div className="lg:col-span-8 space-y-5">
          {categories.length > 2 && (
            <div
              role="tablist"
              aria-label="Filter FAQs by topic"
              className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg w-fit"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="border border-slate-200 rounded-xl bg-white divide-y divide-slate-200 overflow-hidden">
            {visibleFaqs.map((faq, idx) => {
              const isOpen = openId === faq.id;
              const panelId = `faq-panel-${faq.id}`;
              const btnId = `faq-btn-${faq.id}`;

              return (
                <div key={faq.id} className="bg-white">
                  <h4>
                    <button
                      id={btnId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenId(isOpen ? null : faq.id)}
                      className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono tabular-nums font-semibold text-amber-700">
                            0{idx + 1}.
                          </span>
                          <span>{faq.category}</span>
                        </div>
                        <span className="block text-sm sm:text-base font-semibold text-slate-900">
                          {faq.question}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-500 shrink-0 mt-1 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isOpen ? 'rotate-180 text-amber-700' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </h4>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={btnId}
                        initial={shouldReduceMotion ? false : {opacity: 0, y: -4}}
                        animate={{opacity: 1, y: 0}}
                        exit={shouldReduceMotion ? undefined : {opacity: 0, y: -4}}
                        transition={{duration: 0.18, ease: [0.16, 1, 0.3, 1]}}
                        className="px-6 pb-5 text-sm text-slate-600 leading-relaxed"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
