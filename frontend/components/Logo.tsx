import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="flex min-h-11 w-[88px] shrink-0 flex-col justify-center leading-none">
      <div className="text-[13px] font-extrabold tracking-tight text-zoom-blue">zoom</div>
      <div className="text-[17px] font-semibold text-ink">Workplace</div>
    </Link>
  );
}
