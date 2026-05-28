import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-center mx-auto mb-2">
          <Image src="/konek.svg" alt="Konek Logo" width={280} height={155} priority />
        </div>
        <p className="page-header-sub">Your Campus. Your Community.</p>
      </div>

      {/* Features */}
      <div className="flex-1 px-6 py-6 space-y-3">
        {[
          { icon: "/feed.png", name: "Feeds", desc: "Viral campus life & moments" },
          { icon: "/soapbox.png", name: "Soapbox", desc: "Voice out. Be heard." },
          { icon: "/help.png", name: "Quad", desc: "Find your barkada" },
          { icon: "/bazaar.png", name: "Bazaar", desc: "Buy & sell on campus" },
          { icon: "/living.png", name: "Living", desc: "Find your boarding house" },
        ].map((f) => (
          <div key={f.name} className="flex items-center gap-4 p-3 rounded-xl" style={{backgroundColor: "var(--color-surface)"}}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor: "var(--color-primary-light)"}}>
              <Image src={f.icon} alt={f.name} width={28} height={28} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{color: "var(--color-text-primary)"}}>{f.name}</div>
              <div className="text-xs mt-0.5" style={{color: "var(--color-text-secondary)"}}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-10 space-y-3">
        <Link href="/signup" className="btn-primary">
          Get started — it's free
        </Link>
        <p className="text-center text-xs" style={{color: "var(--color-text-secondary)"}}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold" style={{color: "var(--color-primary)"}}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
