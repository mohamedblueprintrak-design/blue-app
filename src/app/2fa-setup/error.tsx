'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-xl font-bold">حدث خطأ</h2>
      <button onClick={() => reset()} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
        حاول مرة أخرى
      </button>
    </div>
  );
}
