/**
 * Empty states — SVG neon illustrations com blur orb
 */

interface EmptyStateProps {
  title: string;
  description: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
  secondaryCta?: {
    label: string;
    onClick: () => void;
  };
}

export function NoItemsEmpty({ title, description, cta, secondaryCta }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 py-16 px-8 text-center"
      role="status"
      aria-label={title}
    >
      {/* SVG illustration */}
      <div className="relative">
        {/* Blur orb */}
        <div
          className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
          aria-hidden="true"
        />
        {/* SVG */}
        <svg
          width={120}
          height={120}
          viewBox="0 0 120 120"
          fill="none"
          className="relative"
          aria-hidden="true"
        >
          {/* Ticket outline */}
          <rect
            x="20"
            y="35"
            width="80"
            height="50"
            rx="8"
            stroke="url(#empty-gradient)"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          {/* Dashed line */}
          <line
            x1="20"
            y1="55"
            x2="100"
            y2="55"
            stroke="url(#empty-gradient)"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          {/* Circle cutouts */}
          <circle cx="20" cy="60" r="5" fill="#1f031d" />
          <circle cx="100" cy="60" r="5" fill="#1f031d" />
          <defs>
            <linearGradient id="empty-gradient" x1="20" y1="35" x2="100" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d500f9" />
              <stop offset="1" stopColor="#ea6bff" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2 max-w-sm">
        <h3 className="text-lg font-bold text-on-surface">{title}</h3>
        <p className="text-sm text-on-surface-variant">{description}</p>
      </div>

      {/* CTAs */}
      {cta && (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={cta.onClick}
            className="btn-accent px-6 py-3 rounded-xl font-bold text-sm w-full"
          >
            {cta.label}
          </button>
          {secondaryCta && (
            <button
              onClick={secondaryCta.onClick}
              className="px-6 py-3 rounded-xl font-bold text-sm border border-outline text-on-surface hover:bg-surface-container transition-colors"
            >
              {secondaryCta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function NoCouponsEmpty({ title, description, cta }: Omit<EmptyStateProps, "secondaryCta">) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 py-16 px-8 text-center"
      role="status"
      aria-label={title}
    >
      {/* SVG illustration */}
      <div className="relative">
        <div
          className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
          aria-hidden="true"
        />
        <svg
          width={120}
          height={120}
          viewBox="0 0 120 120"
          fill="none"
          className="relative"
          aria-hidden="true"
        >
          {/* Percent symbol */}
          <circle
            cx="45"
            cy="45"
            r="12"
            stroke="url(#coupon-gradient)"
            strokeWidth="2"
          />
          <circle
            cx="75"
            cy="75"
            r="12"
            stroke="url(#coupon-gradient)"
            strokeWidth="2"
          />
          <line
            x1="80"
            y1="40"
            x2="40"
            y2="80"
            stroke="url(#coupon-gradient)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="coupon-gradient" x1="30" y1="30" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d500f9" />
              <stop offset="1" stopColor="#ea6bff" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <h3 className="text-lg font-bold text-on-surface">{title}</h3>
        <p className="text-sm text-on-surface-variant">{description}</p>
      </div>

      {cta && (
        <button
          onClick={cta.onClick}
          className="btn-accent px-6 py-3 rounded-xl font-bold text-sm"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

export function NoPaymentsEmpty({ title, description, cta }: Omit<EmptyStateProps, "secondaryCta">) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 py-16 px-8 text-center"
      role="status"
      aria-label={title}
    >
      {/* SVG illustration */}
      <div className="relative">
        <div
          className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
          aria-hidden="true"
        />
        <svg
          width={120}
          height={120}
          viewBox="0 0 120 120"
          fill="none"
          className="relative"
          aria-hidden="true"
        >
          {/* Credit card */}
          <rect
            x="25"
            y="35"
            width="70"
            height="50"
            rx="8"
            stroke="url(#payment-gradient)"
            strokeWidth="2"
          />
          {/* Chip */}
          <rect
            x="35"
            y="50"
            width="15"
            height="12"
            rx="3"
            fill="url(#payment-gradient)"
            fillOpacity="0.3"
            stroke="url(#payment-gradient)"
            strokeWidth="1.5"
          />
          {/* Lines */}
          <line
            x1="35"
            y1="75"
            x2="65"
            y2="75"
            stroke="url(#payment-gradient)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="70"
            y1="70"
            x2="85"
            y2="70"
            stroke="url(#payment-gradient)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="payment-gradient" x1="25" y1="35" x2="95" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#d500f9" />
              <stop offset="1" stopColor="#ea6bff" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <h3 className="text-lg font-bold text-on-surface">{title}</h3>
        <p className="text-sm text-on-surface-variant">{description}</p>
      </div>

      {cta && (
        <button
          onClick={cta.onClick}
          className="btn-accent px-6 py-3 rounded-xl font-bold text-sm"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
