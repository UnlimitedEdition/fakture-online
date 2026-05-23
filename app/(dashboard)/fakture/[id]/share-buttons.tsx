"use client";

type ShareButtonsProps = {
  invoiceNumber: string;
  clientName: string | null;
  clientPhone: string | null;
  total: number | string;
  currency: string;
  dueDate: string | null;
  invoiceUrl: string;
  senderName: string | null;
};

// Normalize phone to digits only (e.g. "+381 60 123-456" -> "381601234567")
// Required by wa.me and sms: URL schemes.
function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 6 ? digits : null;
}

function buildMessage({
  invoiceNumber,
  clientName,
  total,
  currency,
  dueDate,
  invoiceUrl,
  senderName,
}: Omit<ShareButtonsProps, "clientPhone">): string {
  const greeting = clientName ? `Poštovani ${clientName},` : "Poštovani,";
  const iznos = `${Number(total).toLocaleString("sr-RS")} ${currency}`;
  const rok = dueDate ? `, rok plaćanja ${dueDate}` : "";
  const sender = senderName ? senderName : "Vaš dobavljač";
  return [
    greeting,
    "",
    `Šaljem fakturu br. ${invoiceNumber} na iznos ${iznos}${rok}.`,
    `Detalji: ${invoiceUrl}`,
    "",
    "Hvala,",
    sender,
  ].join("\n");
}

export function ShareButtons(props: ShareButtonsProps) {
  const { clientPhone, invoiceNumber } = props;
  const phone = normalizePhone(clientPhone);
  const message = buildMessage(props);
  const encoded = encodeURIComponent(message);
  const subject = encodeURIComponent(`Faktura br. ${invoiceNumber}`);

  const waHref = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  const viberHref = `viber://forward?text=${encoded}`;
  const mailHref = `mailto:?subject=${subject}&body=${encoded}`;
  const smsHref = phone ? `sms:${phone}?body=${encoded}` : `sms:?body=${encoded}`;

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold py-2.5 px-4 text-sm text-white transition-colors";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 print:hidden">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Podeli fakturu</h3>
        <span className="text-xs text-slate-400">brzo slanje klijentu</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${base} bg-[#25D366] hover:opacity-90`}
          aria-label="Pošalji preko WhatsApp-a"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.671 5.491l-.999 3.648 3.817-.838zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          WhatsApp
        </a>
        <a
          href={viberHref}
          className={`${base} bg-[#7360F2] hover:opacity-90`}
          aria-label="Pošalji preko Viber-a"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.693 6.7.623 9.825c-.06 3.115-.13 8.954 5.5 10.541v2.42s-.038.978.602 1.176c.79.247 1.245-.501 1.992-1.31l1.397-1.57c3.86.32 6.821-.418 7.156-.527.78-.252 5.181-.811 5.897-6.653.736-6.025-.355-9.832-2.325-11.55l-.013-.011c-.59-.541-2.973-2.273-8.291-2.292 0 0-.393-.025-1.139-.025-.121 0-.336.003-.6.007zm.073 1.708c.628-.003 1.014.022 1.014.022 4.503.014 6.659 1.367 7.161 1.818 1.665 1.434 2.522 4.862 1.9 9.892-.598 4.88-4.166 5.189-4.825 5.401-.28.092-2.882.731-6.158.514l-3.629 4.143c-.45.461-.776.385-.776-.272v-4.038C.314 18.46.586 13.453.605 11.157c.061-2.605.553-4.733 1.984-6.142C4.553 3.27 8.143 2.755 9.789 2.71c.564-.005.978-.011 1.682-.013zM12.5 4.04a.502.502 0 100 1.003c.4.013.79.063 1.17.15.6.137 1.17.376 1.71.717a4.875 4.875 0 011.41 1.41c.341.54.58 1.11.717 1.71.087.38.137.77.15 1.17.013.45.382.5.503.5h.013c.13 0 .499-.08.499-.5a6.05 6.05 0 00-.18-1.39 6.029 6.029 0 00-.853-2.024 5.802 5.802 0 00-1.668-1.668 6.029 6.029 0 00-2.024-.853 6.05 6.05 0 00-1.39-.18zm0 1.998a.5.5 0 100 1c.85.013 1.66.34 2.27.94.31.31.55.67.71 1.07.16.4.24.83.24 1.27 0 .39.38.5.5.5h.01c.39 0 .5-.39.5-.5 0-.6-.11-1.18-.32-1.74a3.974 3.974 0 00-.91-1.41 3.974 3.974 0 00-1.41-.91 4.978 4.978 0 00-1.74-.32zm.5 2c-.4 0-.5.39-.5.5 0 .39.31.5.5.5.21 0 .41.08.56.23.15.15.23.35.23.56 0 .4.39.5.5.5h.01c.39 0 .5-.39.5-.5 0-.47-.18-.92-.51-1.25a1.78 1.78 0 00-1.29-.54zm-4.39.84c-.21 0-.31.07-.43.18-.18.16-.71.79-.71.79-.19.22-.42.31-.69.18-.27-.13-.78-.41-1.18-.81-.4-.4-.69-.91-.81-1.18-.13-.27-.04-.5.18-.69 0 0 .63-.53.79-.71.11-.12.18-.22.18-.43 0-.2-.49-1.36-.69-1.78-.19-.42-.45-.36-.6-.36-.16 0-.34-.02-.53-.02-.18 0-.49.07-.74.34-.26.28-.97.95-.97 2.31 0 1.36.99 2.68 1.13 2.86.14.19 1.95 2.98 4.73 4.06 2.31.9 2.78.72 3.28.67.5-.05 1.62-.66 1.85-1.3.23-.64.23-1.18.16-1.3-.07-.11-.25-.18-.53-.32-.28-.13-1.63-.8-1.89-.89-.26-.09-.45-.14-.64.14-.19.28-.74.92-.91 1.1-.17.19-.33.21-.61.08z" />
          </svg>
          Viber
        </a>
        <a
          href={mailHref}
          className={`${base} bg-teal-600 hover:bg-teal-700`}
          aria-label="Pošalji preko Email-a"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          Email
        </a>
        <a
          href={smsHref}
          className={`${base} bg-slate-700 hover:bg-slate-800`}
          aria-label="Pošalji preko SMS-a"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          SMS
        </a>
      </div>
    </div>
  );
}
