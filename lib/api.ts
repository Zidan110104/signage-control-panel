const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    window.location.replace("/login");
    throw new Error("Silakan login terlebih dahulu.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.replace("/login");
    throw new Error("Sesi login berakhir. Silakan login kembali.");
  }

  return response;
}