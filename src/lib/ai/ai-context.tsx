'use client';

/**
 * AI Context Provider
 * مزود سياق الذكاء الاصطناعي
 * 
 * يوفر وظائف AI لجميع مكونات التطبيق
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect, useSyncExternalStore, ReactNode } from 'react';
import { aiRouter, AIRequest, AIResponse } from './ai-router';
import { AITaskType, getModelInfo, ModelConfig, AVAILABLE_MODELS } from './model-config';

// حالة الـ AI
interface AIState {
  isLoading: boolean;
  lastResponse: AIResponse | null;
  error: string | null;
}

// سياق الـ AI
interface AIContextType extends AIState {
  preferredModel: string | null;

  // الوظائف الأساسية
  execute: (request: AIRequest) => Promise<AIResponse>;
  quickChat: (prompt: string, context?: string) => Promise<AIResponse>;
  
  // وظائف متخصصة
  analyzeImage: (image: string, prompt: string) => Promise<AIResponse>;
  analyzeContract: (document: string) => Promise<AIResponse>;
  summarize: (text: string) => Promise<AIResponse>;
  translate: (text: string, targetLang?: 'ar' | 'en') => Promise<AIResponse>;
  
  // إدارة النماذج
  setPreferredModel: (modelId: string) => void;
  getAvailableModels: () => ModelConfig[];
  getBestModelForTask: (task: AITaskType, hasImage?: boolean) => string;
  
  // حالة التحميل
  setLoading: (loading: boolean) => void;
  clearError: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

// مفتاح التخزين المحلي
const PREFERRED_MODEL_KEY = 'bp_preferred_model';

// External store for preferredModel (avoids set-state-in-effect)
const preferredModelListeners = new Set<() => void>();

function subscribeToPreferredModel(callback: () => void): () => void {
  preferredModelListeners.add(callback);
  if (typeof window === 'undefined') {
    return () => { preferredModelListeners.delete(callback); };
  }
  const storageHandler = (e: StorageEvent) => {
    if (e.key === PREFERRED_MODEL_KEY) callback();
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    preferredModelListeners.delete(callback);
    window.removeEventListener('storage', storageHandler);
  };
}

function getPreferredModelSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PREFERRED_MODEL_KEY);
}

function getPreferredModelServerSnapshot(): string | null {
  return null;
}

function notifyPreferredModelChange(): void {
  preferredModelListeners.forEach(cb => cb());
}

export function AIProvider({ children }: { children: ReactNode }) {
  // الحالة
  const [state, setState] = useState<AIState>({
    isLoading: false,
    lastResponse: null,
    error: null,
  });

  // Read preferred model from localStorage via external store
  const preferredModel = useSyncExternalStore(
    subscribeToPreferredModel,
    getPreferredModelSnapshot,
    getPreferredModelServerSnapshot,
  );

  // Refs للتعامل مع الحالة بدون إعادة render
  const tokenRef = useRef<string | null>(null);

  // SECURITY FIX (P0-3): Removed JWT-from-localStorage anti-pattern.
  // The previous implementation read `localStorage.getItem('bp_token')` and passed
  // the JWT to `aiRouter.setToken()`. This exposed the access token to any XSS
  // payload running in the browser. The auth system stores JWT exclusively in
  // httpOnly cookies (named `blue_token`) that JavaScript cannot read — this is
  // the correct pattern. The `bp_token` localStorage key was dead code (no path
  // in the app ever writes to it), but leaving it in creates a security-smell and
  // risks being re-introduced.
  //
  // AI requests now rely on the browser automatically sending the httpOnly cookie
  // with each fetch() call (credentials: 'include' is configured in the fetch client).
  // The `aiRouter.setToken()` call has been removed entirely.
  useEffect(() => {
    // No-op: tokens are managed via httpOnly cookies by the auth layer.
    // Left as an empty effect for backward-compat with any downstream code that
    // expects AIProvider to perform initialization on mount.
  }, []);

  // تنفيذ طلب AI
  const execute = useCallback(async (request: AIRequest): Promise<AIResponse> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // إضافة النموذج المفضل لو موجود
      if (!request.modelOverride && preferredModel) {
        request.modelOverride = preferredModel;
      }

      const response = await aiRouter.execute(request);

      setState(prev => ({
        ...prev,
        isLoading: false,
        lastResponse: response,
        error: response.success ? null : (response.error ?? null)
      }));

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message
      }));

      return {
        success: false,
        content: '',
        model: request.modelOverride || '',
        error: message
      };
    }
  }, [preferredModel]);

  // محادثة سريعة
  const quickChat = useCallback(async (prompt: string, context?: string): Promise<AIResponse> => {
    return execute({ task: 'chat', prompt, context });
  }, [execute]);

  // تحليل صورة
  const analyzeImage = useCallback(async (image: string, prompt: string): Promise<AIResponse> => {
    return execute({ task: 'image-analysis', image, prompt });
  }, [execute]);

  // تحليل عقد
  const analyzeContract = useCallback(async (document: string): Promise<AIResponse> => {
    return execute({ task: 'contract-analysis', document, prompt: 'قم بتحليل هذا العقد' });
  }, [execute]);

  // تلخيص
  const summarize = useCallback(async (text: string): Promise<AIResponse> => {
    return execute({ task: 'summarize', prompt: text });
  }, [execute]);

  // ترجمة
  const translate = useCallback(async (text: string, targetLang: 'ar' | 'en' = 'ar'): Promise<AIResponse> => {
    return execute({
      task: 'translate',
      prompt: targetLang === 'ar' ? `ترجم إلى العربية:\n\n${text}` : `Translate to English:\n\n${text}`
    });
  }, [execute]);

  // الحصول على أفضل نموذج لمهمة
  const getBestModelForTask = useCallback((task: AITaskType, hasImage: boolean = false): string => {
    // لو فيه نموذج مفضل ويدعم المهمة
    if (preferredModel) {
      const modelInfo = getModelInfo(preferredModel);
      if (modelInfo && modelInfo.bestFor.includes(task)) {
        if (hasImage && !modelInfo.capabilities.includes('vision')) {
          // النموذج المفضل لا يدعم الصور
        } else {
          return preferredModel;
        }
      }
    }
    
    // اختيار النموذج الأفضل - inline logic instead of recursion
    const visionModels = ['gpt-4o', 'claude-3.5-sonnet', 'gemini-2.0-flash'];
    if (hasImage) return visionModels[0];
    return 'gpt-4o';
  }, [preferredModel]);

  // تعيين النموذج المفضل
  const setPreferredModel = useCallback((modelId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PREFERRED_MODEL_KEY, modelId);
      notifyPreferredModelChange();
    }
  }, []);

  // الحصول على النماذج المتاحة
  const getAvailableModels = useCallback(() => {
    return AVAILABLE_MODELS;
  }, []);

  // تعيين حالة التحميل
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  // مسح الخطأ
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <AIContext.Provider
      value={{
        ...state,
        preferredModel,
        execute,
        quickChat,
        analyzeImage,
        analyzeContract,
        summarize,
        translate,
        setPreferredModel,
        getAvailableModels,
        getBestModelForTask,
        setLoading,
        clearError
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

// Hook لاستخدام الـ AI Context
export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

// Hook مبسط للمحادثة
export function useAIChat() {
  const { quickChat, isLoading, error, clearError } = useAI();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const sendMessage = useCallback(async (prompt: string) => {
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    
    const response = await quickChat(prompt);
    
    if (response.success) {
      setMessages(prev => [...prev, { role: 'assistant', content: response.content }]);
    }
    
    return response;
  }, [quickChat]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    clearError,
    clearMessages
  };
}

// Hook لتحليل الصور
export function useImageAnalysis() {
  const { analyzeImage, isLoading, error } = useAI();
  const [lastResult, setLastResult] = useState<string | null>(null);

  const analyze = useCallback(async (image: string, prompt: string = 'قم بتحليل هذه الصورة بالتفصيل') => {
    const response = await analyzeImage(image, prompt);
    if (response.success) {
      setLastResult(response.content);
    }
    return response;
  }, [analyzeImage]);

  return {
    analyze,
    isLoading,
    error,
    lastResult
  };
}

export default AIContext;
