import { useEffect, useRef, useState } from 'react';
import { Check, ImageUp, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const BUCKET = 'payment-proofs';
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Customers upload a screenshot of their transfer instead of typing a
 * transaction ID.
 *
 * The file goes up as soon as it is chosen, so the customer sees it succeed
 * before committing to the order. The bucket is private — only the admin can
 * read these back, via a signed URL, because a payment screenshot shows the
 * sender's name, number and balance.
 */
export default function PaymentProofUpload({
  path,
  onChange,
}: {
  path: string | null;
  onChange: (path: string | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // Revoke the object URL when it changes or the component goes away.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const upload = async (file: File) => {
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('That is not an image. Please attach a screenshot.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That image is over 5 MB. Please attach a smaller screenshot.');
      return;
    }

    setBusy(true);
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(name, file, { cacheControl: '3600', upsert: false, contentType: file.type });

    setBusy(false);

    if (uploadError) {
      console.error('Payment proof upload failed:', uploadError);
      setError('Could not upload that image. Please try again, or send it to us on WhatsApp.');
      return;
    }

    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    onChange(name);
  };

  /* Ctrl+V anywhere in the upload area pastes a copied screenshot. */
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? [])[0];
      if (file) {
        e.preventDefault();
        void upload(file);
      }
    };
    zone.addEventListener('paste', onPaste);
    return () => zone.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clear = () => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <span className="mb-2 block text-xs uppercase tracking-widest text-stone-500">
        Payment Screenshot <span className="text-gold">*</span>
      </span>

      {path && preview ? (
        <div className="relative overflow-hidden rounded border border-emerald-300 bg-white">
          <img src={preview} alt="Your payment screenshot" className="max-h-56 w-full object-contain" />
          <button
            type="button"
            onClick={clear}
            aria-label="Remove screenshot"
            className="absolute right-2 top-2 rounded-full bg-ink/80 p-1.5 text-cream transition-colors hover:bg-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="flex items-center gap-1.5 border-t border-stone-200 px-3 py-2 text-xs text-emerald-700">
            <Check className="h-3.5 w-3.5" /> Screenshot attached
          </p>
        </div>
      ) : (
        <div
          ref={zoneRef}
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void upload(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-7 text-center transition-colors outline-none focus:border-gold ${
            dragging ? 'border-gold bg-gold/5' : 'border-stone-300 bg-white hover:border-gold'
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-gold" />
              <span className="text-sm text-stone-600">Uploading…</span>
            </>
          ) : (
            <>
              <ImageUp className="h-6 w-6 text-stone-400" />
              <span className="text-sm font-medium text-ink">Tap to attach your screenshot</span>
              <span className="text-xs text-stone-500">or drag it here, or paste with Ctrl+V</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-1.5 text-xs text-stone-500">
        Complete the transfer first, then attach a screenshot so we can confirm your order.
      </p>
    </div>
  );
}
