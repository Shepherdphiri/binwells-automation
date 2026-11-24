import {useEffect, useState} from 'react';

interface BrandMarkProps {
  logoUrl?: string;
  companyName: string;
  sizeClass?: string;
}

export function BrandMark({logoUrl, companyName, sizeClass = 'w-11 h-11'}: BrandMarkProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [logoUrl]);

  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt={`${companyName} logo`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} object-contain rounded-md shrink-0`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} shrink-0`}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="6" fill="#0F172A" />
      <path
        d="M8 10H18C22.4183 10 26 13.5817 26 18C26 22.4183 22.4183 26 18 26H8V10Z"
        stroke="#F59E0B"
        strokeWidth="2.2"
      />
      <path d="M13 14.5V21.5M18 14.5V21.5M10 18H23" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
