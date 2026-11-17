/**
 * Naukri.com Clone - Production Client connected to SQLite REST API
 */

let authToken = localStorage.getItem("naukri_auth_token") || localStorage.getItem("worksphere_token") || null;
let currentUser = null;
let cachedJobs = [];
let cachedApplications = [];
let cachedSaved = [];
let activeApplyingJobId = null;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initClient();
});

async function initClient() {
  await loadJobsFromApi();

  if (authToken) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        currentUser = data.user;
        updateNavState(true);
        loadApplicationsFromApi();
      } else {
        authToken = null;
        currentUser = null;
        localStorage.removeItem("naukri_auth_token");
        localStorage.removeItem("worksphere_token");
        updateNavState(false);
      }
    } catch (e) {
      authToken = null;
      currentUser = null;
      updateNavState(false);
    }
  } else {
    updateNavState(false);
  }

  lucide.createIcons();
}

function updateNavState(isLoggedIn) {
  const guestControls = document.getElementById("navGuestControls");
  const userControls = document.getElementById("navUserControls");
  const adminNavPill = document.getElementById("adminNavPill");

  if (isLoggedIn && currentUser) {
    if (guestControls) guestControls.classList.add("hidden");
    if (userControls) userControls.classList.remove("hidden");

    const nameElem = document.getElementById("navUserName");
    const avatarElem = document.getElementById("navUserAvatar");
    if (nameElem) nameElem.innerText = currentUser.full_name || currentUser.email;
    if (avatarElem) avatarElem.innerText = (currentUser.full_name || currentUser.email).charAt(0).toUpperCase();

    // Show or highlight admin pill
    if (adminNavPill) {
      if (currentUser.is_admin || (currentUser.email && currentUser.email.includes("admin"))) {
        adminNavPill.classList.remove("hidden");
        adminNavPill.className = "inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-black shadow-md transition-all cursor-pointer";
        adminNavPill.innerHTML = `<i data-lucide="crown" class="w-3.5 h-3.5 text-amber-300"></i> <span class="hidden sm:inline">Admin Console</span>`;
      } else {
        adminNavPill.classList.add("hidden");
      }
    }
  } else {
    if (guestControls) guestControls.classList.remove("hidden");
    if (userControls) userControls.classList.add("hidden");
  }

  lucide.createIcons();
}

// ==============================================
// 1. JOBS DATA & NAUKRI 3-COLUMN RENDERING
// ==============================================
async function loadJobsFromApi() {
  try {
    const res = await fetch('/api/jobs');
    const data = await res.json();
    if (data.success && data.jobs) {
      cachedJobs = data.jobs;
      renderNaukriJobCards(cachedJobs);
    }
  } catch (err) {
    console.error("Jobs load error:", err);
  }
}

