# 💼 WorkSphere - Verified Corporate & Tech Job Portal

A production-grade tech and corporate careers portal powered by a **JavaScript Frontend**, **SQLite Database Engine**, **PBKDF2-SHA256 Encrypted Authentication**, and **Real Multinational Corporate Job Openings**.

---

## 🚀 Live Demo & Repository
- **Live Web Application:** [https://worksphere-job-portal.onrender.com](https://worksphere-job-portal.onrender.com)
- **GitHub Repository:** [https://github.com/Object2005/worksphere-job-portal](https://github.com/Object2005/worksphere-job-portal)

---

## 🌟 Core Features

### 1. 🔐 Cryptographic Authentication
- **PBKDF2-SHA256 Password Encryption**: Passwords are never stored in plain text. Every account password is protected with 20,000 salt iterations.
- **HMAC-SHA256 Signed Stateless Sessions**: Sessions persist reliably across server restarts with 30-day cryptographic validity.
- **Self-Service Registration**: Candidates can create their own accounts or log in securely.

### 2. 🪪 Candidate Identity Verification (Anti-Fraud)
- Government ID verification (Aadhaar Card, PAN Card, Passport, Driver's License) with one-time verification codes.
- Verified candidates receive a green **"ID Verified ✓"** badge that boosts application visibility with global hiring managers.

### 3. 🏢 Real Multinational Corporate Directory
- Verified, active corporate openings directly linked to official career channels:
  - **Google**: Senior Software Engineer - Generative AI & Cloud Core (₹45 - 65 LPA)
  - **Microsoft**: Senior Full Stack Engineer - Azure Cloud (₹35 - 50 LPA)
  - **Amazon**: SDE II - AWS Global Payments (₹40 - 55 LPA)
  - **Meta**: Staff Product Designer - Instagram Reels ($160k - $195k)
  - **Apple**: iOS Platform Software Engineer - CoreOS (₹38 - 52 LPA)
  - **NVIDIA**: Senior AI Architecture Engineer - CUDA & TensorRT ($190k - $240k)
  - **Netflix**: Senior SRE - Cloud Media Infrastructure ($220k - $275k)
  - **Spotify**: Senior Data Scientist - Algorithmic Discovery (£85k - £115k)
  - **Uber**: Staff Backend Engineer - Mobility Dispatch (₹50 - 70 LPA)
  - **Stripe**: Staff Infrastructure Engineer ($180k - $230k)
  - **Razorpay, Swiggy, Zomato, Adobe, TCS, Infosys**, and more.

### 4. 🗄️ SQLite Database Architecture
- Persistent relational database schema:
  - `users`: Registered candidate credentials, cryptographic salts, and verified identity documents.
  - `sessions`: Active tokens with timestamp tracking.
  - `jobs`: Full corporate catalog with responsibilities, requirements, salaries, and SVGs.
  - `applications`: Real-time candidate job submissions and attached resumes.
  - `saved_jobs`: Candidate bookmarked positions.

### 5. 🛡️ Live Admin Database Inspector
- Integrated administrative inspector allows authorized managers to review real-time registered users, candidate emails, verification statuses, and application pipelines directly from the UI.

---

## 🛠️ Tech Stack
- **Frontend / Client:** JavaScript (ES6+), Tailwind CSS, Lucide Icons
- **Backend & REST API:** Microservice REST Engine
- **Database:** SQLite3 Engine (`portal.sqlite3`)
- **Deployment:** Docker, Render Cloud

---

## 💻 Quick Start & Local Execution

### 1. Clone the Repository
```bash
git clone https://github.com/Object2005/worksphere-job-portal.git
cd worksphere-job-portal
```

### 2. Run Automated Test Suite
```bash
ruby test_suite.rb
```
*(Executes all automated tests for database integrity, PBKDF2 cryptography, registration, candidate verification, and applications.)*

### 3. Start Local Production Server
```bash
ruby server.rb
```
Open in browser:
👉 **http://localhost:8080**

---

## 📄 License
This project is open-source under the MIT License.
