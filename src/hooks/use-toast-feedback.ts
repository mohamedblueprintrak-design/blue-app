import { useToast } from "@/hooks/use-toast";

interface ToastFeedbackOptions {
  ar: boolean;
}

export function useToastFeedback({ ar }: ToastFeedbackOptions) {
  const { toast } = useToast();

  const showSuccess = (message: string, description?: string) => {
    toast({
      title: message,
      description,
      variant: "success",
    });
  };

  const showError = (message: string, description?: string) => {
    toast({
      title: message,
      description,
      variant: "destructive",
    });
  };

  const created = (itemName: string) =>
    showSuccess(
      ar ? "تم الإنشاء بنجاح" : "Created successfully",
      ar ? `تم إنشاء ${itemName}` : `${itemName} created`
    );

  const updated = (itemName: string) =>
    showSuccess(
      ar ? "تم التحديث بنجاح" : "Updated successfully",
      ar ? `تم تحديث ${itemName}` : `${itemName} updated`
    );

  const deleted = (itemName: string) =>
    showSuccess(
      ar ? "تم الحذف بنجاح" : "Deleted successfully",
      ar ? `تم حذف ${itemName}` : `${itemName} deleted`
    );

  const error = (operation?: string) =>
    showError(
      ar ? "حدث خطأ" : "Error occurred",
      operation
        ? ar
          ? `فشل تنفيذ العملية: ${operation}`
          : `Operation failed: ${operation}`
        : ar
          ? "فشل تنفيذ العملية"
          : "Operation failed"
    );

  return { showSuccess, showError, created, updated, deleted, error, toast };
}