function renderNaukriJobCards(jobs) {
  const container = document.getElementById("naukriJobCardsContainer");
  const countElem = document.getElementById("jobFeedCount");
  if (!container) return;

  if (countElem) {
    countElem.innerText = `1 - ${jobs.length} of ${jobs.length}`;
  }

  if (jobs.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-10 text-center border border-slate-200">
        <i data-lucide="search-x" class="w-10 h-10 text-slate-300 mx-auto mb-3"></i>
        <h4 class="text-sm font-bold text-slate-700">No jobs match your filter criteria</h4>
        <p class="text-xs text-slate-400 mt-1">Try resetting your filters or search with another keyword.</p>
        <button onclick="resetAllFilters()" class="mt-4 px-4 py-2 bg-[#275df5] text-white text-xs font-bold rounded-full">Reset Filters</button>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = jobs.map(j => {
    // Star reviews matching Screenshot 2
    const ratingStr = (j.company === 'Starbucks') ? '★ 4.1 | 998 Reviews' : '★ 4.2 | 1,420 Reviews';
    
    // Default logo fallback
    let logoHtml = j.logo_svg;
    if (!logoHtml || logoHtml.length < 10) {
      logoHtml = `<div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-700 text-xs">${j.initials || j.company.slice(0, 2).toUpperCase()}</div>`;
    }

    const postedAge = j.posted_date ? "3+ weeks ago" : "Just now";

    return `
      <div class="naukri-card bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
        
        <!-- Top Row: Title + Company Logo on Right -->
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <h3 onclick="openApplyModalForJob(${j.id})" class="text-[15px] font-bold text-slate-900 hover:text-[#275df5] cursor-pointer transition-colors leading-snug">
              ${escapeHtml(j.title)}
            </h3>
            <div class="flex items-center gap-2 text-xs text-slate-600 font-semibold">
              <span class="text-slate-800 font-bold">${escapeHtml(j.company)}</span>
              <span class="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                ${ratingStr}
              </span>
            </div>
          </div>

          <!-- Official Company Logo on Right (Matching Screenshot 2) -->
          <div class="w-11 h-11 shrink-0 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center p-1.5">
            ${logoHtml}
          </div>
        </div>

        <!-- Experience, Salary & Location Metadata Row -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium mt-3 pb-2.5">
          <span class="flex items-center gap-1 text-slate-700">
            <i data-lucide="briefcase" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>${j.category.includes('Fresher') || j.title.includes('Barista') ? '0-2 Yrs' : '0-3 Yrs'}</span>
          </span>
          <span class="flex items-center gap-1 text-slate-700">
            <i data-lucide="indian-rupee" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>${escapeHtml(j.salary)}</span>
          </span>
          <span class="flex items-center gap-1 text-slate-700">
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>${escapeHtml(j.location)}</span>
          </span>
        </div>

        <!-- Description Snippet (Matching Screenshot 2) -->
        <div class="pt-2 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
          <i data-lucide="file-text" class="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"></i>
          <p class="line-clamp-2">${escapeHtml(j.description)}</p>
        </div>

        <!-- Skills Tags (Matching Screenshot 2) -->
        <div class="flex flex-wrap items-center gap-1.5 mt-3">
          ${(j.skills || []).slice(0, 6).map(s => `
            <span class="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors">
              ${escapeHtml(s)}
            </span>
          `).join("")}
        </div>

        <!-- Card Footer: Posted Age + Save & Apply -->
        <div class="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
          <span class="text-slate-400 text-[11px] font-medium">${postedAge}</span>
          <div class="flex items-center gap-2">
            <button onclick="toggleSaveJobInApi(${j.id})" title="Save Job" class="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold">
              <i data-lucide="bookmark" class="w-3.5 h-3.5"></i>
              <span>Save</span>
            </button>
            <button onclick="openApplyModalForJob(${j.id})" class="px-4 py-1.5 bg-[#275df5] hover:bg-[#185adb] text-white font-bold rounded-full text-xs shadow-xs transition-all cursor-pointer">
              Apply on Naukri
            </button>
          </div>
        </div>

      </div>
    `;
  }).join("");

  lucide.createIcons();
}

// ==============================================
// 2. SEARCH & FILTERING ENGINE
// ==============================================
function triggerNaukriLiveFilter() {
  const kw = (document.getElementById("naukriSearchKeyword")?.value || '').toLowerCase().trim();
  const exp = (document.getElementById("naukriSearchExp")?.value || '').toLowerCase().trim();
  const loc = (document.getElementById("naukriSearchLocation")?.value || '').toLowerCase().trim();

  const filtered = cachedJobs.filter(j => {
    const matchKw = !kw || 
      j.title.toLowerCase().includes(kw) || 
      j.company.toLowerCase().includes(kw) || 
      (j.skills || []).some(s => s.toLowerCase().includes(kw));

    const matchExp = !exp || 
      (exp === 'fresher' && (j.title.toLowerCase().includes('barista') || j.salary_value <= 15)) ||
      (exp === '1-3' && j.salary_value <= 35) ||
      (exp === '3-5' && j.salary_value <= 55) ||
      (exp === '5+' && j.salary_value > 40);

    const matchLoc = !loc || j.location.toLowerCase().includes(loc);

    return matchKw && matchExp && matchLoc;
  });

  renderNaukriJobCards(filtered);
}

function handleExpSliderChange(val) {
  const label = document.getElementById("sliderExpValue");
  if (label) {
    label.innerText = val == 0 ? "All Levels" : `${val}+ Yrs`;
  }
  triggerSidebarFilter();
}

function triggerSidebarFilter() {
  const expVal = parseInt(document.getElementById("expSlider")?.value || "0", 10);
  
  // Salary checkboxes
  const selectedSalaries = Array.from(document.querySelectorAll(".salary-filter:checked")).map(el => el.value);
  // Location checkboxes
  const selectedLocs = Array.from(document.querySelectorAll(".loc-filter:checked")).map(el => el.value.toLowerCase());
  // Work mode checkboxes
  const selectedModes = Array.from(document.querySelectorAll(".mode-filter:checked")).map(el => el.value.toLowerCase());

  const filtered = cachedJobs.filter(j => {
    // Experience check
    if (expVal > 0) {
      if (expVal >= 5 && j.salary_value < 35) return false;
    }

    // Salary check
    if (selectedSalaries.length > 0) {
      const match = selectedSalaries.some(s => {
        if (s === '0-3') return j.salary_value <= 10;
        if (s === '3-6') return j.salary_value >= 5 && j.salary_value <= 20;
        if (s === '6-10') return j.salary_value >= 15 && j.salary_value <= 40;
        if (s === '10+') return j.salary_value >= 35;
        return true;
      });
      if (!match) return false;
    }

    // Location check
    if (selectedLocs.length > 0) {
      const matchLoc = selectedLocs.some(l => j.location.toLowerCase().includes(l));
      if (!matchLoc) return false;
    }

    // Work Mode check
    if (selectedModes.length > 0) {
      const matchMode = selectedModes.some(m => j.work_mode.toLowerCase().includes(m));
      if (!matchMode) return false;
    }

    return true;
  });

  renderNaukriJobCards(filtered);
}

function filterByChip(term) {
  scrollToJobFeed();
  const kw = term.toLowerCase();

  const filtered = cachedJobs.filter(j => {
    if (kw === 'remote') return j.work_mode.toLowerCase().includes('remote') || j.location.toLowerCase().includes('remote');
    if (kw === 'fresher') return j.title.toLowerCase().includes('barista') || j.salary_value <= 15;
    if (kw === 'mnc') return ['Google', 'Microsoft', 'Amazon', 'Starbucks', 'Apple', 'Meta', 'Netflix', 'NVIDIA'].includes(j.company);
    if (kw === 'software') return j.skills.some(s => ['python', 'react', 'typescript', 'go', 'azure', 'cloud'].includes(s.toLowerCase()));
    if (kw === 'banking') return j.title.toLowerCase().includes('payment') || j.category.toLowerCase().includes('finance');
    if (kw === 'hospitality') return j.company.toLowerCase().includes('starbucks') || j.category.toLowerCase().includes('hospitality');
    return j.title.toLowerCase().includes(kw) || j.category.toLowerCase().includes(kw) || j.company.toLowerCase().includes(kw);
  });

  renderNaukriJobCards(filtered);
}

function filterByPill(pill) {
  document.querySelectorAll(".category-pill").forEach(el => {
    el.className = "category-pill px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shrink-0 cursor-pointer";
  });
  if (event && event.target) {
    event.target.className = "category-pill active px-4 py-2 bg-[#275df5] text-white rounded-xl shadow-xs shrink-0 cursor-pointer";
  }

  if (pill === 'All') {
    renderNaukriJobCards(cachedJobs);
  } else {
    filterByChip(pill);
  }
}

function filterByCompany(companyName) {
  scrollToJobFeed();
  const filtered = cachedJobs.filter(j => j.company.toLowerCase().includes(companyName.toLowerCase()));
  renderNaukriJobCards(filtered);
}

function resetAllFilters() {
  const kw = document.getElementById("naukriSearchKeyword");
  const exp = document.getElementById("naukriSearchExp");
  const loc = document.getElementById("naukriSearchLocation");
  const slider = document.getElementById("expSlider");
  const sliderLabel = document.getElementById("sliderExpValue");

  if (kw) kw.value = '';
  if (exp) exp.value = '';
  if (loc) loc.value = '';
  if (slider) slider.value = '0';
  if (sliderLabel) sliderLabel.innerText = 'All Levels';

  document.querySelectorAll("input[type=checkbox]").forEach(c => c.checked = false);
  renderNaukriJobCards(cachedJobs);
  showToast("All filters have been reset to default.", "info");
}

function scrollToJobFeed() {
  const el = document.getElementById("jobFeedSection");
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function goToHome() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  resetAllFilters();
}

// ==============================================
// 3. AUTHENTICATION & LOGIN / REGISTER MODAL
// ==============================================
function openAuthModal(mode = 'login') {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  switchAuthTab(mode);
  lucide.createIcons();
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) modal.classList.add("hidden");
}

