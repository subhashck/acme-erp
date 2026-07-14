# Deployment Guide: Windows Deployment with Docker

This guide details how to bundle, copy, and run the ACME ERP application on another Windows machine using **Docker** and **Docker Compose**.

---

## 📋 Prerequisites

Ensure the target Windows machine has the following installed:
1. **Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop/).
   - During installation, ensure the **Use WSL 2 instead of Hyper-V (recommended)** option is checked.
2. **WSL 2 (Windows Subsystem for Linux)**: Usually installed automatically by Docker Desktop, but you can enable it manually by running `wsl --install` in PowerShell as Admin.

---

## 📦 Step 1: Package and Transfer the Code

Since we build inside Docker, you don't need Node.js, `pnpm`, or PostgreSQL installed on the host machine. You only need to copy the project files.

1. **Clean temporary files** (optional, reduces copy time):
   Delete `node_modules` and `dist` directories if they exist on your development machine.
2. **Compress the folder**:
   Create a `.zip` archive of the project root directory (`acme-erp/`).
   > [!NOTE]
   > Make sure the hidden files `.dockerignore`, `Dockerfile`, and `docker-compose.yml` are included in the archive.
3. **Transfer the archive**:
   Copy the `.zip` file to the target Windows machine (via USB, Shared Folder, or Git repository).
4. **Extract**:
   Extract the archive to a folder on the target machine (e.g., `C:\deploy\acme-erp`).

---

## 🚀 Step 2: Deploy and Start Services

On the target Windows machine:

1. Open **PowerShell** or **Command Prompt** as Administrator.
2. Navigate to the extracted project directory:
   ```powershell
   cd C:\deploy\acme-erp
   ```
3. Run the Docker Compose build and start command:
   ```powershell
   docker compose up -d --build
   ```
   *This command will:*
   - Download the official PostgreSQL 16 image.
   - Build a lightweight Alpine Linux image containing your Node app.
   - Compile the React frontend and bundle assets into `dist/`.
   - Automatically apply database tables and schemas via `pnpm db:push`.
   - Start the containers in the background (`-d`).

4. Verify that the containers are running:
   ```powershell
   docker compose ps
   ```

---

## 🌱 Step 3: Seed the Database (First-Time Setup Only)

Because the database starts completely blank, you must seed it with the default admin user and initial datasets:

1. In the same PowerShell terminal, run:
   ```powershell
   docker compose exec web pnpm db:seed
   ```
   > [!WARNING]
   > The seed script runs `clearDatabase()` before writing seed data. Only run this on your **first deployment** or if you want to completely wipe and reset the database to sample values.

2. Once complete, you will see:
   ```text
   Seed complete. Admin login: admin@acmehospital.local / Admin@12345
   Employee logins use password: Staff@12345
   ```

---

## 🌐 Step 4: Access the Application

- **Local Access**: Open a browser on the target machine and go to:
  `http://localhost:8787`
- **Network Access**: To access the app from other devices on the same local network:
  1. Find the target machine's local IP address using `ipconfig` (e.g., `192.168.1.50`).
  2. Update the `BETTER_AUTH_URL` env variable in `docker-compose.yml` to:
     `BETTER_AUTH_URL: http://192.168.1.50:8787`
  3. Run `docker compose up -d` to apply the update.
  4. Access it from other devices on the network at `http://192.168.1.50:8787`.

---

## 🛠️ Maintenance Commands

| Action | Command |
|---|---|
| View real-time logs | `docker compose logs -f` |
| View web service logs specifically | `docker compose logs -f web` |
| Stop application | `docker compose down` |
| Restart application | `docker compose restart` |
| Wipe DB volume & restart fresh | `docker compose down -v && docker compose up -d` |
