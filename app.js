/**
 * WorkSphere Job Portal - Production Client connected to SQLite REST API
 */

let authToken = localStorage.getItem("worksphere_token") || null;
let currentUser = null;
let cachedJobs = [];
let cachedApplications = [];
let cachedSaved = [];
let activeTab = 'jobs';
let activeApplyingJobId = null;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initClient();
});

async function initClient() {
  renderRealCompanyFilterPills();

  if (authToken) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        currentUser = data.user;
        unlockApp();
      } else {
        authToken = null;
        currentUser = null;
        localStorage.removeItem("worksphere_token");
        showAuthGateway();
      }
    } catch (e) {
      authToken = null;
      currentUser = null;
      localStorage.removeItem("worksphere_token");
      showAuthGateway();
    }
  } else {
    showAuthGateway();
  }

  lucide.createIcons();
}

// ==============================================
// 1. AUTHENTICATION & SESSION MANAGEMENT
// ==============================================
function showAuthGateway() {
  document.getElementById("authGateway").classList.remove("hidden");
  document.getElementById("mainApp").classList.add("hidden");
}

function unlockApp() {
  document.getElementById("authGateway").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");

  // Update nav profile
  document.getElementById("userNameNav").innerText = currentUser.full_name || currentUser.email;
  document.getElementById("userAvatar").innerText = (currentUser.full_name || currentUser.email).charAt(0).toUpperCase();

  // ID Verification Badge
  renderIdBadge();

  // Load live data from SQLite API
  loadJobsFromApi();
  loadApplicationsFromApi();
  loadSavedJobsFromApi();
  lucide.createIcons();
}

function renderIdBadge() {
  const badgeContainer = document.getElementById("userIdBadge");
  const warnBanner = document.getElementById("unverifiedWarningBanner");

  if (currentUser.is_verified === 1 || currentUser.id_status === 'Verified') {
    badgeContainer.innerHTML = `
      <span class="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
        <i data-lucide="check-circle-2" class="w-3 h-3"></i> ID Verified
      </span>
    `;
    warnBanner.classList.add("hidden");
  } else {
    badgeContainer.innerHTML = `
      <span class="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 hover:bg-amber-200 transition-colors">
        <i data-lucide="alert-circle" class="w-3 h-3"></i> Verify ID
      </span>
    `;
    warnBanner.classList.remove("hidden");
  }

  // Update hint OTP in modal
  const hintElem = document.getElementById("hintOtp");
  if (hintElem && currentUser.verification_code) {
    hintElem.innerText = currentUser.verification_code;
  }
}

function switchAuthMode(mode) {
  const tabLogin = document.getElementById("authTabLogin");
  const tabRegister = document.getElementById("authTabRegister");
  const formLogin = document.getElementById("loginForm");
  const formRegister = document.getElementById("registerForm");

  if (mode === 'login') {
    tabLogin.className = "flex-1 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-white shadow-sm transition-all";
    tabRegister.className = "flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-all";
    formLogin.classList.remove("hidden");
    formRegister.classList.add("hidden");
  } else {
    tabRegister.className = "flex-1 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-white shadow-sm transition-all";
    tabLogin.className = "flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-all";
    formRegister.classList.remove("hidden");
    formLogin.classList.add("hidden");
  }
  lucide.createIcons();
}

function fillDemoCredentials(email, pass) {
  switchAuthMode('login');
  document.getElementById("loginEmail").value = email;
  document.getElementById("loginPassword").value = pass;
  showToast(`Credentials filled for ${email}. Click Sign In!`, "info");
}

