import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ConfirmationPage() {
  const router = useRouter();
  const { sku } = router.query;

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6 text-center">
      <h1 className="text-2xl font-bold text-green-700">Special Order Submitted!</h1>
      {isClient && sku ? (
        <>
          <p className="text-lg">Your order has been submitted successfully.</p>
          <p className="text-gray-700">
            <strong>SKU:</strong> <span className="font-mono text-blue-600">{sku}</span>
          </p>
          <div className="space-x-4 mt-4">
            <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded">
              Start Another Order
            </a>
            <a href="/history" className="px-4 py-2 bg-gray-300 text-gray-900 rounded">
              View Order History
            </a>
            <a
              href={`/${sku ? `files/SpecialOrder_${sku}.pdf` : '#'}`}
              download
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Download PDF
            </a>
          </div>
        </>
      ) : (
        <p>Loading confirmation...</p>
      )}
    </div>
  );
}
