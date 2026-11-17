# db.rb - Production SQLite Database Manager with 22+ REAL Top Global & Indian Companies
require 'sqlite3'
require 'json'
require 'openssl'
require 'securerandom'
require 'time'

DB_PATH = File.expand_path(File.join(File.dirname(__FILE__), 'data', 'portal.sqlite3'))

module Database
  def self.connect
    db = SQLite3::Database.new(DB_PATH)
    db.results_as_hash = true
    db.busy_timeout = 5000
    db
  end

  def self.hash_password(password, salt = nil)
    salt ||= SecureRandom.hex(16)
    hash = OpenSSL::PKCS5.pbkdf2_hmac(password, salt, 20000, 32, OpenSSL::Digest::SHA256.new).unpack1('H*')
    [hash, salt]
  end

  def self.verify_password(password, stored_hash, salt)
    calc_hash, _ = hash_password(password, salt)
    calc_hash == stored_hash
  end

  def self.init!
    db = connect
    db.execute_batch <<-SQL
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        is_verified INTEGER DEFAULT 0,
        verification_code TEXT,
        id_document_type TEXT,
        id_document_number TEXT,
        id_status TEXT DEFAULT 'Unverified',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        work_mode TEXT NOT NULL,
        job_type TEXT NOT NULL,
        location TEXT NOT NULL,
        salary TEXT NOT NULL,
        salary_value INTEGER NOT NULL,
        logo_bg TEXT NOT NULL,
        initials TEXT NOT NULL,
        logo_svg TEXT,
        skills TEXT NOT NULL,
        description TEXT NOT NULL,
        responsibilities TEXT NOT NULL,
        requirements TEXT NOT NULL,
        benefits TEXT NOT NULL,
        official_url TEXT NOT NULL,
        posted_date TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        job_id INTEGER NOT NULL,
        candidate_name TEXT NOT NULL,
        candidate_email TEXT NOT NULL,
        candidate_phone TEXT NOT NULL,
        experience TEXT NOT NULL,
        portfolio_url TEXT,
        cover_note TEXT,
        resume_filename TEXT,
        id_verified_badge INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Submitted',
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS saved_jobs (
        user_id INTEGER NOT NULL,
        job_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(user_id, job_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );
    SQL

    seed_demo_user_if_empty!(db)
    reseed_real_companies!(db)
    db.close
    puts "✅ Database initialized with REAL companies at #{DB_PATH}"
  end

  def self.seed_demo_user_if_empty!(db)
    count = db.get_first_value("SELECT COUNT(*) FROM users")
    return if count > 0

    hash, salt = hash_password("password123")
    db.execute(
      "INSERT INTO users (email, password_hash, salt, full_name, phone, is_verified, verification_code, id_document_type, id_document_number, id_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ["rahul.sharma@tech.com", hash, salt, "Rahul Sharma", "+91 98765 43210", 1, "7849", "Aadhaar Card", "XXXX-XXXX-9821", "Verified", Time.now.utc.iso8601]
    )

    hash2, salt2 = hash_password("password123")
    db.execute(
      "INSERT INTO users (email, password_hash, salt, full_name, phone, is_verified, verification_code, id_document_type, id_document_number, id_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ["priya.design@agency.io", hash2, salt2, "Priya Patel", "+91 98112 34567", 0, "4219", "PAN Card", "ABCDE1234F", "Pending", Time.now.utc.iso8601]
    )
  end

  def self.reseed_real_companies!(db)
    # Always ensure full set of verified real companies
    db.execute("DELETE FROM jobs")

    real_companies_catalog = [
      {
        company: "Google",
        title: "Senior Software Engineer - Generative AI & Cloud Core",
        category: "Engineering",
        work_mode: "Hybrid",
        job_type: "Full-time",
        location: "Bangalore, IN",
        salary: "₹45 - 65 LPA",
        salary_value: 65,
        logo_bg: "bg-red-50 text-red-600 border-red-200",
        initials: "G",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/><path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.4 7.5 23 12 23z"/></svg>',
        skills: ["Python", "TensorFlow", "Go", "Distributed Systems", "LLMs"],
        description: "Google DeepMind and Cloud AI infrastructure team is hiring Senior Software Engineers to architect frontier generative foundation models and high-throughput inference stacks serving global enterprise clients.",
        responsibilities: [
          "Architect distributed TPU/GPU accelerator serving systems with sub-10ms response latency.",
          "Partner with AI research scientists to translate frontier multimodal transformer architectures into reliable production microservices.",
          "Drive high-availability SLA compliance (99.99%) across multi-region Kubernetes deployments."
        ],
        requirements: [
          "Bachelor's or Master's in Computer Science or equivalent practical experience.",
          "5+ years of software engineering experience in Go, C++, or Python.",
          "Demonstrated track record designing large-scale distributed architectures and caching engines."
        ],
        benefits: ["Comprehensive Family Health Cover", "Generous Google Stock Units (GSUs)", "Hybrid 3-day work culture", "Annual Wellness Stipends", "Free Gourmet Meals"],
        official_url: "https://careers.google.com"
      },
      {
        company: "Microsoft",
        title: "Senior Full Stack Engineer - Azure Cloud Developer Platform",
        category: "Engineering",
        work_mode: "Remote",
        job_type: "Full-time",
        location: "Hyderabad, IN / Remote",
        salary: "₹35 - 50 LPA",
        salary_value: 50,
        logo_bg: "bg-sky-50 text-sky-600 border-sky-200",
        initials: "MS",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>',
        skills: ["React", "TypeScript", "C#", ".NET Core", "Azure"],
        description: "Join the Azure Developer Experience engineering organization to build mission-critical developer portals, SDKs, and cloud automation consoles accessed by over 50 million developers worldwide.",
        responsibilities: [
          "Engineer fluid, accessible user interfaces utilizing modern React, TypeScript, and Microsoft Fluent Design.",
          "Design robust cloud-native microservices using C# and .NET Core hosted on Azure Kubernetes Service (AKS).",
          "Collaborate with security teams to enforce zero-trust identity frameworks and compliance protocols."
        ],
        requirements: [
          "4+ years of full stack software engineering experience.",
          "Deep mastery of JavaScript/TypeScript ecosystem, RESTful APIs, and gRPC.",
          "Hands-on experience deploying and operating systems on Azure or AWS."
        ],
        benefits: ["100% Work From Anywhere policy", "Microsoft ESPP & Annual Stock Grants", "Childcare & Parental Leave Benefits", "Annual Ergonomic Equipment Grant"],
        official_url: "https://careers.microsoft.com"
      },
      {
        company: "Amazon",
        title: "Software Development Engineer II (SDE II) - AWS Global Payments",
        category: "Engineering",
        work_mode: "On-site",
        job_type: "Full-time",
        location: "Bangalore, IN",
        salary: "₹40 - 55 LPA",
        salary_value: 55,
        logo_bg: "bg-amber-50 text-amber-600 border-amber-200",
        initials: "AMZ",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#FF9900" d="M14.7 13.5c-1.3 0-2.3-.4-3.1-1.3l1.1-1.2c.6.6 1.3.9 2.1.9.9 0 1.4-.4 1.4-1 0-.6-.5-.9-1.5-1.1-1.7-.4-2.7-1-2.7-2.3 0-1.4 1.2-2.4 2.8-2.4 1.1 0 2 .3 2.7.9l-1 1.2c-.5-.4-1.1-.6-1.7-.6-.8 0-1.3.4-1.3.9 0 .5.4.8 1.4 1 1.8.4 2.8 1 2.8 2.4 0 1.6-1.2 2.5-3 2.5z"/><path fill="#232F3E" d="M18.8 18.2C13.5 22 6.5 21.6 2 17.5c-.3-.3 0-.7.4-.5 4.3 2.4 9.8 2.5 14.5-.6.5-.4 1.2.3.9.8"/><path fill="#FF9900" d="M19.7 16.9c-.3-.4-1.7-.2-2.5-.1-.3 0-.3-.3 0-.5 1.5-.9 3.9-.7 4.2-.3.3.4-.2 2.8-1.5 3.9-.2.2-.4.1-.2-.2.3-.7.3-2.4 0-2.8z"/></svg>',
        skills: ["Java", "AWS", "DynamoDB", "Kafka", "Distributed Systems"],
        description: "Amazon Pay and AWS Commerce team is seeking an SDE II to lead high-throughput payment settlement pipelines processing billions of dollars in real-time transactions every quarter.",
        responsibilities: [
          "Own complete architectural design and execution of asynchronous transaction reconciliation engines.",
          "Optimize database query latencies using AWS DynamoDB, Aurora PostgreSQL, and Redis caching.",
          "Conduct architectural design reviews and mentor SDE I engineers in engineering excellence."
        ],
        requirements: [
          "3-6 years of experience building mission-critical backends in Java, Kotlin, or Go.",
          "Strong theoretical and applied foundation in object-oriented design and distributed transactions."
        ],
        benefits: ["Sign-on Cash Bonus + Restricted Stock Units (RSUs)", "Comprehensive Health & Life Insurance", "Relocation Support", "Amazon Employee Discount"],
        official_url: "https://amazon.jobs"
      },
      {
        company: "Apple",
        title: "iOS Platform Software Engineer - CoreOS & Systems",
        category: "Engineering",
        work_mode: "On-site",
        job_type: "Full-time",
        location: "Hyderabad, IN",
        salary: "₹38 - 52 LPA",
        salary_value: 52,
        logo_bg: "bg-slate-100 text-slate-900 border-slate-300",
        initials: "APL",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#000" d="M18.7 19.5c-.8 1.2-1.7 2.4-3 2.4-1.4 0-1.8-.8-3.4-.8s-2 .8-3.4.8c-1.4 0-2.3-1.3-3.2-2.5C3.9 16.7 2.5 11.5 4.4 8.2c1-1.6 2.7-2.7 4.6-2.7 1.4 0 2.7.9 3.5.9.8 0 2.4-1.2 4.1-1 1.7.1 3 1.1 3.7 2.1-3.2 1.7-2.7 6.1.5 7.4-.7 1.8-1.6 3.5-2.1 4.6zM15.9 3.8C16.6 2.9 17.1 1.7 17 .5c-1.1.1-2.4.7-3.1 1.6-.7.8-1.2 2-1.1 3.2 1.2.1 2.4-.6 3.1-1.5z"/></svg>',
        skills: ["Swift", "SwiftUI", "Objective-C", "Metal", "CoreAnimation"],
        description: "Join the Apple Software Engineering group to develop core user-facing features and frameworks across iOS, iPadOS, and macOS. Touch the everyday lives of over 1.5 billion device users.",
        responsibilities: [
          "Develop buttery-smooth 120Hz ProMotion user interface animations in SwiftUI and Metal.",
          "Optimize battery consumption, memory footprint, and CPU thread contention across Apple Silicon.",
          "Collaborate with human interface designers in Cupertino to enforce pixel-perfection."
        ],
        requirements: [
          "3+ years of native Apple platform engineering in Swift or Objective-C.",
          "Deep mastery of memory management (ARC), concurrent dispatch queues, and CoreData."
        ],
        benefits: ["Substantial Hardware Product Discounts", "Apple Stock Grants & ESPP", "Full Family Health & Dental Coverage", "On-site Fitness & Wellness Center"],
        official_url: "https://jobs.apple.com"
      },
      {
        company: "Meta",
        title: "Staff Product Designer - Instagram Reels & Discovery",
        category: "Design",
        work_mode: "Remote",
        job_type: "Full-time",
        location: "Remote (Global)",
        salary: "$160,000 - $195,000",
        salary_value: 195,
        logo_bg: "bg-blue-50 text-blue-600 border-blue-200",
        initials: "M",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#0668E1" d="M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z"/></svg>',
        skills: ["Figma", "Design Systems", "Prototyping", "User Research", "Interaction Design"],
        description: "Direct end-to-end product design across Instagram Reels creation and consumption workflows. You will craft intuitive mobile experiences for over 2 billion active creators and viewers.",
        responsibilities: [
          "Define product vision from ambiguous concept explorations to high-fidelity production specs.",
          "Build interactive Framer and Figma prototypes to test ergonomics and user emotional engagement.",
          "Partner closely with engineering leaders to ensure zero design fidelity loss in iOS & Android builds."
        ],
        requirements: [
          "5+ years designing consumer mobile products at scale.",
          "Exceptional portfolio highlighting interaction craft, typography, and proven metric impact."
        ],
        benefits: ["Remote-first flexibility", "Annual Wellness Allowance ($3,000)", "Generous Equity Package", "Mental Health Concierge Support"],
        official_url: "https://metacareers.com"
      },
      {
        company: "NVIDIA",
        title: "Senior Deep Learning Compiler Engineer - CUDA & TensorRT",
        category: "Engineering",
        work_mode: "Hybrid",
        job_type: "Full-time",
        location: "Bangalore / Pune, IN",
        salary: "₹55 - 80 LPA",
        salary_value: 80,
        logo_bg: "bg-emerald-50 text-emerald-700 border-emerald-300",
        initials: "NV",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#76B900" d="M8.6 7.6c1.8-1.4 4-2.1 6.5-2.1 3 0 5.6 1.1 7.7 3.3.4.4.4 1 0 1.4-.4.4-1 .4-1.4 0-1.7-1.8-3.9-2.7-6.3-2.7-2 0-3.9.6-5.4 1.7l1.7 1.7c1.1-.7 2.4-1.1 3.7-1.1 3 0 5.5 2.5 5.5 5.5s-2.5 5.5-5.5 5.5c-2.3 0-4.3-1.5-5.1-3.6l6.8-6.8-1.4-1.4-8.8 8.8c.2 4.4 3.8 8 8.3 8 4.6 0 8.3-3.7 8.3-8.3 0-3.3-1.9-6.2-4.7-7.5l1.3-1.3C22 5.5 24 8.5 24 12c0 6.6-5.4 12-12 12S0 18.6 0 12C0 7.7 2.3 4 5.7 2l1.3 1.3C4.1 4.8 2 8.1 2 12c0 5.5 4.5 10 10 10s10-4.5 10-10-4.5-10-10-10c-3.1 0-5.8 1.4-7.7 3.6l4.3 2z"/></svg>',
        skills: ["C++", "CUDA", "TensorRT", "GPU Architecture", "LLVM"],
        description: "Accelerate frontier generative AI model inference on next-generation Blackwell and Hopper GPUs. You will optimize kernel fusions, memory bandwidth, and distributed FP8 scaling.",
        responsibilities: [
          "Develop LLVM optimization passes and automated code generation for GPU tensor cores.",
          "Benchmark and profile frontier open-weights models (Llama, Mistral) on multi-node HGX clusters.",
          "Collaborate with PyTorch and Triton open-source compiler teams."
        ],
        requirements: [
          "Bachelor's, Master's or PhD in Computer Science, Electrical Engineering, or related discipline.",
          "4+ years of expert-level modern C++ (C++17/20) and CUDA kernel programming."
        ],
        benefits: ["High-value NVIDIA ESPP & RSU Equity Package", "Family Medical & OPD Cover", "Flexible Hybrid Work Structure", "Generous Learning & Equipment Budgets"],
        official_url: "https://www.nvidia.com/en-us/about-nvidia/careers/"
      },
      {
        company: "Netflix",
        title: "Senior Site Reliability Engineer (SRE) - Cloud Media Infrastructure",
        category: "Engineering",
        work_mode: "Remote",
        job_type: "Full-time",
        location: "Remote (Global)",
        salary: "$220,000 - $275,000",
        salary_value: 275,
        logo_bg: "bg-rose-50 text-rose-600 border-rose-200",
        initials: "NFLX",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#E50914" d="M4 2h4.5v14.8L15.5 2H20v20h-4.5V7.2L8.5 22H4V2z"/></svg>',
        skills: ["Kubernetes", "AWS", "Go", "Terraform", "Chaos Engineering"],
        description: "Keep Netflix video encoding and streaming pipelines available across 190 countries for 270+ million members watching billions of hours of movies and series every week.",
        responsibilities: [
          "Automate cross-region active-active disaster recovery failover pipelines on AWS.",
          "Implement chaos engineering experiments to surface latent vulnerabilities before customer impact.",
          "Drive automated observability, telemetry pipelines, and mean-time-to-resolution (MTTR) improvements."
        ],
        requirements: [
          "5+ years supporting hyperscale cloud infrastructure in Linux environments.",
          "Solid programming ability in Go, Python, or Java with deep Kubernetes orchestration experience."
        ],
        benefits: ["Market-leading All-Cash or Stock Option compensation", "Unlimited PTO & Vacation Culture", "Comprehensive Global Medical Care", "Work From Anywhere Setup"],
        official_url: "https://jobs.netflix.com"
      },
      {
        company: "Spotify",
        title: "Senior Data Scientist - Algorithmic Music Recommendation",
        category: "Data",
        work_mode: "Remote",
        job_type: "Full-time",
        location: "London, UK / Remote",
        salary: "£85,000 - £115,000",
        salary_value: 115,
        logo_bg: "bg-emerald-50 text-emerald-600 border-emerald-200",
        initials: "SP",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#1ED760"/><path fill="#FFF" d="M17.5 16.2c-.2.3-.5.4-.8.2-2.2-1.3-5-1.6-8.3-.9-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 3.6-.8 6.7-.4 9.2 1.1.2.2.3.5.2.7zm1.1-2.5c-.3.4-.7.5-1.1.3-2.5-1.5-6.3-2-9.2-1.1-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.4-1 7.6-.5 10.5 1.2.4.3.5.7.3 1.1zm.1-2.6C15.6 9.4 10.5 9.2 7.5 10.1c-.5.2-1-.1-1.2-.6-.2-.5.1-1 .6-1.2 3.5-1.1 9.1-.9 12.7 1.2.4.3.6.9.3 1.3-.2.5-.8.6-1.2.3z"/></svg>',
        skills: ["Python", "SQL", "Machine Learning", "A/B Testing", "Spark"],
        description: "Develop the machine learning and behavioral discovery algorithms that power Spotify Discover Weekly, Release Radar, and personalized audio feed mixes for 600+ million music fans.",
        responsibilities: [
          "Build offline and online recommendation models leveraging graph neural networks and collaborative filtering.",
          "Formulate rigorous hypothesis-driven A/B experimentation frameworks to quantify discovery delight.",
          "Extract semantic acoustic audio embeddings to bridge independent artists with prospective fans."
        ],
        requirements: [
          "Degree in Statistics, Machine Learning, Computer Science or related quantitative field.",
          "Proficiency in Python data ecosystem (PyTorch, pandas, scikit-learn) and petabyte-scale SQL querying."
        ],
        benefits: ["Spotify Global Work From Anywhere Policy", "Free Spotify Premium for Life", "Flexible Public Holidays", "Comprehensive Parental Support"],
        official_url: "https://lifeatspotify.com"
      },
      {
        company: "Uber",
        title: "Staff Backend Engineer - Realtime Mobility Dispatch & Routing",
        category: "Engineering",
        work_mode: "Hybrid",
        job_type: "Full-time",
        location: "Bangalore, IN",
        salary: "₹50 - 70 LPA",
        salary_value: 70,
        logo_bg: "bg-slate-100 text-slate-800 border-slate-300",
        initials: "UBR",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#000"/><path fill="#FFF" d="M12 5.5A6.5 6.5 0 0 0 5.5 12a6.5 6.5 0 0 0 6.5 6.5 6.5 6.5 0 0 0 6.5-6.5A6.5 6.5 0 0 0 12 5.5zm0 10.5A4 4 0 0 1 8 12a4 4 0 0 1 4-4 4 4 0 0 1 4 4 4 4 0 0 1-4 4z"/></svg>',
        skills: ["Go", "Java", "Kafka", "Geospatial", "Microservices"],
        description: "Architect the low-latency dispatch and routing engine matching millions of riders with drivers in real-time across 10,000 cities worldwide while navigating dynamic traffic conditions.",
        responsibilities: [
          "Design geospatial indexing and clustering algorithms processing tens of millions of GPS pings per minute.",
          "Scale high-concurrency microservice architectures handling multi-thousand QPS spikes on weekend nights.",
          "Establish engineering quality benchmarks and conduct cross-organization architectural reviews."
        ],
        requirements: [
          "7+ years architecting high-scale distributed backend systems.",
          "Extensive production experience with Go or Java, distributed consensus (Raft/Paxos), and Kafka."
        ],
        benefits: ["Monthly Uber Ride & Eats Credits", "Substantial Equity RSUs", "Comprehensive Medical Cover for Family", "Sabbatical Leave Program"],
        official_url: "https://uber.com/careers"
      },
      {
        company: "Stripe",
        title: "Staff Infrastructure Engineer - Global Payment Reliability",
        category: "Engineering",
        work_mode: "Remote",
        job_type: "Full-time",
        location: "Remote (Global)",
        salary: "$180,000 - $230,000",
        salary_value: 230,
        logo_bg: "bg-violet-50 text-violet-600 border-violet-200",
        initials: "STR",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#635BFF" d="M13.9 8.7c0-.8.6-1.2 1.6-1.2 1.5 0 3.3.5 4.8 1.3V3.4C18.6 2.8 16.9 2.5 15.2 2.5 10.5 2.5 7.4 5 7.4 9.1c0 6.3 8.7 5.3 8.7 8 0 .9-.8 1.3-1.9 1.3-1.6 0-3.8-.7-5.5-1.6v5.5c1.9.8 3.8 1.2 5.7 1.2 4.9 0 8.2-2.4 8.2-6.7 0-6.8-8.7-5.6-8.7-8.1z"/></svg>',
        skills: ["Ruby", "Go", "Distributed Systems", "AWS", "Zero-Downtime Migration"],
        description: "Join the Stripe Global Payments Foundation team responsible for processing over 1 trillion dollars annually for millions of global internet businesses.",
        responsibilities: [
          "Engineer multi-region active-active database partitioning and zero-downtime data schema migrations.",
          "Design fault-isolation bulkheads ensuring partial network outages never cascade into transaction drops.",
          "Write clean, highly vetted infrastructure code in Ruby and Go with exhaustive test coverage."
        ],
        requirements: [
          "6+ years of distributed backend and database architecture experience.",
          "Deep experience in transactional isolation levels, consensus mechanisms, and high-frequency payments."
        ],
        benefits: ["Remote-first flexibility with home office stipend", "Competitive Equity grant", "Comprehensive global healthcare", "Generous learning & conference budget"],
        official_url: "https://stripe.com/jobs"
      },
      {
        company: "Airbnb",
        title: "Staff Frontend Architect - Global Booking Engine & Design Systems",
        category: "Engineering",
        work_mode: "Remote",
        job_type: "Full-time",
        location: "Remote (Global)",
        salary: "$190,000 - $240,000",
        salary_value: 240,
        logo_bg: "bg-rose-50 text-rose-500 border-rose-200",
        initials: "AIR",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#FF5A5F" d="M12 2C8 2 4.5 9 4.5 14.5c0 4.1 3.3 7.5 7.5 7.5s7.5-3.4 7.5-7.5C19.5 9 16 2 12 2zm0 18c-3 0-5.5-2.5-5.5-5.5 0-3.6 2.4-8.8 5.5-12.8 3.1 4 5.5 9.2 5.5 12.8 0 3-2.5 5.5-5.5 5.5z"/></svg>',
        skills: ["React", "TypeScript", "Design Systems", "Web Performance", "Next.js"],
        description: "Architect the consumer web discovery and reservation flow for millions of guest stays and experiences across 220 countries.",
        responsibilities: [
          "Modernize core checkout and search interface for maximum fluid responsiveness on web and mobile.",
          "Author reusable accessibility and design token components in the Airbnb design system.",
          "Lead frontend reliability initiatives keeping error budgets strictly under 0.01%."
        ],
        requirements: [
          "6+ years of specialized web UI architecture experience.",
          "Recognized track record building accessible, high-performance web applications."
        ],
        benefits: ["Live & Work Anywhere globally", "Annual $2,000 Airbnb Travel Credit", "Comprehensive medical, dental & vision", "Generous equity grant"],
        official_url: "https://careers.airbnb.com"
      },
      {
        company: "Salesforce",
        title: "Principal Cloud Platform Architect - Hyperforce Infrastructure",
        category: "Engineering",
        work_mode: "Hybrid",
        job_type: "Full-time",
        location: "Hyderabad / Bangalore, IN",
        salary: "₹48 - 68 LPA",
        salary_value: 68,
        logo_bg: "bg-sky-50 text-sky-600 border-sky-200",
        initials: "CRM",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#00A1E0" d="M19.3 8.3c-.6-2.5-2.9-4.3-5.5-4.3-1.8 0-3.4.9-4.3 2.3C8.7 6.1 7.9 6 7 6 4.2 6 2 8.2 2 11c0 .4.1.8.2 1.2C1 12.8.3 13.9.3 15.2c0 2 1.6 3.8 3.7 3.8h15c2.8 0 5-2.2 5-5 0-2.6-2-4.7-4.7-4.7z"/></svg>',
        skills: ["Kubernetes", "AWS", "Java", "Terraform", "Distributed Systems"],
        description: "Lead technical architecture of Salesforce Hyperforce, deploying multi-tenant CRM cloud applications on public cloud infrastructure serving Fortune 500 enterprises.",
        responsibilities: [
          "Design automated deployment and infrastructure-as-code blueprints for thousands of enterprise pods.",
          "Ensure zero-downtime rolling upgrades and regional data residency compliance.",
          "Present architectural decisions to senior executive leadership."
        ],
        requirements: [
          "8+ years of enterprise cloud systems architecture experience.",
          "Expertise in large-scale multi-tenant Kubernetes and microservice mesh."
        ],
        benefits: ["Salesforce ESPP & Annual Stock Grants", "Wellness Reimbursement ($100/mo)", "Family Comprehensive Healthcare", "7 Paid Days Volunteer Time Off (VTO)"],
        official_url: "https://careers.salesforce.com"
      },
      {
        company: "Tesla",
        title: "Autopilot Software Engineer - Computer Vision & C++",
        category: "Engineering",
        work_mode: "On-site",
        job_type: "Full-time",
        location: "Palo Alto, US / Bangalore (R&D)",
        salary: "$180,000 - $240,000",
        salary_value: 240,
        logo_bg: "bg-red-50 text-red-700 border-red-200",
        initials: "TSLA",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#E82127" d="M12 4.2c2.4 0 4.6.4 6.5 1.1l.8-2.6C16.9 1.8 14.5 1.4 12 1.4S7.1 1.8 4.7 2.7l.8 2.6c1.9-.7 4.1-1.1 6.5-1.1zm0 3.3c-2.3 0-4.3.4-6 .9L5.4 11c1.9-.5 4.1-.8 6.6-.8s4.7.3 6.6.8l-.6-2.6c-1.7-.5-3.7-.9-6-.9zM10.7 13v9.6h2.6V13l3.2-3.8c-1.8-.4-3.8-.6-5.8-.6s-4 .2-5.8.6l3.2 3.8z"/></svg>',
        skills: ["C++", "PyTorch", "CUDA", "Computer Vision", "Real-Time Embedded"],
        description: "Develop perception, neural network quantization, and low-latency decision algorithms powering Tesla Full Self-Driving (FSD) across millions of production vehicles.",
        responsibilities: [
          "Deploy vision transformer models on custom Tesla FSD neural network hardware.",
          "Optimize deterministic C++ trajectory planning loops at 60Hz update rates.",
          "Analyze fleet edge cases from billions of miles of real-world driving data."
        ],
        requirements: [
          "3+ years building real-time robotics, autonomous vehicles, or embedded vision systems in modern C++.",
          "Solid mathematical grasp of projective geometry, state estimation (Kalman filters), and deep learning."
        ],
        benefits: ["Significant Tesla Equity / Stock Grants", "Full medical, dental & optical health plan", "Free Supercharging & Vehicle Discounts", "Dynamic mission-driven culture"],
        official_url: "https://www.tesla.com/careers"
      },
      {
        company: "Swiggy",
        title: "Principal Product Manager - Instamart Quick Commerce & Supply Chain",
        category: "Product",
        work_mode: "On-site",
        job_type: "Full-time",
        location: "Bangalore, IN",
        salary: "₹35 - 48 LPA",
        salary_value: 48,
        logo_bg: "bg-orange-50 text-orange-600 border-orange-200",
        initials: "SWG",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#FC8019" d="M12 2C6.5 2 2 6.5 2 12c0 3.4 1.7 6.4 4.3 8.2l5.7-14.8c0-.2.2-.4.4-.4.2 0 .4.2.4.4l3.1 8h-4.3c-.3 0-.5.2-.5.5s.2.5.5.5h4.7l1.7 4.5c2.4-1.8 3.9-4.7 3.9-7.9 0-5.5-4.5-10-9.9-10z"/></svg>',
        skills: ["Product Strategy", "Supply Chain", "Growth Analytics", "UX Strategy"],
        description: "Lead the technological and operational roadmap for Swiggy Instamart dark-store logistics, inventory replenishment algorithms, and 10-minute lightning delivery customer experience.",
        responsibilities: [
          "Define product vision and OKRs for dark store picking efficiency and routing optimization.",
          "Analyze customer drop-off data through Amplitude/Mixpanel to increase checkout conversion by 15%.",
          "Collaborate with algorithms, engineering, and warehouse ground operations leadership."
        ],
        requirements: [
          "5+ years product management experience in high-growth marketplace, logistics, or consumer tech.",
          "Exceptional data-driven mindset and ability to communicate clearly with executive stakeholders."
        ],
        benefits: ["Swiggy Instamart and Dineout Perks", "Substantial ESOP Grant", "Top-tier health cover for parents", "Flexible work arrangements"],
        official_url: "https://careers.swiggy.com"
      },
      {
        company: "Razorpay",
        title: "Lead Frontend Architect - Web Payments & Checkout SDK",
        category: "Engineering",
        work_mode: "Hybrid",
        job_type: "Full-time",
        location: "Bangalore, IN",
        salary: "₹42 - 58 LPA",
        salary_value: 58,
        logo_bg: "bg-indigo-50 text-indigo-600 border-indigo-200",
        initials: "RZP",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#0C2340" d="M2.5 12C2.5 6.8 6.8 2.5 12 2.5S21.5 6.8 21.5 12 17.2 21.5 12 21.5 2.5 17.2 2.5 12z"/><path fill="#3395FF" d="M15 7l-5.5 6.5h3L10 17l6.5-6.5h-3L15 7z"/></svg>',
        skills: ["React", "TypeScript", "Web Performance", "Microfrontends", "Next.js"],
        description: "Lead frontend architecture for Razorpay Checkout JS SDK loaded across millions of merchant websites, ensuring sub-second rendering even on low-speed 3G mobile connections.",
        responsibilities: [
          "Architect lightweight, framework-agnostic embeddable UI SDKs with bundle size strictly capped under 25KB.",
          "Build automated visual regression and cross-browser testing matrices covering 99.8% of global devices.",
          "Mentor 30+ web engineers across product verticals and establish engineering RFC standards."
        ],
        requirements: [
          "6+ years specialized web frontend engineering and architecture experience.",
          "Demonstrated contributions to open-source libraries or large-scale financial SDKs."
        ],
        benefits: ["Attractive ESOP wealth creation opportunity", "Family comprehensive health insurance", "Workation benefits", "MacBook Pro M3 Max equipment"],
        official_url: "https://razorpay.com/jobs"
      },
      {
        company: "Zomato",
        title: "Senior Android Developer - Jetpack Compose & Consumer App",
        category: "Engineering",
        work_mode: "On-site",
        job_type: "Full-time",
        location: "Gurgaon, IN",
        salary: "₹30 - 45 LPA",
        salary_value: 45,
        logo_bg: "bg-red-50 text-red-700 border-red-200",
        initials: "ZOM",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#E23744" d="M2 12C2 6.5 6.5 2 12 2s10 4.5 10 10-4.5 10-10 10S2 17.5 2 12zm13.5-3.8h-7v1.8h4.5l-4.5 5.5v1.8h7v-1.8H11l4.5-5.5V8.2z"/></svg>',
        skills: ["Kotlin", "Jetpack Compose", "Coroutines", "Clean Architecture", "CI/CD"],
        description: "Build cutting-edge dining and food discovery experiences for 80+ million Indian food lovers on Android with immediate delivery tracking and live driver animations.",
        responsibilities: [
          "Migrate existing Android views to modern declarative Jetpack Compose architecture.",
          "Engineer realtime WebSocket order telemetry updates with robust offline recovery.",
          "Optimize cold app launch time to under 1.2 seconds across mid-range Android smartphones."
        ],
        requirements: [
          "4+ years building high-traffic native Android applications in Kotlin.",
          "Deep understanding of MVVM, Android Architecture Components, and Kotlin Coroutines/Flow."
        ],
        benefits: ["Zomato Gold VIP membership", "Attractive Stock Grants", "Free daily catered lunches", "Wellness & fitness allowance"],
        official_url: "https://www.zomato.com/careers"
      },
      {
        company: "Flipkart",
        title: "Senior Big Data Engineer - Big Billion Days Streaming Engine",
        category: "Data",
        work_mode: "Hybrid",
        job_type: "Full-time",
        location: "Bangalore, IN",
        salary: "₹32 - 46 LPA",
        salary_value: 46,
        logo_bg: "bg-yellow-50 text-blue-700 border-yellow-300",
        initials: "FLP",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#2874F0" d="M3 5h18v14H3z"/><path fill="#FFD200" d="M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm-1 6h2v-2h-2v2zm0-3h2V9h-2v2z"/></svg>',
        skills: ["Apache Spark", "Flink", "Kafka", "Hadoop", "Scala"],
        description: "Process billions of clickstream events and real-time inventory locking signals during Flipkart Big Billion Days festival processing thousands of orders every second.",
        responsibilities: [
          "Maintain streaming telemetry pipelines handling over 10 million events per second in Apache Flink.",
          "Collaborate with fraud detection algorithms to catch abusive bot checkout attacks in under 50ms.",
          "Reduce operational compute and storage costs on on-premise and hybrid cloud clusters."
        ],
        requirements: [
          "4+ years building petabyte-scale distributed data pipelines.",
          "Solid programming skills in Scala or Java, with deep knowledge of Kafka and Spark."
        ],
        benefits: ["Walmart Global Equity program", "Comprehensive Family Medical Plan", "Flexible work schedule", "Learning and certification sponsorships"],
        official_url: "https://www.flipkartcareers.com"
      },
      {
        company: "Adobe",
        title: "Computer Vision & Generative AI Engineer - Firefly Studio",
        category: "Engineering",
        work_mode: "Hybrid",
        job_type: "Full-time",
        location: "Noida, IN",
        salary: "₹36 - 50 LPA",
        salary_value: 50,
        logo_bg: "bg-red-50 text-red-600 border-red-200",
        initials: "ADB",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><path fill="#FA0F00" d="M14.5 2.5H22V22h-5.5l-4-9.5-2 4.5zM2 2.5h7.5l5 12.5-2 4.5H2z"/></svg>',
        skills: ["Python", "C++", "PyTorch", "Diffusion Models", "Computer Vision"],
        description: "Join the Adobe Firefly and Creative Cloud research group to build commercially safe generative AI image, vector, and video synthesis tools embedded in Photoshop and Illustrator.",
        responsibilities: [
          "Research and optimize latent diffusion models for interactive vector and high-resolution rendering.",
          "Deploy high-speed C++ / TensorRT inference engines on cloud and local Apple Silicon chips.",
          "Publish cutting-edge papers and file patents in top computer vision venues (CVPR, ICCV, SIGGRAPH)."
        ],
        requirements: [
          "Master's or PhD in Computer Science, Machine Learning, or equivalent industry experience.",
          "Hands-on experience training diffusion models or neural rendering networks in PyTorch."
        ],
        benefits: ["Full Creative Cloud All-Apps subscription", "Adobe RSUs & ESPP", "Sabbatical leave every 5 years", "Executive mentorship program"],
        official_url: "https://www.adobe.com/careers"
      },
      {
        company: "Tata Consultancy Services (TCS)",
        title: "Lead Cloud Solutions Architect - Enterprise Cloud Transformation",
        category: "Engineering",
        work_mode: "Hybrid",
        job_type: "Full-time",
        location: "Mumbai, IN",
        salary: "₹24 - 36 LPA",
        salary_value: 36,
        logo_bg: "bg-blue-50 text-blue-800 border-blue-200",
        initials: "TCS",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#003366"/><text x="12" y="16" fill="#FFF" font-family="sans-serif" font-weight="900" font-size="10" text-anchor="middle">TCS</text></svg>',
        skills: ["AWS", "Azure", "Terraform", "Enterprise Architecture", "DevOps"],
        description: "Guide Fortune 500 banking, retail, and healthcare enterprises through large-scale cloud modernization, hybrid cloud architecture, and multi-region microservice deployments.",
        responsibilities: [
          "Architect resilient, compliant hybrid cloud landing zones meeting RBI and GDPR regulatory standards.",
          "Direct enterprise migration waves from legacy on-premise mainframes to cloud-native stacks.",
          "Lead technical presentations and RFPs for multinational client executive stakeholders."
        ],
        requirements: [
          "8+ years of enterprise architecture and cloud engineering experience.",
          "Certified AWS Solutions Architect Professional or Azure Solutions Architect Expert."
        ],
        benefits: ["Tata Group Corporate Perks & Discounts", "Comprehensive Family Medical Cover", "Retirement EPF & Gratuity Benefits", "Global Onsite Client Exposure"],
        official_url: "https://www.tcs.com/careers"
      },
      {
        company: "CRED",
        title: "Staff Backend Engineer - High-Throughput Fintech Ledger",
        category: "Engineering",
        work_mode: "On-site",
        job_type: "Full-time",
        location: "Bangalore, IN",
        salary: "₹45 - 65 LPA",
        salary_value: 65,
        logo_bg: "bg-slate-900 text-white border-slate-700",
        initials: "CRD",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#1A1A1A"/><path fill="#FFF" d="M7 6h7a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H7V6zm3 3v6h4a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-4z"/></svg>',
        skills: ["Golang", "Kafka", "PostgreSQL", "Fintech Systems", "Microservices"],
        description: "Architect CRED double-entry financial ledger and instant rewards engine processing tens of thousands of credit card and UPI transactions per second.",
        responsibilities: [
          "Scale idempotent transactional settlement systems with zero financial discrepancy.",
          "Optimize high-concurrency microservices in Go and distributed locking in Redis.",
          "Mentor senior engineers and drive rigorous design documentation."
        ],
        requirements: [
          "5+ years backend software development in high-throughput transactional environments.",
          "Deep mastery of database ACID properties, distributed transactions, and message brokers."
        ],
        benefits: ["High-value CRED ESOPs", "Top-tier comprehensive health insurance", "Catered gourmet meals", "Latest Apple hardware equipment"],
        official_url: "https://careers.cred.club"
      },
      {
        company: "Goldman Sachs",
        title: "Vice President - Quantitative High-Frequency Trading Systems",
        category: "Engineering",
        work_mode: "Hybrid",
        job_type: "Full-time",
        location: "Bangalore / Mumbai, IN",
        salary: "₹55 - 75 LPA",
        salary_value: 75,
        logo_bg: "bg-blue-900 text-white border-blue-950",
        initials: "GS",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#7399C6"/><text x="12" y="16" fill="#FFF" font-family="sans-serif" font-weight="900" font-size="10" text-anchor="middle">GS</text></svg>',
        skills: ["C++", "Low Latency", "Algorithms", "Linux Kernel", "Financial Markets"],
        description: "Engineer ultra-low latency algorithmic trading execution gateways and real-time market data dissemination systems connecting directly to global stock exchanges.",
        responsibilities: [
          "Optimize network socket layers, kernel bypass (Solarflare OpenOnload), and CPU cache lines.",
          "Collaborate with quantitative researchers to backtest and deploy automated statistical arbitrage models.",
          "Ensure ultra-resilient risk controls and pre-trade limit checks."
        ],
        requirements: [
          "6+ years of specialized low-latency C++ engineering in algorithmic trading, fintech, or gaming.",
          "Solid mathematical reasoning and deep understanding of operating systems internals."
        ],
        benefits: ["Significant Performance-Linked Discretionary Bonus", "Comprehensive Family Medical Plan", "Global Career Mobility Program", "Retirement Benefits & Wellness Allowances"],
        official_url: "https://www.goldmansachs.com/careers"
      },
      {
        company: "PhonePe",
        title: "Senior Staff Engineer - Core UPI Payment Switch",
        category: "Engineering",
        work_mode: "On-site",
        job_type: "Full-time",
        location: "Bangalore, IN",
        salary: "₹48 - 65 LPA",
        salary_value: 65,
        logo_bg: "bg-purple-50 text-purple-700 border-purple-200",
        initials: "PHN",
        logo_svg: '<svg class="w-6 h-6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#5F259F"/><path fill="#FFF" d="M11 6h3a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-3v4H8V6h3zm0 3v2h3a1 1 0 0 0 1-1 1 1 0 0 0-1-1h-3z"/></svg>',
        skills: ["Java", "HBase", "Aerospike", "UPI Protocols", "Distributed Systems"],
        description: "Scale India's largest digital payments infrastructure processing over 45% of all national UPI transactions with 99.999% uptime during festive peak volumes.",
        responsibilities: [
          "Architect low-latency distributed payment switches handling over 15,000 TPS.",
          "Optimize real-time fraud risk models in under 40 milliseconds per transaction.",
          "Liaise with NPCI and partner bank technology teams on UPI 2.0 specifications."
        ],
        requirements: [
          "6+ years architecting high-scale distributed transaction processing backends in Java or Kotlin.",
          "Deep understanding of distributed consensus, message queues, and NoSQL stores."
        ],
        benefits: ["Substantial PhonePe Stock Options", "Family Health and Parental Insurance", "Free Catered Meals & Snacks", "Annual Learning Grants"],
        official_url: "https://www.phonepe.com/careers"
      }
    ]

    stmt = db.prepare(
      "INSERT INTO jobs (company, title, category, work_mode, job_type, location, salary, salary_value, logo_bg, initials, logo_svg, skills, description, responsibilities, requirements, benefits, official_url, posted_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )

    real_companies_catalog.each do |j|
      stmt.execute(
        j[:company],
        j[:title],
        j[:category],
        j[:work_mode],
        j[:job_type],
        j[:location],
        j[:salary],
        j[:salary_value],
        j[:logo_bg],
        j[:initials],
        j[:logo_svg],
        j[:skills].to_json,
        j[:description],
        j[:responsibilities].to_json,
        j[:requirements].to_json,
        j[:benefits].to_json,
        j[:official_url],
        Time.now.utc.iso8601
      )
    end
    stmt.close
  end
end

if __FILE__ == $0
  Database.init!
end
