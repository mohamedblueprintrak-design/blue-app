'use client';

import { useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function DemoBanner() {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleReset = async () => {
    try {
      setIsResetting(true);
      const res = await fetch('/api/demo/reset', {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to reset demo data');
      
      toast({
        title: 'تم إعادة التعيين بنجاح',
        description: 'تم إعادة تعيين جميع البيانات التجريبية لحالتها الأصلية.',
      });
      
      // Force reload to reflect new data
      window.location.href = '/dashboard';
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إعادة تعيين البيانات التجريبية.',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm z-50 relative">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium hidden sm:inline">DEMO MODE:</span>
        <span>هذه البيئة مخصصة للعرض التجريبي. البيانات وهمية وتُستخدم لغرض التجربة فقط.</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleReset}
          disabled={isResetting}
          className="h-7 text-xs bg-white text-blue-600 hover:bg-blue-50"
        >
          {isResetting ? (
            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-2" />
          )}
          إعادة تعيين البيانات
        </Button>
      </div>
    </div>
  );
}
