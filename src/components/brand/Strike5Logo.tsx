type Strike5LogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function Strike5Logo({ className = '', showWordmark = true }: Strike5LogoProps) {
  const src = showWordmark ? '/strike5-logo.png' : '/strike5-mark.svg';

  return (
    <img
      alt="Strike5"
      className={`block h-10 w-auto rounded-lg bg-white object-contain shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${className}`}
      src={src}
    />
  );
}
