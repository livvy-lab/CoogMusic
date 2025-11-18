// Toast utility function
export function showToast(message, type = "info", timeout = 3000) {
  const event = new CustomEvent("appToast", {
    detail: { message, type, timeout }
  });
  window.dispatchEvent(event);
}