function switchAuthTab(mode) {
  const tabLogin = document.getElementById("modalTabBtnLogin");
  const tabRegister = document.getElementById("modalTabBtnRegister");
  const formLogin = document.getElementById("naukriLoginForm");
  const formRegister = document.getElementById("naukriRegisterForm");

  if (mode === 'login') {
    tabLogin.className = "flex-1 py-2 rounded-xl text-xs font-bold text-[#275df5] bg-white shadow-2xs transition-all cursor-pointer";
    tabRegister.className = "flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer";
    formLogin.classList.remove("hidden");
    formRegister.classList.add("hidden");
  } else {
    tabRegister.className = "flex-1 py-2 rounded-xl text-xs font-bold text-[#ff7555] bg-white shadow-2xs transition-all cursor-pointer";
    tabLogin.className = "flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-all cursor-pointer";
    formRegister.classList.remove("hidden");
    formLogin.classList.add("hidden");
  }
  lucide.createIcons();
}

function fillAdminLogin() {
  switchAuthTab('login');
  document.getElementById("loginEmailInput").value = "admin@naukri.com";
  document.getElementById("loginPassInput").value = "admin123";
  showToast("Admin credentials filled! Click Sign In to open Master Console.", "info");
}

function togglePassVisibility(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

async function handleNaukriLoginSubmit(e) {
  e.preventDefault();
  const email = (document.getElementById("loginEmailInput").value || '').trim().toLowerCase();
  const password = document.getElementById("loginPassInput").value;
  const btn = document.getElementById("loginSubmitBtn");

  btn.disabled = true;
  btn.innerText = "Signing in to Naukri...";

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success && data.user) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem("naukri_auth_token", authToken);
      localStorage.setItem("worksphere_token", authToken);

      closeAuthModal();
      updateNavState(true);

      if (currentUser.is_admin || (currentUser.email && currentUser.email.includes("admin"))) {
        showToast("Welcome Admin! Opening Master Database Console...", "success");
        setTimeout(() => openAdminModal(), 400);
      } else {
        showToast(`Welcome back to Naukri, ${currentUser.full_name}!`, "success");
      }
    } else {
      showToast(data.error || "Login failed. Check your email & password.", "warning");
    }
  } catch (err) {
    showToast("Server connection error: " + err.message, "warning");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Sign In to Naukri</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
    lucide.createIcons();
  }
}

