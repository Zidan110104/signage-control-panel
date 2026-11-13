# Digital Signage Control Panel

A web-based digital signage management system that allows administrators to manage devices, upload media content, create device playlists, and remotely push content to connected devices in real time.

## 1. Features

### Admin Dashboard
- Admin authentication using JWT.
- Device management (Create, Read, Update, Delete).
- Content management (Create, Read, Update, Delete).
- Image and video upload.
- Device online/offline monitoring.
- Real-time device status updates.

### Playlist Management
- Assign multiple contents to a device.
- Manage device-specific playlists.
- Add and remove playlist items.
- Reorder playlist contents.
- Push content to selected devices.

### Device Client
- Display assigned media content.
- Connect to the backend using Socket.IO.
- Receive content updates in real time.
- Automatic reconnection when the connection is interrupted.
- Device online/offline status registration.

## 2. Technologies Used

| Component | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage |
| Real-time Communication | Socket.IO |
| Authentication | JWT and bcrypt |
| File Upload | Multer |

## 3. Project Structure

```text
signage-control-panel/
├── app/
│   ├── device/
│   │   └── [id]/
│   ├── login/
│   ├── page.tsx
│   └── layout.tsx
├── lib/
│   └── api.ts
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── sockets/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── .env.local
└── package.json
```

## 4. Database Structure

The application uses Supabase PostgreSQL.

### Devices
Stores registered digital signage devices.

- `id`
- `nama`
- `lokasi`
- `status`
- `last_seen`

### Contents
Stores uploaded media content.

- `id`
- `judul`
- `tipe`
- `payload/url`
- `created_at`

### Device Playlists
Stores the relationship between devices and their assigned contents.

- `id`
- `device_id`
- `content_id`
- `sort_order`
- `created_at`

The `device_playlists` table uses foreign keys referencing the `devices` and `contents` tables.

## 5. Installation and Setup

### Prerequisites

Make sure the following are installed:

- Node.js and npm
- Supabase account and project
- Git (optional)

### Step 1: Clone or Extract the Project

```bash
git clone <repository-url>
cd signage-control-panel
```

If the project is provided as a ZIP file, extract it and open the project directory.

### Step 2: Install Frontend Dependencies

```bash
npm install
```

### Step 3: Configure Frontend Environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Step 4: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 5: Configure Backend Environment

Create a `.env` file inside the `server` directory.

Configure the following variables:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-password-hash>
JWT_SECRET=<your-secret-key>

# Add the Supabase connection variables
# using the exact variable names required by the backend source code.
```

**Important:** Configure the Supabase credentials according to the backend implementation. Do not commit `.env` or `.env.local` files containing credentials or secrets.

### Step 6: Configure Supabase

1. Create a Supabase project.
2. Create the required database tables.
3. Create and configure a storage bucket for uploaded media.
4. Configure the Supabase connection variables in the backend environment.

## 6. Running the Application

The frontend and backend must run simultaneously.

### Start Backend

Open a terminal:

```bash
cd server
npm run dev
```

Backend URL:

`http://localhost:5000`

Health check:

`http://localhost:5000/api/health`

### Start Frontend

Open another terminal in the project root:

```bash
npm run dev
```

Frontend URL:

`http://localhost:3000`

Admin login:

`http://localhost:3000/login`

Device Client:

`http://localhost:3000/device/{device-id}`

Replace `{device-id}` with the actual UUID of a registered device.

## 7. Production Build

### Backend

```bash
cd server
npm run build
npm start
```

### Frontend

```bash
npm run build
npm start
```

## 8. Authentication

The admin dashboard uses JWT-based authentication.

- Admin credentials are configured through backend environment variables.
- Passwords are verified using bcrypt.
- Successful login returns a JWT token.
- Protected admin API requests use the Bearer Token authorization header.
- Tokens expire after 8 hours.

## 9. Real-Time Communication

Socket.IO is used for real-time communication between the backend and connected devices.

The system supports:
- Device connection registration.
- Online/offline status updates.
- Content push notifications.
- Device reconnection handling.

## 10. Testing Checklist

- [x] Admin login using JWT.
- [x] Device CRUD operations.
- [x] Content CRUD operations.
- [x] Image and video upload.
- [x] Device playlist management.
- [x] Push content to selected devices.
- [x] Real-time online/offline status.
- [x] Device Client content display.
- [x] Device reconnection handling.
- [x] Backend production build.
- [x] Frontend production build.

---

**Project:** Digital Signage Control Panel  
**Purpose:** Technical Assignment  
**Company:** PT MJ Solution Indonesia