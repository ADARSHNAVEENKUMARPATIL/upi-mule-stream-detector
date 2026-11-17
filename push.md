# Step-by-Step Guide: Pushing Your Project to GitHub

This guide walks you through publishing the **Real-Time UPI & Mule Account Stream Detector** repository to GitHub from scratch.

---

## Prerequisites

1. **Git Installed:** Verify Git is installed on your computer by running in PowerShell:
   ```powershell
   git --version
   ```
   *(If not installed, download and install from [git-scm.com](https://git-scm.com/)).*
2. **GitHub Account:** Ensure you are logged into [GitHub](https://github.com).

---

## Step 1: Create a New Empty Repository on GitHub

1. Go to [https://github.com/new](https://github.com/new).
2. **Repository name:** e.g., `upi-mule-stream-detector` or `realtime-upi-fraud-detector`.
3. **Description (optional):** *Real-Time UPI Mule Account Stream Detector using Kafka KRaft, Apache Flink 1.18, ClickHouse OLAP, FastAPI, and React 18.*
4. **Visibility:** Choose **Public** or **Private**.
5. **IMPORTANT (Do NOT initialize with anything):**
   - ❌ Leave **"Add a README file"** **UNCHECKED**.
   - ❌ Leave **"Add .gitignore"** **UNCHECKED** (we already have a custom one configured).
   - ❌ Leave **"Choose a license"** set to **None**.
6. Click **"Create repository"**.
7. Copy your repository's HTTPS URL (e.g., `https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git`).

---

## Step 2: Initialize Git in Your Project Directory

Open **PowerShell** in `D:\Mini`:

```powershell
cd D:\Mini
git init -b main
```

---

## Step 3: Configure Git User (If Not Already Done)

If this is your first time using Git on this machine, set your name and email:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"
```

---

## Step 4: Stage and Commit Your Code

A custom [.gitignore](.gitignore) has already been created to ignore heavy folders like `frontend/node_modules/` and `flink-job/target/`.

1. Review what will be committed:
   ```powershell
   git status
   ```
2. Stage all project files:
   ```powershell
   git add .
   ```
3. Commit with a descriptive message:
   ```powershell
   git commit -m "Initial commit: Real-Time UPI & Mule Account Stream Detector with Flink, Kafka, ClickHouse, FastAPI and React"
   ```

---

## Step 5: Link Local Repo to GitHub

Add your GitHub repository as the remote `origin` (replace the URL with your actual GitHub URL from Step 1):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

To verify the remote URL:
```powershell
git remote -v
```

---

## Step 6: Push Code to GitHub

Push your `main` branch to GitHub:

```powershell
git push -u origin main
```

> **Authentication Note:** If prompted by Windows Git Credential Manager, select **"Sign in with your browser"** and authorize Git to push to your GitHub account.

---

## Quick Reference: Future Updates

Whenever you make new changes in the future, push them to GitHub with these 3 quick commands:

```powershell
git add .
git commit -m "Update dashboard UI and simulator logic"
git push
```

---

## Troubleshooting Common Issues

### 1. `fatal: remote origin already exists`
If you made a typo in the remote URL, remove it and re-add:
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

### 2. Large File Warnings
The dataset `producer/Merged_corrected_final.csv` is ~37 MB. GitHub allows files up to 100 MB directly via standard `git push`. If you ever use a dataset over 100 MB, use Git LFS:
```powershell
git lfs install
git lfs track "*.csv"
git add .gitattributes
```

### 3. Permission Denied / Personal Access Token
If the browser popup doesn't appear and terminal asks for a password, generate a GitHub Personal Access Token:
1. Go to **GitHub Settings** $\to$ **Developer Settings** $\to$ **Personal Access Tokens (Tokens classic)**.
2. Generate new token with `repo` scope.
3. Paste the token as your password in the terminal.