function togglePassVisibility(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn = document.getElementById("loginSubmitBtn");

  btn.disabled = true;
  btn.innerText = "Authenticating with SQLite...";

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem("worksphere_token", authToken);
      unlockApp();
      showToast(`Welcome back, ${currentUser.full_name}!`, "success");
    } else {
      showToast(data.error || "Login failed", "warning");
    }
  } catch (err) {
    showToast("Server connection error", "warning");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Sign In with Email & Password</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
    lucide.createIcons();
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const full_name = document.getElementById("regFullName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const phone = document.getElementById("regPhone").value.trim();
  const id_document_type = document.getElementById("regDocType").value;
  const id_document_number = document.getElementById("regDocNumber").value.trim();
  const btn = document.getElementById("regSubmitBtn");

  btn.disabled = true;
  btn.innerText = "Creating Account in SQLite...";

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password, phone, id_document_type, id_document_number })
    });
    const data = await res.json();

    if (data.success) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem("worksphere_token", authToken);
      unlockApp();
      showToast("Account created & secured in SQLite!", "success");
    } else {
      showToast(data.error || "Registration failed", "warning");
    }
  } catch (err) {
    showToast("Server connection error", "warning");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Create Account & Verify</span><i data-lucide="check" class="w-4 h-4"></i>`;
    lucide.createIcons();
  }
}

async function handleLogout() {
  if (confirm("Logout karna chahte hain?")) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } catch (e) {}

    authToken = null;
    currentUser = null;
    localStorage.removeItem("worksphere_token");
    showAuthGateway();
    showToast("Logged out successfully.", "info");
    lucide.createIcons();
  }
}

// ==============================================
// 2. CANDIDATE ID VERIFICATION
// ==============================================
function openVerifyIdModal() {
  if (currentUser) {
    document.getElementById("modalDocType").value = currentUser.id_document_type || "Aadhaar Card";
    document.getElementById("modalDocNumber").value = currentUser.id_document_number || "";
    document.getElementById("hintOtp").innerText = currentUser.verification_code || "5829";
  }
  document.getElementById("verifyIdModal").classList.remove("hidden");
  lucide.createIcons();
}

function closeVerifyIdModal() {
  document.getElementById("verifyIdModal").classList.add("hidden");
}

function autoFillMyOtp() {
  if (currentUser && currentUser.verification_code) {
    document.getElementById("modalVerifyCode").value = currentUser.verification_code;
  }
}

async function handleIdVerifySubmit(e) {
  e.preventDefault();
  const id_document_type = document.getElementById("modalDocType").value;
  const id_document_number = document.getElementById("modalDocNumber").value.trim();
  const verification_code = document.getElementById("modalVerifyCode").value.trim();

  try {
    const res = await fetch('/api/auth/verify-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ id_document_type, id_document_number, verification_code })
    });
    const data = await res.json();

    if (data.success) {
      currentUser = data.user;
      closeVerifyIdModal();
      renderIdBadge();
      loadJobsFromApi();
      loadApplicationsFromApi();
      showToast("Candidate ID Verified Successfully in SQLite!", "success");
    } else {
      showToast(data.error || "ID Verification failed", "warning");
    }
  } catch (err) {
    showToast("Server connection error", "warning");
  }
}

// ==============================================
// 3. REAL JOBS DIRECTORY (SQLITE BACKEND)
// ==============================================
function renderRealCompanyFilterPills() {
  const container = document.getElementById("companyPills");
  const companies = [
    "ALL", "Google", "Microsoft", "Amazon", "Apple", "Meta", "NVIDIA", "Netflix", 
    "Spotify", "Uber", "Stripe", "Airbnb", "Salesforce", "Tesla", "Swiggy", 
    "Razorpay", "Zomato", "Flipkart", "Adobe", "Tata Consultancy Services (TCS)", "CRED", "Goldman Sachs", "PhonePe"
  ];
  
  container.innerHTML = companies.map(c => `
    <button 
      onclick="filterCompanyPill('${c}')"
      class="company-pill text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${c === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
      data-comp="${c}"
    >
      ${c === 'Tata Consultancy Services (TCS)' ? 'TCS' : c}
    </button>
  `).join("");
}

let activeCompanyFilter = "ALL";

function filterCompanyPill(comp) {
  activeCompanyFilter = comp;
  document.querySelectorAll(".company-pill").forEach(p => {
    if (p.getAttribute("data-comp") === comp) {
      p.className = "company-pill text-[10px] font-bold px-2 py-1 rounded-lg transition-all bg-indigo-600 text-white shadow-sm";
    } else {
      p.className = "company-pill text-[10px] font-bold px-2 py-1 rounded-lg transition-all bg-slate-100 text-slate-700 hover:bg-slate-200";
    }
  });
  loadJobsFromApi();
}

function triggerSearch() {
  loadJobsFromApi();
}

function resetFilters() {
  document.getElementById("searchKeyword").value = "";
  document.getElementById("filterLocation").value = "ALL";
  document.querySelector('input[name="catFilter"][value="ALL"]').checked = true;
  document.querySelector('input[name="modeFilter"][value="ALL"]').checked = true;
  filterCompanyPill("ALL");
  document.getElementById("sortSelector").value = "newest";
  loadJobsFromApi();
}

async function loadJobsFromApi() {
  const keyword = (document.getElementById("searchKeyword") ? document.getElementById("searchKeyword").value : '').trim();
  const location = document.getElementById("filterLocation") ? document.getElementById("filterLocation").value : 'ALL';
  const catRadio = document.querySelector('input[name="catFilter"]:checked');
  const category = catRadio ? catRadio.value : 'ALL';
  const modeRadio = document.querySelector('input[name="modeFilter"]:checked');
  const mode = modeRadio ? modeRadio.value : 'ALL';
  const sort = document.getElementById("sortSelector") ? document.getElementById("sortSelector").value : 'newest';

  const queryParams = new URLSearchParams({
    q: keyword,
    category: category,
    work_mode: mode,
    company: activeCompanyFilter,
    sort: sort
  });

  try {
    const res = await fetch(`/api/jobs?${queryParams.toString()}`);
    const data = await res.json();
    if (data.success) {
      cachedJobs = data.jobs;
      document.getElementById("liveJobsCountHeader").innerText = cachedJobs.length;
      document.getElementById("jobsResultCount").innerText = `Showing ${cachedJobs.length} Real Verified Positions (from SQLite)`;
      renderJobsFeed();
    }
  } catch (err) {
    document.getElementById("jobsResultCount").innerText = "Unable to fetch jobs from database";
  }
}

function renderJobsFeed() {
  const container = document.getElementById("jobsFeed");
  if (!container) return;

  if (cachedJobs.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-10 rounded-3xl border border-slate-200 text-center">
        <i data-lucide="search-x" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
        <h4 class="text-sm font-bold text-slate-700">Koi Job Opening Nahi Mili</h4>
        <p class="text-xs text-slate-400 mt-1">Filters reset karein ya doosra search term try karein.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = cachedJobs.map(job => {
    const hasApplied = cachedApplications.some(app => app.job_id === job.id);
    const isSaved = cachedSaved.some(s => s.id === job.id);

    return `
      <div class="job-card bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm relative transition-all space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          
          <div class="flex items-start gap-3.5 flex-1">
            <div class="w-12 h-12 rounded-2xl ${job.logo_bg} flex items-center justify-center font-black text-lg shrink-0 border shadow-xs overflow-hidden">
              ${job.logo_svg ? job.logo_svg : job.initials}
            </div>
            
            <div class="space-y-1 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-black text-slate-800 tracking-tight flex items-center gap-1">
                  ${job.company}
                  <span class="inline-flex items-center text-[9px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full border border-emerald-300" title="Verified Real Corporate Employer">
                    Verified Employer ✓
                  </span>
                </span>
                <span class="text-slate-300">•</span>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${job.work_mode === 'Remote' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                  ${job.work_mode}
                </span>
                <span class="text-[11px] text-slate-400 font-medium">${job.job_type}</span>
                <a href="${job.official_url}" target="_blank" class="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 font-bold">
                  Official Career Portal <i data-lucide="external-link" class="w-2.5 h-2.5"></i>
                </a>
              </div>

              <h4 class="text-base font-extrabold text-slate-900 hover:text-indigo-600 transition-colors">
                ${job.title}
              </h4>

              <div class="flex flex-wrap items-center gap-3 text-xs pt-0.5">
                <span class="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ${job.salary}
                </span>
                <span class="text-slate-500 flex items-center gap-1">
                  <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i> ${job.location}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center sm:flex-col justify-end gap-2 shrink-0">
            <button onclick="toggleSaveJobInApi(${job.id})" class="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-all ${isSaved ? '!text-amber-500 bg-amber-50' : ''}" title="Save Job">
              <i data-lucide="bookmark" class="w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}"></i>
            </button>

            ${hasApplied ? `
              <span class="px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1">
                <i data-lucide="check" class="w-3.5 h-3.5"></i> Applied
              </span>
            ` : `
              <button onclick="openApplyModalForJob(${job.id})" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                <span>Apply Now</span>
                <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
              </button>
            `}
          </div>

        </div>

        <p class="text-xs text-slate-500 leading-relaxed">${job.description}</p>

        <!-- Skills Tags -->
        <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap gap-1.5">
            ${job.skills.map(s => `<span class="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">${s}</span>`).join("")}
          </div>
          <span class="text-[11px] text-slate-400 font-medium">Full benefits & stock included</span>
        </div>

      </div>
    `;
  }).join("");

  lucide.createIcons();
}

// ==============================================
// 4. APPLY FOR JOB (PERSISTED IN SQLITE)
// ==============================================
function openApplyModalForJob(jobId) {
  if (!authToken || !currentUser) {
    showToast("Application submit karne ke liye pehle Login karein.", "warning");
    showAuthGateway();
    return;
  }

  const job = cachedJobs.find(j => j.id === jobId);
  if (!job) return;

  activeApplyingJobId = jobId;
  document.getElementById("applyModalTitle").innerText = job.title;
  document.getElementById("applyModalCompany").innerText = `${job.company} • ${job.location}`;
  document.getElementById("applyModalInitials").innerText = job.initials;
  
  if (currentUser) {
    document.getElementById("applyApplicantEmail").innerText = currentUser.email;
    document.getElementById("applyName").value = currentUser.full_name || "";
    document.getElementById("applyPhone").value = currentUser.phone || "";

    const ind = document.getElementById("applyIdVerifiedIndicator");
    if (currentUser.is_verified === 1) {
      ind.className = "text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]";
      ind.innerText = "Candidate ID Verified ✓";
    } else {
      ind.className = "text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full text-[10px]";
      ind.innerText = "ID Unverified (Click to Verify)";
      ind.onclick = openVerifyIdModal;
    }
  }

  document.getElementById("applyModal").classList.remove("hidden");
  lucide.createIcons();
}

function closeApplyModal() {
  document.getElementById("applyModal").classList.add("hidden");
  activeApplyingJobId = null;
}

async function handleApplySubmit(e) {
  e.preventDefault();
  if (!activeApplyingJobId) return;

  if (!authToken) {
    showToast("Application submit karne ke liye pehle login karein.", "warning");
    showAuthGateway();
    return;
  }

  const candidate_name = document.getElementById("applyName").value.trim();
  const candidate_phone = document.getElementById("applyPhone").value.trim();
  const experience = document.getElementById("applyExp").value;
  const portfolio_url = document.getElementById("applyPortfolio").value.trim();
  const cover_note = document.getElementById("applyCoverNote").value.trim();
  const fileInput = document.getElementById("applyResumeFile");
  const resume_filename = fileInput.files[0] ? fileInput.files[0].name : "Resume.pdf";
  const btn = document.getElementById("applySubmitBtn");

  btn.disabled = true;
  btn.innerText = "Submitting to SQLite Database...";

  try {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        job_id: activeApplyingJobId,
        candidate_name,
        candidate_phone,
        experience,
        portfolio_url,
        cover_note,
        resume_filename
      })
    });
    const data = await res.json();

    if (res.status === 401 || (data.error && data.error.includes("login"))) {
      showToast("Aapka login session expire ho gaya tha. Kripya ek baar Sign In karein.", "warning");
      authToken = null;
      currentUser = null;
      localStorage.removeItem("worksphere_token");
      closeApplyModal();
      showAuthGateway();
      return;
    }

    if (data.success) {
      closeApplyModal();
      showToast(`Application ${data.application.id} submitted successfully to ${data.application.company}!`, "success");
      loadApplicationsFromApi();
      loadJobsFromApi();
    } else {
      showToast(data.error || "Submission failed", "warning");
    }
  } catch (err) {
    showToast("Server connection error: " + err.message, "warning");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Submit Application to SQLite</span><i data-lucide="send" class="w-4 h-4"></i>`;
    lucide.createIcons();
  }
}

