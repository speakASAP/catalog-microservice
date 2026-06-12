'use client';

import { useState } from 'react';
import { productsApi } from '@/lib/api/products';
import LoadingSpinner from './LoadingSpinner';

interface BazosPublishPanelProps {
  productId: string;
}

const BAZOS_CATEGORIES = [
  'Auto',
  'Motorky',
  'Dum a zahrada',
  'Elektro',
  'Nabytek',
  'Obleceni',
  'Sport',
  'Detske zbozi',
  'Zvirata',
  'Ostatni',
];

const LOCATIONS = [
  'Praha',
  'Brno',
  'Ostrava',
  'Plzen',
  'Liberec',
  'Olomouc',
  'Ceske Budejovice',
  'Hradec Kralove',
  'Pardubice',
  'Zlin',
];

export default function BazosPublishPanel({ productId }: BazosPublishPanelProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState(BAZOS_CATEGORIES[3]);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSell = async () => {
    if (!phoneNumber.trim()) {
      setResult({ success: false, message: 'Enter your phone number first.' });
      return;
    }

    if (!displayName.trim()) {
      setResult({ success: false, message: 'Enter the seller name that should appear on Bazos.' });
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const response = await productsApi.sellOnBazos(productId, {
        phoneNumber: phoneNumber.trim(),
        displayName: displayName.trim(),
        category,
        location,
      });
      setResult(response.data || response);
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : 'Failed to start Bazos publishing.' });
    } finally {
      setSubmitting(false);
    }
  };

  const payload = result?.data || result;
  const queue = payload?.queue?.data || payload?.queue;
  const queued = queue?.queued === true;
  const blockedReasons = queue?.decision?.reasons || [];
  const verificationUrl = payload?.nextStep?.verificationUrl || payload?.verificationSession?.verificationUrl;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Sell on Bazos</h3>
          <p className="text-sm text-gray-600 mt-1">
            Start like a new Bazos seller: enter your phone, choose category and location, then complete Bazos verification manually.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSell}
          disabled={submitting || !phoneNumber.trim() || !displayName.trim()}
          className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <LoadingSpinner size="sm" /> : 'Start Bazos Sale'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Phone number</span>
          <input
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="+420 777 123 456"
            inputMode="tel"
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Seller name</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Name shown on Bazos"
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Bazos category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 bg-white"
          >
            {BAZOS_CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Location</span>
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 bg-white"
          >
            {LOCATIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      {result && (
        <div className={`rounded-xl border p-4 text-sm ${queued ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <div className="space-y-2">
            <p className="font-semibold">
              {queued
                ? 'Offer created and queued.'
                : payload?.message || payload?.nextStep?.message || 'Bazos publishing needs one more step.'}
            </p>
            {verificationUrl && (
              <a
                href={verificationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex px-4 py-2 bg-white border border-amber-300 rounded-lg font-semibold text-amber-900 hover:bg-amber-100"
              >
                Open Bazos verification
              </a>
            )}
            {blockedReasons.length > 0 && (
              <ul className="list-disc pl-5">
                {blockedReasons.map((reason: any) => (
                  <li key={reason.code}>{reason.message || reason.code}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
