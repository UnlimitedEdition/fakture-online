import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-amber-50 p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-7xl font-bold text-teal-600">404</div>
        <h1 className="text-2xl font-bold text-slate-800">Strana ne postoji</h1>
        <p className="text-slate-500 text-sm">
          Stranica koju tražite ne postoji ili je premeštena.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/dashboard"
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-xl text-sm inline-flex items-center justify-center"
          >
            Nazad na pregled
          </Link>
          <Link
            href="/"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-6 rounded-xl text-sm inline-flex items-center justify-center"
          >
            Početna
          </Link>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-100 text-xs text-slate-500">
          <p className="mb-1">Smatrate da je ovo greška?</p>
          <a
            href="mailto:podrska@faktureonline.rs?subject=404%20-%20Stranica%20ne%20postoji"
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            podrska@faktureonline.rs
          </a>
        </div>
      </div>
    </div>
  );
}
