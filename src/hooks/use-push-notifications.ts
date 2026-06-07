import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn("[PushNotifications] VAPID public key not found in env variables");
      return;
    }

    async function subscribeUser() {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();
        
        // If no subscription, create a new one
        if (!subscription) {
          // Check permission first
          let permission = Notification.permission;
          if (permission === "default") {
            permission = await Notification.requestPermission();
          }

          if (permission !== "granted") {
            console.info("[PushNotifications] Notification permission denied");
            return;
          }

          const convertedVapidKey = urlBase64ToUint8Array(vapidKey!);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        }

        // Send to backend
        const response = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscription),
        });

        if (!response.ok) {
          throw new Error("Failed to subscribe on server");
        }

        console.info("[PushNotifications] Subscribed successfully to push notifications");
      } catch (error) {
        console.error("[PushNotifications] Error subscribing to push notifications", error);
      }
    }

    // Delay subscription request slightly to not block initial page rendering
    const timer = setTimeout(() => {
      subscribeUser();
    }, 3000);

    return () => clearTimeout(timer);
  }, [user]);
}
