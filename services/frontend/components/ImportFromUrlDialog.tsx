'use client';

/**
 * Import From URL Dialog
 * Paste a marketplace listing URL and import it as a product — title, description,
 * price and photos are pulled from the listing by the catalog service.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { productsApi, Product } from '@/lib/api/products';

/** Adding a marketplace means a new importer in the service plus one line here. */
const SUPPORTED_MARKETPLACES = [
  { label: 'Aukro', example: 'https://aukro.cz/nazev-polozky-7124914683' },
  { label: 'Sbazar', example: 'https://www.sbazar.cz/inzerat/232280241-nazev-inzeratu' },
] as const;

const SUPPORTED_LABEL = SUPPORTED_MARKETPLACES.map((market) => market.label).join(' and ');

interface ImportFromUrlDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful import so the caller can refresh its list. */
  onImported?: (product: Product) => void;
}

type DialogState =
  | { status: 'idle' }
  | { status: 'importing' }
  | { status: 'imported'; product: Product }
  | { status: 'duplicate'; message: string; existingProductId?: string }
  | { status: 'error'; message: string };

export default function ImportFromUrlDialog({
  open,
  onClose,
  onImported,
}: ImportFromUrlDialogProps) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<DialogState>({ status: 'idle' });

  useEffect(() => {
    if (open) {
      setUrl('');
      setState({ status: 'idle' });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const importing = state.status === 'importing';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || importing) return;

    setState({ status: 'importing' });
    const response = await productsApi.importFromUrl(trimmed);

    if (response.success && response.data) {
      setState({ status: 'imported', product: response.data });
      onImported?.(response.data);
      return;
    }

    const details = response.error?.details as { existingProductId?: string } | undefined;
    const message = response.error?.message || 'Import failed';

    if (response.error?.status === 409) {
      setState({ status: 'duplicate', message, existingProductId: details?.existingProductId });
      return;
    }

    setState({ status: 'error', message });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-from-url-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="import-from-url-title" className="text-xl font-extrabold text-gray-900">
              🔗 Import from URL
            </h2>
            <p className="text-sm text-gray-600">
              Paste a listing link — we import the title, description, price and photos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="import-url" className="block text-sm font-semibold text-gray-700">
            Listing URL
          </label>
          <input
            id="import-url"
            type="url"
            required
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            disabled={importing}
            placeholder={SUPPORTED_MARKETPLACES[1].example}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />

          <p className="text-xs text-gray-500">
            Supported: {SUPPORTED_LABEL}. More marketplaces are being added.
          </p>

          {state.status === 'importing' && (
            <p className="text-sm text-blue-700 font-semibold">
              Importing — downloading photos can take a few seconds…
            </p>
          )}

          {state.status === 'imported' && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              <p className="font-semibold">Imported “{state.product.title}”</p>
              <Link
                href={`/dashboard/products/${state.product.id}`}
                className="underline font-semibold"
              >
                Open the product
              </Link>
            </div>
          )}

          {state.status === 'duplicate' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              <p className="font-semibold">{state.message}</p>
              {state.existingProductId && (
                <Link
                  href={`/dashboard/products/${state.existingProductId}`}
                  className="underline font-semibold"
                >
                  Open the existing product
                </Link>
              )}
            </div>
          )}

          {state.status === 'error' && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {state.message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              {state.status === 'imported' ? 'Done' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={importing || !url.trim()}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
