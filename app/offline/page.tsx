"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-amber-50 p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-teal-100 flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.652a3.75 3.75 0 010-5.304m5.304 0a3.75 3.75 0 010 5.304m-7.425 2.121a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Nema interneta</h1>
        <p className="text-slate-500 text-sm">
          Trenutno ste van mreže. Sačekajte signal pa osvežite stranu — već
          posećene strane ostaju dostupne.
        </p>
        <button
          onClick={() => location.reload()}
          className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm"
        >
          Pokušaj ponovo
        </button>
      </div>
    </div>
  );
}