// ==============================================
// 5. APPLICATIONS & SAVED JOBS (FROM SQLITE)
// ==============================================
async function loadApplicationsFromApi() {
  if (!authToken) return;
  try {
    const res = await fetch('/api/applications', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      cachedApplications = data.applications;
      const badge = document.getElementById("badgeAppliedCount");
      if (cachedApplications.length > 0) {
        badge.innerText = cachedApplications.length;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
      renderApplicationsFeed();
    }
  } catch (e) {}
}

function renderApplicationsFeed() {
  const container = document.getElementById("applicationsFeed");
  if (!container) return;

  if (cachedApplications.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-10 rounded-3xl border border-slate-200 text-center">
        <i data-lucide="send" class="w-10 h-10 text-indigo-400 mx-auto mb-2"></i>
        <h4 class="text-sm font-bold text-slate-800">Abhi Tak Koi Job Apply Nahi Ki</h4>
        <p class="text-xs text-slate-500 mt-1">Openings tab me jayein aur apni pasand ki company me 'Apply Now' click karein.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = cachedApplications.map(app => `
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-black text-indigo-600 uppercase tracking-wider">${app.company}</span>
            <span class="text-slate-300">•</span>
            <span class="font-mono text-xs font-bold text-slate-600">${app.id}</span>
            ${app.id_verified_badge === 1 ? '<span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full">ID Verified ✓</span>' : ''}
          </div>
          <h4 class="text-base font-extrabold text-slate-900 mt-0.5">${app.title}</h4>
          <p class="text-[11px] text-slate-400 mt-0.5">Location: ${app.location} • Applied: ${app.created_at.substring(0, 10)}</p>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl">
            ● Status: ${app.status}
          </span>
          <button onclick="withdrawApplicationInApi('${app.id}')" class="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors">
            Withdraw
          </button>
        </div>
      </div>

      <!-- Pipeline Tracker -->
      <div class="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
        <div class="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">1. Submitted ✓</div>
        <div class="p-2 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200">2. Under Review...</div>
        <div class="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-200">3. Shortlist</div>
        <div class="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-200">4. Final Offer</div>
      </div>
    </div>
  `).join("");

  lucide.createIcons();
}

async function withdrawApplicationInApi(appId) {
  if (confirm("Kya aap sach me yeh application withdraw karna chahte hain?")) {
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast("Application withdrawn successfully from SQLite.", "info");
        loadApplicationsFromApi();
        loadJobsFromApi();
      }
    } catch (e) {}
  }
}

