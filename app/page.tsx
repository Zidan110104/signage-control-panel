
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  LayoutDashboard,
  Monitor,
  Image as ImageIcon,
  Settings,
  Bell,
  Search,
  Plus,
  Wifi,
  WifiOff,
  Activity,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { authFetch } from "@/lib/api";

type Device = {
  id: string;
  nama: string;
  lokasi: string | null;
  status: "online" | "offline";
  last_seen: string | null;
};

type Content = {
  id: string;
  judul: string;
  tipe: string;
  payload: string;
  created_at: string;
};

type DeviceFormMode = "add" | "edit";
type ContentFormMode = "add" | "edit";
type ContentType = "image" | "video" | "url" | "text";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceFormMode, setDeviceFormMode] =
    useState<DeviceFormMode>("add");
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [deviceLocation, setDeviceLocation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [contentSearchTerm, setContentSearchTerm] = useState("");
  const [showContentModal, setShowContentModal] = useState(false);
  const [contentFormMode, setContentFormMode] =
    useState<ContentFormMode>("add");
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [contentTitle, setContentTitle] = useState("");
  const [contentType, setContentType] = useState<ContentType>("image");
  const [contentPayload, setContentPayload] = useState("");
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentDeletingId, setContentDeletingId] = useState<string | null>(
    null
  );

  // Authentication
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      window.location.replace("/login");
      return;
    }

    setAuthReady(true);
  }, []);

  // Push content
  const [selectedPushDevice, setSelectedPushDevice] = useState("");
  const [selectedPushContent, setSelectedPushContent] = useState("");
  const [pushSending, setPushSending] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [pushMessageType, setPushMessageType] = useState<
    "success" | "error" | ""
  >("");

  const socketRef = useRef<Socket | null>(null);

  // Mengambil data perangkat dan konten
  const fetchDashboardData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [deviceResponse, contentResponse] = await Promise.all([
          authFetch(`${API_URL}/devices`),
          authFetch(`${API_URL}/contents`),
        ]);

        const deviceResult = await deviceResponse.json();
        const contentResult = await contentResponse.json();

        if (!deviceResponse.ok || !deviceResult.success) {
          throw new Error(
            deviceResult.message || "Gagal mengambil data perangkat."
          );
        }

        if (!contentResponse.ok || !contentResult.success) {
          throw new Error(
            contentResult.message || "Gagal mengambil data konten."
          );
        }

        setDevices(
          Array.isArray(deviceResult.data) ? deviceResult.data : []
        );

        setContents(
          Array.isArray(contentResult.data) ? contentResult.data : []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat mengambil data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Ambil data setelah autentikasi siap
  useEffect(() => {
    if (authReady) {
      void fetchDashboardData();
    }
  }, [authReady, fetchDashboardData]);

  // WebSocket real-time
  useEffect(() => {
    if (!authReady) return;

    const socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000",
      {
        transports: ["websocket", "polling"],
      }
    );

    socketRef.current = socket;

    socket.on("device:status", (updatedDevice: Device) => {
      if (!updatedDevice || typeof updatedDevice.id !== "string") return;

      setDevices((currentDevices) =>
        currentDevices.map((device) =>
          device.id === updatedDevice.id
            ? {
                ...device,
                status: updatedDevice.status,
                last_seen: updatedDevice.last_seen,
              }
            : device
        )
      );
    });

    socket.on(
      "content:push:result",
      (result: { success?: boolean; message?: string }) => {
        setPushSending(false);
        setPushMessage(
          result?.message || "Server tidak memberikan pesan hasil."
        );
        setPushMessageType(result?.success ? "success" : "error");
      }
    );

    socket.on("connect_error", (socketError) => {
      console.error(
        "WebSocket connection error:",
        socketError.message
      );
    });

    return () => {
      socket.off("device:status");
      socket.off("content:push:result");
      socket.off("connect_error");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authReady]);

  const onlineCount = devices.filter(
    (device) => device.status === "online"
  ).length;

  const offlineCount = devices.filter(
    (device) => device.status !== "online"
  ).length;

  const filteredDevices = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return devices;

    return devices.filter((device) =>
      [device.nama, device.lokasi || "", device.status].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    );
  }, [devices, searchTerm]);

  // DEVICE MANAGEMENT
  function openAddDeviceModal() {
    setError("");
    setSuccess("");
    setDeviceFormMode("add");
    setEditingDevice(null);
    setDeviceName("");
    setDeviceLocation("");
    setShowDeviceModal(true);
  }

  function openEditDeviceModal(device: Device) {
    setError("");
    setSuccess("");
    setDeviceFormMode("edit");
    setEditingDevice(device);
    setDeviceName(device.nama);
    setDeviceLocation(device.lokasi || "");
    setShowDeviceModal(true);
  }

  function closeDeviceModal() {
    if (saving) return;

    setShowDeviceModal(false);
    setEditingDevice(null);
    setDeviceName("");
    setDeviceLocation("");
  }

  async function handleDeviceSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const nama = deviceName.trim();
    const lokasi = deviceLocation.trim();

    if (!nama || !lokasi) {
      setError("Nama dan lokasi perangkat wajib diisi.");
      return;
    }

    const isEditing =
      deviceFormMode === "edit" && editingDevice !== null;

    const endpoint = isEditing
      ? `${API_URL}/devices/${editingDevice.id}`
      : `${API_URL}/devices`;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await authFetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nama, lokasi }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (isEditing
              ? "Gagal memperbarui perangkat."
              : "Gagal menambahkan perangkat.")
        );
      }

      setShowDeviceModal(false);
      setEditingDevice(null);
      setDeviceName("");
      setDeviceLocation("");

      await fetchDashboardData(true);

      setSuccess(
        isEditing
          ? "Perangkat berhasil diperbarui."
          : "Perangkat berhasil ditambahkan."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan perangkat."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDevice(device: Device) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus perangkat "${device.nama}"? Tindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(device.id);
      setError("");
      setSuccess("");

      const response = await authFetch(
        `${API_URL}/devices/${device.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menghapus perangkat."
        );
      }

      await fetchDashboardData(true);

      setSuccess(`Perangkat "${device.nama}" berhasil dihapus.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghapus perangkat."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // CONTENT MANAGEMENT
  const filteredContents = useMemo(() => {
    const keyword = contentSearchTerm.trim().toLowerCase();

    if (!keyword) return contents;

    return contents.filter((content) =>
      [content.judul, content.tipe, content.payload].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    );
  }, [contents, contentSearchTerm]);

  function openAddContentModal() {
    setError("");
    setSuccess("");
    setContentFormMode("add");
    setEditingContent(null);
    setContentTitle("");
    setContentType("image");
    setContentPayload("");
    setContentFile(null);
    setShowContentModal(true);
  }

  function openEditContentModal(content: Content) {
    setError("");
    setSuccess("");
    setContentFormMode("edit");
    setEditingContent(content);
    setContentTitle(content.judul);
    setContentType(content.tipe as ContentType);
    setContentPayload(content.payload);
    setContentFile(null);
    setShowContentModal(true);
  }

  function closeContentModal() {
    if (contentSaving) return;

    setShowContentModal(false);
    setEditingContent(null);
    setContentFile(null);
  }

  async function handleContentSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const judul = contentTitle.trim();

    const isEditing =
      contentFormMode === "edit" && editingContent !== null;

    if (!judul) {
      setError("Judul konten wajib diisi.");
      return;
    }

    if (
      !isEditing &&
      (contentType === "image" || contentType === "video") &&
      !contentFile
    ) {
      setError("Pilih file gambar atau video terlebih dahulu.");
      return;
    }

    if (
      !isEditing &&
      (contentType === "url" || contentType === "text") &&
      !contentPayload.trim()
    ) {
      setError("Isi URL atau teks konten terlebih dahulu.");
      return;
    }

    if (contentFile && contentFile.size > 50 * 1024 * 1024) {
      setError("Ukuran file maksimal 50 MB.");
      return;
    }

    try {
      setContentSaving(true);
      setError("");
      setSuccess("");

      let response: Response;

      if (
        !isEditing &&
        (contentType === "image" || contentType === "video")
      ) {
        const formData = new FormData();

        formData.append("file", contentFile as File);
        formData.append("judul", judul);

        response = await authFetch(`${API_URL}/contents/upload`, {
          method: "POST",
          body: formData,
        });
      } else {
        const payload = contentPayload.trim();

        if (!payload) {
          throw new Error("Payload konten wajib diisi.");
        }

        response = await authFetch(
          isEditing
            ? `${API_URL}/contents/${editingContent!.id}`
            : `${API_URL}/contents`,
          {
            method: isEditing ? "PUT" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              judul,
              tipe: contentType,
              payload,
            }),
          }
        );
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menyimpan konten."
        );
      }

      setShowContentModal(false);
      setEditingContent(null);
      setContentFile(null);

      await fetchDashboardData(true);

      setSuccess(
        isEditing
          ? "Konten berhasil diperbarui."
          : "Konten berhasil ditambahkan."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan konten."
      );
    } finally {
      setContentSaving(false);
    }
  }

  // FUNGSI DELETE CONTENT - SUDAH DITAMBAHKAN
  async function handleDeleteContent(content: Content) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus konten "${content.judul}"?`
    );

    if (!confirmed) return;

    try {
      setContentDeletingId(content.id);
      setError("");
      setSuccess("");

      const response = await authFetch(
        `${API_URL}/contents/${content.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menghapus konten."
        );
      }

      await fetchDashboardData(true);

      setSuccess(`Konten "${content.judul}" berhasil dihapus.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menghapus konten."
      );
    } finally {
      setContentDeletingId(null);
    }
  }

  // PUSH CONTENT
  function handlePushContent() {
    const socket = socketRef.current;

    if (!selectedPushDevice || !selectedPushContent) {
      setPushMessage(
        "Pilih perangkat dan konten terlebih dahulu."
      );
      setPushMessageType("error");
      return;
    }

    const targetDevice = devices.find(
      (device) => device.id === selectedPushDevice
    );

    if (!targetDevice || targetDevice.status !== "online") {
      setPushMessage(
        "Perangkat tujuan sedang offline. Pilih perangkat yang online."
      );
      setPushMessageType("error");
      return;
    }

    if (!socket || !socket.connected) {
      setPushMessage(
        "Dashboard belum terhubung ke WebSocket server. Coba muat ulang halaman."
      );
      setPushMessageType("error");
      return;
    }

    setPushSending(true);
    setPushMessage("Mengirim konten ke perangkat...");
    setPushMessageType("");

    socket.emit("admin:push-content", {
      deviceId: selectedPushDevice,
      contentId: selectedPushContent,
    });
  }

  function formatLastSeen(value: string | null) {
    if (!value) return "Belum pernah terhubung";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // Jangan tampilkan dashboard sebelum autentikasi diperiksa
  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Memeriksa autentikasi...
      </main>
    );
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <span>
            Signage<span className="brand-light">Control</span>
          </span>
        </div>

        <p className="menu-label">MENU UTAMA</p>

        <nav>
          <a className="nav-item active" href="#">
            <LayoutDashboard size={19} /> Overview
          </a>
          <a className="nav-item" href="#devices">
            <Monitor size={19} /> Devices
          </a>
          <a className="nav-item" href="#contents">
            <ImageIcon size={19} /> Contents
          </a>
        </nav>

        <div className="sidebar-bottom">
          <a className="nav-item" href="#">
            <Settings size={19} /> Settings
          </a>

          <div className="profile">
            <div className="avatar">AD</div>
            <div>
              <strong>Administrator</strong>
              <small>System Admin</small>
            </div>
          </div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Pages / Overview</span>
            <h1>Dashboard Overview</h1>
          </div>

          <div className="top-actions">
            <a
              className="icon-button"
              href="#devices"
              aria-label="Cari perangkat"
            >
              <Search size={19} />
            </a>

            <button
              className="icon-button"
              type="button"
              aria-label="Notifikasi"
            >
              <Bell size={19} />
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                localStorage.removeItem("admin_token");
                window.location.replace("/login");
              }}
            >
              Logout
            </button>

            <div className="avatar">AD</div>
          </div>
        </header>

        <div className="welcome">
          <div>
            <h2>Welcome back, Administrator 👋</h2>
            <p>
              Monitor and manage your digital signage devices.
            </p>
          </div>

          <div className="welcome-actions">
            <button
              className="primary-button"
              type="button"
              onClick={openAddDeviceModal}
            >
              <Plus size={17} /> Add Device
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() => void fetchDashboardData(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={refreshing ? "spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
            <button
              type="button"
              onClick={() => setError("")}
            >
              Tutup
            </button>
          </div>
        )}

        {success && (
          <div className="success-message" role="status">
            {success}
            <button
              type="button"
              onClick={() => setSuccess("")}
            >
              Tutup
            </button>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span>Total Devices</span>
              <Monitor size={20} />
            </div>
            <h2>{loading ? "..." : devices.length}</h2>
            <p>Registered devices</p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Online Devices</span>
              <Wifi size={20} />
            </div>
            <h2 className="green">
              {loading ? "..." : onlineCount}
            </h2>
            <p>Currently connected</p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Offline Devices</span>
              <WifiOff size={20} />
            </div>
            <h2 className="red">
              {loading ? "..." : offlineCount}
            </h2>
            <p>Currently disconnected</p>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span>Total Contents</span>
              <ImageIcon size={20} />
            </div>
            <h2>{loading ? "..." : contents.length}</h2>
            <p>Uploaded contents</p>
          </div>
        </div>

        {/* DEVICE MANAGEMENT */}
        <section className="panel" id="devices">
          <div className="panel-header device-panel-header">
            <div>
              <h2>Device Management</h2>
              <p>
                Monitor and manage all registered signage devices.
              </p>
            </div>

            <div className="device-toolbar">
              <div className="search-field">
                <Search size={16} />

                <input
                  type="search"
                  aria-label="Cari perangkat"
                  placeholder="Cari nama, lokasi, status..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="clear-search"
                    aria-label="Hapus pencarian"
                    onClick={() => setSearchTerm("")}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                className="primary-button"
                type="button"
                onClick={openAddDeviceModal}
              >
                <Plus size={17} /> Add Device
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>DEVICE NAME</th>
                  <th>LOCATION</th>
                  <th>STATUS</th>
                  <th>LAST SEEN</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>Loading devices...</td>
                  </tr>
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      {devices.length === 0
                        ? "Belum ada perangkat. Klik Add Device untuk menambahkan."
                        : "Perangkat tidak ditemukan. Coba kata kunci lain."}
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => (
                    <tr key={device.id}>
                      <td>
                        <strong>{device.nama}</strong>
                      </td>

                      <td>{device.lokasi || "-"}</td>

                      <td>
                        <span
                          className={`status ${
                            device.status === "online"
                              ? "online"
                              : "offline"
                          }`}
                        >
                          {device.status}
                        </span>
                      </td>

                      <td>
                        {formatLastSeen(device.last_seen)}
                      </td>

                      <td>
                        <div className="device-actions">
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() =>
                              openEditDeviceModal(device)
                            }
                            title={`Edit ${device.nama}`}
                          >
                            <Pencil size={14} /> Edit
                          </button>

                          <button
                            type="button"
                            className="delete-button"
                            onClick={() =>
                              void handleDeleteDevice(device)
                            }
                            disabled={deletingId === device.id}
                            title={`Hapus ${device.nama}`}
                          >
                            <Trash2 size={14} />
                            {deletingId === device.id
                              ? "Menghapus..."
                              : "Hapus"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-summary">
            Menampilkan {filteredDevices.length} dari{" "}
            {devices.length} perangkat
          </div>
        </section>

        {/* PUSH CONTENT */}
        <section
          className="panel"
          id="push-content"
          style={{ marginBottom: 24 }}
        >
          <div className="panel-header">
            <div>
              <h2>Push Content to Device</h2>
              <p>
                Kirim konten secara langsung ke perangkat yang sedang
                online.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              padding: "0 24px 24px",
              alignItems: "Start",
            }}
          >
            <div>
              <label
                htmlFor="pushDevice"
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Pilih Perangkat
              </label>

              <select
                id="pushDevice"
                value={selectedPushDevice}
                onChange={(event) =>
                  setSelectedPushDevice(event.target.value)
                }
                style={{
                  width: "100%",
                  padding: 11,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: "white",
                }}
              >
                <option value="">
                  -- Pilih perangkat online --
                </option>

                {devices
                  .filter((device) => device.status === "online")
                  .map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.nama}
                      {device.lokasi ? ` - ${device.lokasi}` : ""}
                    </option>
                  ))}
              </select>

              {devices.filter(
                (device) => device.status === "online"
              ).length === 0 && (
                <small
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "#dc2626",
                  }}
                >
                  Belum ada perangkat yang online.
                </small>
              )}
            </div>

            <div>
              <label
                htmlFor="pushContent"
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                Pilih Konten
              </label>

              <select
                id="pushContent"
                value={selectedPushContent}
                onChange={(event) =>
                  setSelectedPushContent(event.target.value)
                }
                style={{
                  width: "100%",
                  padding: 11,
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: "white",
                }}
              >
                <option value="">-- Pilih konten --</option>

                {contents.map((content) => (
                  <option key={content.id} value={content.id}>
                    {content.judul} ({content.tipe})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ alignSelf: "end" }}>
              <button
                type="button"
                className="primary-button"
                onClick={handlePushContent}
                disabled={
                  pushSending ||
                  devices.every(
                    (device) => device.status !== "online"
                  ) ||
                  contents.length === 0
                }
                style={{ minHeight: 42 }}
              >
                {pushSending ? "Mengirim..." : "Push Content"}
              </button>
            </div>
          </div>

          {pushMessage && (
            <div
              role="status"
              style={{
                margin: "0 24px 20px",
                padding: "11px 14px",
                borderRadius: 8,
                background:
                  pushMessageType === "success"
                    ? "#dcfce7"
                    : pushMessageType === "error"
                      ? "#fee2e2"
                      : "#e0f2fe",
                color:
                  pushMessageType === "success"
                    ? "#166534"
                    : pushMessageType === "error"
                      ? "#991b1b"
                      : "#075985",
              }}
            >
              {pushMessage}
            </div>
          )}
        </section>

        {/* CONTENT MANAGEMENT */}
        <section className="panel" id="contents">
          <div className="panel-header device-panel-header">
            <div>
              <h2>Content Management</h2>
              <p>
                Upload, preview, and manage your digital signage
                content.
              </p>
            </div>

            <div className="device-toolbar">
              <div className="search-field">
                <Search size={16} />

                <input
                  type="search"
                  aria-label="Cari konten"
                  placeholder="Cari judul, tipe konten..."
                  value={contentSearchTerm}
                  onChange={(event) =>
                    setContentSearchTerm(event.target.value)
                  }
                />

                {contentSearchTerm && (
                  <button
                    type="button"
                    className="clear-search"
                    aria-label="Hapus pencarian konten"
                    onClick={() => setContentSearchTerm("")}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                className="primary-button"
                type="button"
                onClick={openAddContentModal}
              >
                <Plus size={17} /> Add Content
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-content">
              Loading contents...
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="empty-content">
              <ImageIcon size={34} />

              <h3>
                {contents.length === 0
                  ? "Belum ada konten"
                  : "Konten tidak ditemukan"}
              </h3>

              <p>
                {contents.length === 0
                  ? "Tambahkan gambar, video, URL, atau teks untuk memulai."
                  : "Coba kata kunci pencarian lain."}
              </p>
            </div>
          ) : (
            <div className="content-grid">
              {filteredContents.map((content) => (
                <div className="content-card" key={content.id}>
                  <div className="content-preview">
                    {content.tipe === "image" ? (
                      <img
                        src={content.payload}
                        alt={content.judul}
                      />
                    ) : content.tipe === "video" ? (
                      <video
                        src={content.payload}
                        controls
                        preload="metadata"
                      />
                    ) : content.tipe === "url" ? (
                      <a
                        className="content-link-preview"
                        href={content.payload}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={25} />
                        <span>Buka URL konten</span>
                      </a>
                    ) : (
                      <div className="content-text">
                        {content.payload}
                      </div>
                    )}
                  </div>

                  <div className="content-info">
                    <strong title={content.judul}>
                      {content.judul}
                    </strong>
                    <small>{content.tipe.toUpperCase()}</small>
                  </div>

                  <div className="content-card-actions">
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() =>
                        openEditContentModal(content)
                      }
                    >
                      <Pencil size={14} /> Edit
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() =>
                        void handleDeleteContent(content)
                      }
                      disabled={
                        contentDeletingId === content.id
                      }
                    >
                      <Trash2 size={14} />
                      {contentDeletingId === content.id
                        ? "Menghapus..."
                        : "Hapus"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="table-summary">
            Menampilkan {filteredContents.length} dari{" "}
            {contents.length} konten
          </div>
        </section>

        <footer>
          <Activity size={15} />
          Signage Control Panel · Admin Dashboard
        </footer>
      </section>

      {/* DEVICE MODAL */}
      {showDeviceModal && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDeviceModal();
            }
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-modal-title"
          >
            <div className="modal-header">
              <h2 id="device-modal-title">
                {deviceFormMode === "edit"
                  ? "Edit Perangkat"
                  : "Tambah Perangkat"}
              </h2>

              <button
                type="button"
                className="modal-close"
                onClick={closeDeviceModal}
                disabled={saving}
                aria-label="Tutup modal"
              >
                <X size={20} />
              </button>
            </div>

            <p>
              {deviceFormMode === "edit"
                ? "Perbarui informasi perangkat signage."
                : "Masukkan informasi perangkat signage baru."}
            </p>

            <form onSubmit={handleDeviceSubmit}>
              <label htmlFor="deviceName">
                Nama Perangkat
              </label>

              <input
                id="deviceName"
                type="text"
                placeholder="Contoh: Display Lobby"
                value={deviceName}
                onChange={(event) =>
                  setDeviceName(event.target.value)
                }
                maxLength={100}
                required
                autoFocus
              />

              <label htmlFor="deviceLocation">
                Lokasi Perangkat
              </label>

              <input
                id="deviceLocation"
                type="text"
                placeholder="Contoh: Area Lobby"
                value={deviceLocation}
                onChange={(event) =>
                  setDeviceLocation(event.target.value)
                }
                maxLength={150}
                required
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeDeviceModal}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : deviceFormMode === "edit"
                      ? "Simpan Perubahan"
                      : "Simpan Perangkat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTENT MODAL */}
      {showContentModal && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeContentModal();
            }
          }}
        >
          <div
            className="modal content-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="content-modal-title"
          >
            <div className="modal-header">
              <h2 id="content-modal-title">
                {contentFormMode === "edit"
                  ? "Edit Konten"
                  : "Tambah Konten"}
              </h2>

              <button
                type="button"
                className="modal-close"
                onClick={closeContentModal}
                disabled={contentSaving}
                aria-label="Tutup modal"
              >
                <X size={20} />
              </button>
            </div>

            <p>
              {contentFormMode === "edit"
                ? "Perbarui informasi konten yang sudah tersimpan."
                : "Tambahkan konten gambar, video, URL, atau teks."}
            </p>

            <form onSubmit={handleContentSubmit}>
              <label htmlFor="contentTitle">
                Judul Konten
              </label>

              <input
                id="contentTitle"
                type="text"
                placeholder="Contoh: Pengumuman Promo"
                value={contentTitle}
                onChange={(event) =>
                  setContentTitle(event.target.value)
                }
                maxLength={150}
                required
              />

              <label htmlFor="contentType">
                Tipe Konten
              </label>

              <select
                id="contentType"
                value={contentType}
                onChange={(event) => {
                  setContentType(
                    event.target.value as ContentType
                  );
                  setContentFile(null);
                  setContentPayload("");
                }}
                disabled={contentFormMode === "edit"}
              >
                <option value="image">Gambar</option>
                <option value="video">Video</option>
                <option value="url">URL</option>
                <option value="text">Teks</option>
              </select>

              {contentFormMode === "add" &&
              (contentType === "image" ||
                contentType === "video") ? (
                <>
                  <label htmlFor="contentFile">
                    Pilih File (
                    {contentType === "image"
                      ? "JPG, PNG, WEBP"
                      : "MP4, WEBM"}
                    )
                  </label>

                  <input
                    id="contentFile"
                    type="file"
                    accept={
                      contentType === "image"
                        ? "image/jpeg,image/png,image/webp"
                        : "video/mp4,video/webm"
                    }
                    onChange={(event) =>
                      setContentFile(
                        event.target.files?.[0] || null
                      )
                    }
                    required
                  />

                  <small className="form-hint">
                    Maksimal 50 MB. File akan diunggah ke Supabase
                    Storage.
                    {contentFile
                      ? ` Dipilih: ${contentFile.name}`
                      : ""}
                  </small>
                </>
              ) : (
                <>
                  <label htmlFor="contentPayload">
                    {contentType === "url"
                      ? "URL Konten"
                      : contentType === "text"
                        ? "Isi Teks"
                        : "URL File"}
                  </label>

                  {contentType === "text" ? (
                    <textarea
                      id="contentPayload"
                      rows={4}
                      placeholder="Masukkan teks yang akan ditampilkan..."
                      value={contentPayload}
                      onChange={(event) =>
                        setContentPayload(event.target.value)
                      }
                      required
                    />
                  ) : (
                    <input
                      id="contentPayload"
                      type="text"
                      placeholder="https://..."
                      value={contentPayload}
                      onChange={(event) =>
                        setContentPayload(event.target.value)
                      }
                      required
                    />
                  )}

                  {contentFormMode === "edit" &&
                    (contentType === "image" ||
                      contentType === "video") && (
                      <small className="form-hint">
                        Untuk mengganti file media, tambahkan konten
                        baru melalui menu Add Content. Upload baru
                        akan membuat record konten baru.
                      </small>
                    )}
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeContentModal}
                  disabled={contentSaving}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={contentSaving}
                >
                  {contentSaving
                    ? "Menyimpan..."
                    : contentFormMode === "edit"
                      ? "Simpan Perubahan"
                      : contentType === "image" ||
                          contentType === "video"
                        ? "Upload Konten"
                        : "Simpan Konten"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
