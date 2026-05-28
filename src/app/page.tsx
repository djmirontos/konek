import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-primary px-6 pt-16 pb-10 text-center">
        <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
          <Image
            src="/logo.png"
            alt="Konek Logo"
            width={80}
            height={80}
            className="rounded-2xl"
          />
        </div>
        <h1 className="text-3xl font-semibold text-white tracking-tight">Konek</h1>
        <p className="text-white/80 text-sm mt-1">Your Campus. Your Community.</p>
      </div>

      {/* Features */}
      <div className="flex-1 px-6 py-6 space-y-3">
        {[
          { icon: "🔥", name: "Feeds", desc: "Viral campus life & moments" },
          { icon: "📢", name: "Soapbox", desc: "Voice out. Be heard." },
          { icon: "🤝", name: "Quad", desc: "Find your barkada" },
          { icon: "🛒", name: "Bazaar", desc: "Buy & sell on campus" },
          { icon: "🏠", name: "Living", desc: "Find your boarding house" },
        ].map((f) => (
          <div key={f.name} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center text-xl flex-shrink-0">
              {f.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{f.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-10 space-y-3">
        <Link
          href="/signup"
          className="block w-full bg-primary text-white text-center py-3 rounded-xl font-semibold text-sm"
        >
          Get started — it's free
        </Link>
        <p className="text-center text-xs text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
