import Link from "next/link";

export default function ThankYou() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="text-6xl mb-6">&#10003;</div>
        <h1 className="text-3xl font-bold mb-4">Hvala na prijavi!</h1>
        <p className="text-gray-600 mb-8">
          Primili smo va\u0161u prijavu i javi\u0107emo vam se u roku od 24 sata.
          Pripremamo va\u0161 nalog za fakturisanje!
        </p>
        <Link
          href="/"
          className="inline-block bg-violet-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors"
        >
          &larr; Nazad na po\u010Detnu
        </Link>
      </div>
    </main>
  );
}
