import {FormEvent, useEffect, useRef, useState} from 'react';
import {CheckCircle2, ExternalLink, Mail, MapPin, MessageCircle, Phone} from 'lucide-react';
import type {BrandSettings, ServiceItem} from '../types.ts';

interface QuoteSectionProps {
  brand: BrandSettings;
  services: ServiceItem[];
  selectedServiceId: string;
  onSelectServiceId: (id: string) => void;
}

function buildPrefilledDetails(
  serviceTitle: string,
  requestType: 'New Installation' | 'Repair & Maintenance',
  propertyType: 'Residential' | 'Commercial' | 'Industrial',
) {
  const workLabel = requestType === 'New Installation' ? 'a new installation' : 'a repair / fault assessment';
  return `Hi, I would like a quote for ${workLabel} under ${serviceTitle} for a ${propertyType.toLowerCase()} property. Please advise on availability and pricing.`;
}

function formatWhatsAppDigits(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  return digits.startsWith('0') ? `27${digits.slice(1)}` : digits;
}

export function QuoteSection({
  brand,
  services,
  selectedServiceId,
  onSelectServiceId,
}: QuoteSectionProps) {
  const waAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [suburb, setSuburb] = useState('');
  const [propertyType, setPropertyType] = useState<'Residential' | 'Commercial' | 'Industrial'>('Residential');
  const [requestType, setRequestType] = useState<'New Installation' | 'Repair & Maintenance'>('New Installation');
  const [details, setDetails] = useState('');
  const [detailsEdited, setDetailsEdited] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      onSelectServiceId(services[0].id);
    }
  }, [selectedServiceId, services, onSelectServiceId]);

  const matchedService = services.find((s) => s.id === selectedServiceId);
  const activeServiceTitle =
    selectedServiceId === 'general'
      ? 'Other / Combined Security Package'
      : matchedService?.title || services[0]?.title || 'Gate & Security Services';

  useEffect(() => {
    if (!detailsEdited) {
      setDetails(buildPrefilledDetails(activeServiceTitle, requestType, propertyType));
    }
  }, [activeServiceTitle, requestType, propertyType, detailsEdited]);

  function buildWhatsAppQuoteUrl(): string {
    const waDigits = formatWhatsAppDigits(brand.primaryPhone);

    const lines = [
      `Hello ${brand.companyName},`,
      '',
      '*Quote / Service Request*',
      `Service: ${activeServiceTitle}`,
      `Work Required: ${requestType}`,
      `Property Type: ${propertyType}`,
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      `Suburb: ${suburb.trim()}`,
      email.trim() ? `Email: ${email.trim()}` : '',
      '',
      '*Project / Fault Details:*',
      details.trim() || buildPrefilledDetails(activeServiceTitle, requestType, propertyType),
    ].filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''));

    return `https://wa.me/${waDigits}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmittedRef(null);

    if (name.trim().length < 2) {
      setSubmitError('Please enter your full name.');
      return;
    }
    if (phone.trim().length < 7) {
      setSubmitError('Please provide a valid phone or WhatsApp number.');
      return;
    }
    if (!suburb.trim()) {
      setSubmitError('Please enter your Cape Town suburb.');
      return;
    }

    const finalDetails =
      details.trim() || buildPrefilledDetails(activeServiceTitle, requestType, propertyType);
    const waUrl = buildWhatsAppQuoteUrl();
    setLastWhatsAppUrl(waUrl);

    // Open WhatsApp synchronously within the submit gesture via real anchor click
    if (waAnchorRef.current) {
      waAnchorRef.current.href = waUrl;
      waAnchorRef.current.click();
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        keepalive: true,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          suburb: suburb.trim(),
          propertyType,
          requestType,
          serviceId: selectedServiceId,
          serviceTitle: activeServiceTitle,
          details: finalDetails,
        }),
      });
      const data = (await res.json()) as {id?: string; error?: string};
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit your inquiry.');
      }
      setSubmittedRef(data.id || 'Submitted');
      setName('');
      setPhone('');
      setEmail('');
      setSuburb('');
      setDetailsEdited(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error submitting inquiry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="contact" className="py-20 bg-white border-t border-slate-200">
      <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Cape Town Locations, Direct Phones & Transparency */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <p className="text-sm sm:text-base font-semibold text-amber-700 tracking-wide mb-2">
                {brand.contactPageEyebrow}
              </p>
              {brand.contactPageTitle && (
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance mb-3">
                  {brand.contactPageTitle}
                </h2>
              )}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {brand.contactPageSubtitle}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6 space-y-5">
              <div className="group flex items-start gap-3">
                <Phone
                  className="w-5 h-5 text-slate-700 mt-0.5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-6 group-hover:text-amber-700"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Direct Phone / WhatsApp Line</h3>
                  <div className="mt-1.5 flex flex-col gap-1 font-mono text-sm tabular-nums text-slate-800">
                    <a
                      href={`tel:${brand.primaryPhone.replace(/\s+/g, '')}`}
                      className="hover:text-amber-700 transition-colors w-fit"
                    >
                      {brand.primaryPhone}
                    </a>
                  </div>
                </div>
              </div>

              {brand.contactEmail && (
                <div className="group flex items-start gap-3">
                  <Mail
                    className="w-5 h-5 text-slate-700 mt-0.5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:text-amber-700"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Business Email</h3>
                    <a
                      href={`mailto:${brand.contactEmail}`}
                      className="mt-1 inline-block text-sm font-mono text-slate-800 hover:text-amber-700 transition-colors"
                    >
                      {brand.contactEmail}
                    </a>
                  </div>
                </div>
              )}

              <div className="group flex items-start gap-3">
                <MapPin
                  className="w-5 h-5 text-slate-700 mt-0.5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:text-amber-700"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Listed Cape Town Address</h3>
                  <ul className="mt-1.5 space-y-2 text-sm text-slate-700">
                    <li>
                      <span className="font-medium text-slate-900">Retreat:</span>{' '}
                      {brand.retreatAddress}
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {brand.retreatNote}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="group flex items-start gap-3">
                <ExternalLink
                  className="w-5 h-5 text-slate-700 mt-0.5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-700"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Online Presence</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Listed on Facebook as{' '}
                    <a
                      href={brand.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-amber-600"
                    >
                      {brand.facebookPageName}
                    </a>{' '}
                    and local Cape Town service directories under {brand.companyName}.
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">{brand.operatingHours}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Quote & Repair Request Form */}
          <div id="quote" className="lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <div className="mb-6">
                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  Request a Site Quote or Repair Assessment
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Send your property details directly to our dispatch desk.
                </p>
              </div>

              {/* Hidden anchor for synchronous WhatsApp launch without window.open */}
              <a
                ref={waAnchorRef}
                href="#quote"
                target="_blank"
                rel="noopener noreferrer"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              >
                Open WhatsApp Quote
              </a>

              {submittedRef ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <h4 className="text-base font-semibold text-emerald-950">
                        Inquiry Received ({submittedRef})
                      </h4>
                      <p className="mt-1 text-sm text-emerald-900">
                        Your prefilled quote details have been logged with our dispatch desk and
                        prepared for WhatsApp. For urgent faults, call{' '}
                        <span className="font-mono font-semibold tabular-nums">{brand.primaryPhone}</span>.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {lastWhatsAppUrl && (
                          <a
                            href={lastWhatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                          >
                            <MessageCircle className="w-4 h-4" aria-hidden="true" />
                            Continue in WhatsApp
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setSubmittedRef(null)}
                          className="px-4 py-2 text-xs font-medium text-emerald-950 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Submit Another Request
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* Request Type Segmented Control */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Work Required
                      </label>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-lg">
                        {(['New Installation', 'Repair & Maintenance'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setRequestType(mode)}
                            className={`px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer truncate ${
                              requestType === mode
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {mode === 'New Installation' ? 'New Install' : 'Repair / Fault'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Property Type
                      </label>
                      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/70 rounded-lg">
                        {(['Residential', 'Commercial', 'Industrial'] as const).map((prop) => (
                          <button
                            key={prop}
                            type="button"
                            onClick={() => setPropertyType(prop)}
                            className={`px-2 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer truncate ${
                              propertyType === prop
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {prop}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="quote-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Your Name *
                      </label>
                      <input
                        id="quote-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Thabo Mokoena"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="quote-phone" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Phone / WhatsApp Number *
                      </label>
                      <input
                        id="quote-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+27 82 000 0000"
                        className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="quote-suburb" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Cape Town Suburb *
                      </label>
                      <input
                        id="quote-suburb"
                        type="text"
                        required
                        value={suburb}
                        onChange={(e) => setSuburb(e.target.value)}
                        placeholder="e.g. Bishopscourt, Retreat, Claremont"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
                      />
                    </div>
                    <div>
                      <label htmlFor="quote-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Email Address (Optional)
                      </label>
                      <input
                        id="quote-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.co.za"
                        className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="quote-service" className="block text-xs font-medium text-slate-700 mb-1.5">
                      Service Category
                    </label>
                    <select
                      id="quote-service"
                      value={selectedServiceId}
                      onChange={(e) => onSelectServiceId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
                    >
                      {services
                        .filter((s) => s.active)
                        .map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.title}
                          </option>
                        ))}
                      <option value="general">Other / Combined Security Package</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label htmlFor="quote-details" className="block text-xs font-medium text-slate-700">
                        System Details or Fault Description (Prefilled — edit anytime)
                      </label>
                      {detailsEdited && (
                        <button
                          type="button"
                          onClick={() => {
                            setDetailsEdited(false);
                            setDetails(
                              buildPrefilledDetails(activeServiceTitle, requestType, propertyType),
                            );
                          }}
                          className="text-xs font-medium text-amber-700 hover:text-amber-800 cursor-pointer whitespace-nowrap"
                        >
                          Reset Prefill
                        </button>
                      )}
                    </div>
                    <textarea
                      id="quote-details"
                      rows={3}
                      value={details}
                      onChange={(e) => {
                        setDetailsEdited(true);
                        setDetails(e.target.value);
                      }}
                      placeholder="Describe gate motor model, fence length, number of cameras, or fault symptoms..."
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600"
                    />
                  </div>

                  {submitError && (
                    <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                      {submitError}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      {submitting ? 'Opening WhatsApp...' : 'Send Quote Request'}
                    </button>
                    <span className="text-xs text-slate-500">
                      Prefills WhatsApp &amp; notifies dispatch ({' '}
                      <span className="font-mono tabular-nums text-slate-700">{brand.primaryPhone}</span>)
                    </span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
