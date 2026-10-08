import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="block w-[88px] leading-none">
      <div className="text-[13px] font-extrabold tracking-tight text-zoom-blue">zoom</div>
      <div className="text-[17px] font-semibold text-ink">Workplace</div>
    </Link>
  );
}