async function loadSavedJobsFromApi() {
  if (!authToken) return;
  try {
    const res = await fetch('/api/saved-jobs', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      cachedSaved = data.jobs;
      const badge = document.getElementById("badgeSavedCount");
      if (cachedSaved.length > 0) {
        badge.innerText = cachedSaved.length;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
      renderSavedFeed();
    }
  } catch (e) {}
}

function renderSavedFeed() {
  const container = document.getElementById("savedJobsFeed");
  if (!container) return;

  if (cachedSaved.length === 0) {
    container.innerHTML = `
      <div class="col-span-2 bg-white p-10 rounded-3xl border border-slate-200 text-center">
        <i data-lucide="bookmark" class="w-10 h-10 text-amber-400 mx-auto mb-2"></i>
        <h4 class="text-sm font-bold text-slate-800">Koi Saved Job Nahi Hai</h4>
        <p class="text-xs text-slate-500 mt-1">Jobs par bookmark button click karke aap jobs save kar sakte hain.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = cachedSaved.map(job => `
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div class="flex items-start justify-between">
          <span class="text-xs font-black text-indigo-600 uppercase">${job.company}</span>
          <button onclick="toggleSaveJobInApi(${job.id})" class="text-amber-500 hover:text-slate-400 p-1">
            <i data-lucide="bookmark" class="w-4 h-4 fill-amber-500"></i>
          </button>
        </div>
        <h4 class="text-base font-bold text-slate-900 mt-1">${job.title}</h4>
        <p class="text-xs text-slate-500 mt-1 line-clamp-2">${job.description}</p>
        <span class="inline-block mt-2 font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
          ${job.salary} • ${job.location}
        </span>
      </div>

      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
        <button onclick="openApplyModalForJob(${job.id})" class="px-3.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl">
          Apply Now
        </button>
      </div>
    </div>
  `).join("");

  lucide.createIcons();
}

async function toggleSaveJobInApi(jobId) {
  if (!authToken) {
    showToast("Please login first to bookmark jobs", "warning");
    return;
  }
  try {
    const res = await fetch(`/api/jobs/${jobId}/save`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "info");
      loadSavedJobsFromApi();
      loadJobsFromApi();
    }
  } catch (e) {}
}

// ==============================================
// 6. NAVIGATION TABS
// ==============================================
function switchTab(tab) {
  activeTab = tab;

  document.querySelectorAll(".nav-btn").forEach(b => {
    b.className = "nav-btn px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center gap-2";
  });

  const activeBtn = document.getElementById(`nav-${tab}`);
  if (activeBtn) {
    activeBtn.className = "nav-btn active px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 transition-all flex items-center gap-2";
  }

  ['jobs', 'applications', 'saved'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.add("hidden");
  });

  const target = document.getElementById(`tab-${tab}`);
  if (target) target.classList.remove("hidden");

  if (tab === 'jobs') loadJobsFromApi();
  if (tab === 'applications') loadApplicationsFromApi();
  if (tab === 'saved') loadSavedJobsFromApi();

  window.scrollTo({ top: 0, behavior: 'smooth' });
  lucide.createIcons();
}

// ==============================================
// 7. TOAST NOTIFICATIONS
// ==============================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastBox");
  const toast = document.createElement("div");

  let bgClass = "bg-slate-900 text-white";
  if (type === "success") bgClass = "bg-emerald-600 text-white";
  if (type === "warning") bgClass = "bg-amber-600 text-white";

  toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold ${bgClass} transition-all duration-300 transform translate-y-3 opacity-0`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => { toast.classList.remove("translate-y-3", "opacity-0"); }, 10);
  setTimeout(() => {
    toast.classList.add("translate-y-3", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==============================================
// 8. ADMIN SQLITE DATABASE VIEWER
// ==============================================
function openAdminModal() {
  const modal = document.getElementById("adminModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  fetchAdminData();
  lucide.createIcons();
}

function closeAdminModal() {
  const modal = document.getElementById("adminModal");
  if (modal) modal.classList.add("hidden");
}

function switchAdminTab(tab) {
  const usersTab = document.getElementById("adminViewUsers");
  const appsTab = document.getElementById("adminViewApps");
  const btnUsers = document.getElementById("adminTabBtnUsers");
  const btnApps = document.getElementById("adminTabBtnApps");

  if (tab === 'users') {
    if (usersTab) usersTab.classList.remove("hidden");
    if (appsTab) appsTab.classList.add("hidden");
    if (btnUsers) btnUsers.className = "pb-3 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 transition-all flex items-center gap-2";
    if (btnApps) btnApps.className = "pb-3 px-4 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all flex items-center gap-2";
  } else {
    if (usersTab) usersTab.classList.add("hidden");
    if (appsTab) appsTab.classList.remove("hidden");
    if (btnUsers) btnUsers.className = "pb-3 px-4 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all flex items-center gap-2";
    if (btnApps) btnApps.className = "pb-3 px-4 text-xs font-bold text-indigo-600 border-b-2 border-indigo-600 transition-all flex items-center gap-2";
  }
  lucide.createIcons();
}

async function fetchAdminData() {
  try {
    const res = await fetch("/api/admin/overview");
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || "Failed to load admin data", "warning");
      return;
    }

    // Update KPIs
    if (document.getElementById("adminKpiUsers")) document.getElementById("adminKpiUsers").innerText = data.stats.total_users;
    if (document.getElementById("adminKpiApps")) document.getElementById("adminKpiApps").innerText = data.stats.total_applications;
    if (document.getElementById("adminKpiVerified")) document.getElementById("adminKpiVerified").innerText = data.stats.verified_users;
    if (document.getElementById("adminTabUsersBadge")) document.getElementById("adminTabUsersBadge").innerText = data.stats.total_users;
    if (document.getElementById("adminTabAppsBadge")) document.getElementById("adminTabAppsBadge").innerText = data.stats.total_applications;

    // Render Users Table
    const usersBody = document.getElementById("adminUsersTableBody");
    if (usersBody) {
      if (data.users.length === 0) {
        usersBody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400">No users registered yet</td></tr>`;
      } else {
        usersBody.innerHTML = data.users.map(u => {
          const verifiedBadge = u.is_verified === 1 
            ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800"><i data-lucide="check-circle" class="w-3 h-3"></i> Verified (${escapeHtml(u.id_document_type)})</span>`
            : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800"><i data-lucide="clock" class="w-3 h-3"></i> Pending</span>`;
          
          const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';

          return `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="py-3 px-3 font-mono font-bold text-slate-500">#${u.id}</td>
              <td class="py-3 px-3 font-bold text-slate-900">${escapeHtml(u.full_name || 'N/A')}</td>
              <td class="py-3 px-3 font-semibold text-indigo-700 bg-indigo-50/50 rounded">${escapeHtml(u.email)}</td>
              <td class="py-3 px-3 text-slate-600">${escapeHtml(u.phone || 'N/A')}</td>
              <td class="py-3 px-3">${verifiedBadge}</td>
              <td class="py-3 px-3 text-slate-500 text-[11px]">${regDate}</td>
            </tr>
          `;
        }).join("");
      }
    }

    // Render Applications Table
    const appsBody = document.getElementById("adminAppsTableBody");
    if (appsBody) {
      if (data.applications.length === 0) {
        appsBody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400">No applications received yet</td></tr>`;
      } else {
        appsBody.innerHTML = data.applications.map(a => {
          const appDate = a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A';
          return `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="py-3 px-3 font-bold text-slate-900">${escapeHtml(a.candidate_name)}</td>
              <td class="py-3 px-3 font-semibold text-indigo-700">${escapeHtml(a.candidate_email)}</td>
              <td class="py-3 px-3 font-bold text-slate-800">${escapeHtml(a.company)}</td>
              <td class="py-3 px-3 text-slate-600">${escapeHtml(a.title)}</td>
              <td class="py-3 px-3 font-mono text-slate-500 text-[11px]">${escapeHtml(a.resume_filename)}</td>
              <td class="py-3 px-3 text-slate-500 text-[11px]">${appDate}</td>
            </tr>
          `;
        }).join("");
      }
    }

    lucide.createIcons();
  } catch (err) {
    console.error("Admin fetch error:", err);
    showToast("Error connecting to SQLite Admin API", "warning");
  }
}
