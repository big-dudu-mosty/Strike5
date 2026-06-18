type Strike5LogoProps = {
  className?: string;
};

export function Strike5Logo({ className = '' }: Strike5LogoProps) {
  return (
    <img
      alt="Strike5"
      className={`block h-10 w-auto object-contain ${className}`}
      src="/strike5-mark.png"
    />
  );
}
