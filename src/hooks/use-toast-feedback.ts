import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface ToastFeedbackOptions {
  ar: boolean;
}

export function useToastFeedback({ ar }: ToastFeedbackOptions) {
  const { toast } = useToast();
  const t = useTranslations("toast");

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
      t("created"),
      t("createdItem", { item: itemName })
    );

  const updated = (itemName: string) =>
    showSuccess(
      t("updated"),
      t("updatedItem", { item: itemName })
    );

  const deleted = (itemName: string) =>
    showSuccess(
      t("deleted"),
      t("deletedItem", { item: itemName })
    );

  const error = (operation?: string) =>
    showError(
      t("error"),
      operation
        ? t("operationFailedWith", { operation })
        : t("operationFailed")
    );

  return { showSuccess, showError, created, updated, deleted, error, toast };
}
