import Link from "next/link";

export default function ThankYou() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Hvala na prijavi!</h1>
        <p className="text-slate-500 mb-8">
          Primili smo vašu prijavu i javićemo vam se u roku od 24 sata.
          Pripremamo vaš nalog za fakturisanje!
        </p>
        <Link
          href="/"
          className="inline-block bg-teal-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-700 transition-colors"
        >
          &larr; Nazad na početnu
        </Link>
      </div>
    </main>
  );
}