async function handleNaukriRegisterSubmit(e) {
  e.preventDefault();
  const full_name = document.getElementById("regFullNameInput").value.trim();
  const email = document.getElementById("regEmailInput").value.trim().toLowerCase();
  const password = document.getElementById("regPassInput").value;
  const phone = document.getElementById("regPhoneInput").value.trim();
  const id_document_type = document.getElementById("regDocTypeInput").value;
  const id_document_number = document.getElementById("regDocNumInput").value.trim();
  const btn = document.getElementById("regSubmitBtn");

  btn.disabled = true;
  btn.innerText = "Creating Candidate Account...";

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, email, password, phone, id_document_type, id_document_number })
    });
    const data = await res.json();

    if (data.success && data.user) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem("naukri_auth_token", authToken);
      localStorage.setItem("worksphere_token", authToken);

      closeAuthModal();
      updateNavState(true);
      showToast(`Account created successfully! Welcome, ${currentUser.full_name}!`, "success");
    } else {
      // Duplicate Email Prevention Feedback
      if (res.status === 409 || (data.error && data.error.includes("pehle se registered"))) {
        showToast("Yeh email pehle se registered hai! Kripya Login karein.", "warning");
        switchAuthTab('login');
        document.getElementById("loginEmailInput").value = email;
      } else {
        showToast(data.error || "Registration failed", "warning");
      }
    }
  } catch (err) {
    showToast("Server error: " + err.message, "warning");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Register Now & Apply Free</span><i data-lucide="check" class="w-4 h-4"></i>`;
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
    localStorage.removeItem("naukri_auth_token");
    localStorage.removeItem("worksphere_token");
    updateNavState(false);
    showToast("Logged out successfully.", "info");
  }
}

// ==============================================
// 4. ADMIN SQLITE DATABASE CONSOLE
// ==============================================
function openAdminModal() {
  if (!authToken || !currentUser) {
    showToast("Admin Console dekhne ke liye pehle Login karein.", "warning");
    openAuthModal('login');
    return;
  }
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
    if (btnUsers) btnUsers.className = "pb-3 px-4 text-xs font-bold text-[#275df5] border-b-2 border-[#275df5] transition-all flex items-center gap-2 cursor-pointer";
    if (btnApps) btnApps.className = "pb-3 px-4 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all flex items-center gap-2 cursor-pointer";
  } else {
    if (usersTab) usersTab.classList.add("hidden");
    if (appsTab) appsTab.classList.remove("hidden");
    if (btnUsers) btnUsers.className = "pb-3 px-4 text-xs font-bold text-slate-500 hover:text-slate-900 transition-all flex items-center gap-2 cursor-pointer";
    if (btnApps) btnApps.className = "pb-3 px-4 text-xs font-bold text-[#275df5] border-b-2 border-[#275df5] transition-all flex items-center gap-2 cursor-pointer";
  }
  lucide.createIcons();
}

async function fetchAdminData() {
  try {
    const res = await fetch("/api/admin/overview", {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
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

    // Render Users Table with EMAIL & PASSWORD
    const usersBody = document.getElementById("adminUsersTableBody");
    if (usersBody) {
      if (data.users.length === 0) {
        usersBody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">No users registered yet</td></tr>`;
      } else {
        usersBody.innerHTML = data.users.map(u => {
          const verifiedBadge = u.is_verified === 1 
            ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800"><i data-lucide="check-circle" class="w-3 h-3"></i> Verified</span>`
            : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800"><i data-lucide="clock" class="w-3 h-3"></i> Pending</span>`;
          
          const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';

          return `
            <tr class="hover:bg-slate-50 transition-colors">
              <td class="py-3 px-3 font-mono font-bold text-slate-500">#${u.id}</td>
              <td class="py-3 px-3 font-bold text-slate-900">${escapeHtml(u.full_name || 'N/A')}</td>
              <td class="py-3 px-3 font-semibold text-[#275df5] bg-blue-50/50 rounded">${escapeHtml(u.email)}</td>
              <td class="py-3 px-3">
                <span class="inline-flex items-center gap-1 font-mono text-xs font-extrabold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md">
                  <i data-lucide="key" class="w-3 h-3 text-amber-600"></i>
                  ${escapeHtml(u.password || 'password123')}
                </span>
              </td>
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
              <td class="py-3 px-3 font-semibold text-[#275df5]">${escapeHtml(a.candidate_email)}</td>
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

// ==============================================
// 5. APPLICATION SUBMISSION & SAVED JOBS
// ==============================================
function openApplyModalForJob(jobId) {
  if (!authToken || !currentUser) {
    showToast("Application submit karne ke liye pehle Login karein.", "warning");
    openAuthModal('login');
    return;
  }

  const job = cachedJobs.find(j => j.id === jobId);
  if (!job) return;

  activeApplyingJobId = jobId;
  document.getElementById("applyModalTitle").innerText = job.title;
  document.getElementById("applyModalCompany").innerText = `${job.company} • ${job.location}`;

  if (currentUser) {
    document.getElementById("applyName").value = currentUser.full_name || "";
    document.getElementById("applyPhone").value = currentUser.phone || "";
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
    openAuthModal('login');
    return;
  }

  const candidate_name = document.getElementById("applyName").value.trim();
  const candidate_phone = document.getElementById("applyPhone").value.trim();
  const experience = document.getElementById("applyExp").value;
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
        cover_note,
        resume_filename
      })
    });
    const data = await res.json();

    if (res.status === 401 || (data.error && data.error.includes("login"))) {
      showToast("Aapka login session expire ho gaya tha. Kripya ek baar Sign In karein.", "warning");
      authToken = null;
      currentUser = null;
      closeApplyModal();
      openAuthModal('login');
      return;
    }

    if (data.success) {
      closeApplyModal();
      showToast(`Application successfully submitted to ${data.application.company}!`, "success");
      loadApplicationsFromApi();
    } else {
      showToast(data.error || "Submission failed", "warning");
    }
  } catch (err) {
    showToast("Server connection error: " + err.message, "warning");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>Submit Application on Naukri</span><i data-lucide="send" class="w-4 h-4"></i>`;
    lucide.createIcons();
  }
}

async function loadApplicationsFromApi() {
  if (!authToken) return;
  try {
    const res = await fetch('/api/applications', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success && data.applications) {
      cachedApplications = data.applications;
      const badge = document.getElementById("navAppBadge");
      if (badge) badge.innerText = cachedApplications.length;
    }
  } catch (err) {}
}

function openMyApplicationsTab() {
  if (cachedApplications.length === 0) {
    showToast("Aapne abhi tak kisi job me apply nahi kiya hai.", "info");
  } else {
    showToast(`Aapne total ${cachedApplications.length} companies me apply kiya hai!`, "success");
  }
}

async function toggleSaveJobInApi(jobId) {
  if (!authToken) {
    showToast("Job bookmark karne ke liye pehle Login karein.", "warning");
    openAuthModal('login');
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
    }
  } catch (e) {}
}

function openVerifyIdModal() {
  showToast("Naukri Candidate ID Verification is active. Verified candidates receive 3x recruiter visibility.", "info");
}

// ==============================================
// 6. UTILITIES & TOASTS
// ==============================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastBox");
  if (!container) return;

  const toast = document.createElement("div");
  let bgClass = "bg-slate-900 text-white";
  if (type === "success") bgClass = "bg-emerald-600 text-white";
  if (type === "warning") bgClass = "bg-[#ff7555] text-white";

  toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold ${bgClass} transition-all duration-300 transform translate-y-3 opacity-0`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => { toast.classList.remove("translate-y-3", "opacity-0"); }, 10);
  setTimeout(() => {
    toast.classList.add("translate-y-3", "opacity-0");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
