// HomeFixr Chatbot Knowledge Base
// ~65 entries covering Customer, Provider, and Admin workflows

export type KBRole = "customer" | "provider" | "admin" | "all";

export interface KBEntry {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
  role: KBRole;
  followUps?: string[];
}

export const knowledgeBase: KBEntry[] = [
  // ─── GENERAL ────────────────────────────────────────────────────────────────
  {
    id: "what_is_homefixr",
    keywords: ["what", "homefixr", "about", "platform", "service", "site", "app"],
    question: "What is HomeFixr?",
    role: "all",
    answer:
      "**HomeFixr** is an AI-powered home services marketplace that connects homeowners with verified service providers through a transparent bidding system.\n\n✅ Post a job in under a minute\n✅ Get AI-suggested fair pricing\n✅ Receive competitive bids from verified pros\n✅ Built-in chat, payments & reviews\n\nHomeFixr covers 12 service categories including Plumbing, Electrical, Carpentry, Cleaning, AC Repair, and more.",
    followUps: ["how_signup_customer", "how_signup_provider", "service_categories"],
  },
  {
    id: "service_categories",
    keywords: ["categories", "services", "types", "category", "which services", "available services", "what services"],
    question: "What service categories are available?",
    role: "all",
    answer:
      "HomeFixr supports **12 service categories**:\n\n1. 🔧 Plumbing\n2. ⚡ Electrical\n3. 🌿 Gardening\n4. 🪚 Carpenter\n5. 🖌️ Painter\n6. 🧹 Cleaning\n7. ❄️ AC Technician\n8. 🧱 Mason\n9. 🏠 Home Maintenance\n10. 🔌 Appliance Repair\n11. 🐛 Pest Control\n12. 🛠️ Other Services\n\nWhen posting a job, simply select the category that best matches your need.",
    followUps: ["how_post_job", "ai_price_suggestion"],
  },

  // ─── CUSTOMER ────────────────────────────────────────────────────────────────
  {
    id: "how_signup_customer",
    keywords: ["signup", "sign up", "register", "create account", "join", "new account", "customer", "homeowner"],
    question: "How do I sign up as a customer?",
    role: "customer",
    answer:
      "Signing up as a homeowner is free and takes under a minute:\n\n1. Click **'Post your first job'** or **'Get started free'** on the homepage\n2. Choose **'Sign Up'** and fill in your name, email, and password\n3. Select **Homeowner** as your role\n4. You're in! Start posting jobs right away.\n\n📍 Go to: **/auth?mode=signup**",
    followUps: ["how_post_job", "ai_price_suggestion"],
  },
  {
    id: "how_post_job",
    keywords: ["post job", "create job", "new job", "add job", "submit job", "request service", "hire", "how to post"],
    question: "How do I post a job?",
    role: "customer",
    answer:
      "Posting a job takes just a few steps:\n\n1. Log in as a homeowner and go to your **Dashboard**\n2. Click **'Post a Job'** (or navigate to **/jobs/new**)\n3. Fill in:\n   - 📌 Category (e.g. Plumbing)\n   - 📝 Job title & description\n   - 📍 Address / location\n   - 📅 Preferred date & time\n   - 💰 Your budget\n4. Optionally, upload photos 📸 to help providers understand the work\n5. Hit **✨ Get AI Price Suggestion** for a fair price estimate\n6. Click **Post Job** — providers will start bidding soon!",
    followUps: ["ai_price_suggestion", "how_bids_work", "job_statuses"],
  },
  {
    id: "ai_price_suggestion",
    keywords: ["ai price", "price suggestion", "fair price", "groq", "suggested price", "ai pricing", "how much", "cost", "estimate"],
    question: "How does AI price suggestion work?",
    role: "customer",
    answer:
      "HomeFixr uses **Groq-powered AI** to give you a fair price range the moment you describe your job.\n\n1. On the job creation page, fill in your job title and description\n2. Click the **✨ AI Fair Price** button\n3. The AI returns a min–max range (e.g. *PKR 2,500 – 4,500*) based on labor and typical parts costs\n4. You can accept this as your budget or enter your own\n\n💡 This helps you avoid overpaying and helps providers bid competitively.",
    followUps: ["how_post_job", "how_bids_work"],
  },
  {
    id: "how_bids_work",
    keywords: ["bid", "bids", "bidding", "provider bid", "accept bid", "compare bid", "how bids", "offers"],
    question: "How does the bidding system work?",
    role: "customer",
    answer:
      "HomeFixr uses a **transparent bidding system**:\n\n1. After you post a job, nearby verified providers receive a notification\n2. Providers submit bids with their hourly/flat rate and availability\n3. You can view all bids on your job page — see each provider's ⭐ rating, rate, and verified status\n4. **Compare bids** side by side\n5. Click **Accept Bid** on the one you prefer\n6. The provider is notified and the job moves to *In Progress* ✅\n\nYou can message the provider directly once a bid is accepted.",
    followUps: ["messaging_customer", "job_statuses", "how_payments_work"],
  },
  {
    id: "job_statuses",
    keywords: ["job status", "status", "open", "in progress", "completed", "paid", "job stages", "what does status mean"],
    question: "What are the different job statuses?",
    role: "customer",
    answer:
      "A job moves through these statuses:\n\n| Status | Meaning |\n|---|---|\n| **Open** | Job posted, accepting bids |\n| **Bidding** | Bids received, awaiting your selection |\n| **In Progress** | Bid accepted, provider is working |\n| **Completed** | Work finished, payment pending |\n| **Paid** | Payment released, can leave review |\n| **Cancelled** | Job was cancelled |\n\n📍 You can track all your jobs from the **Dashboard**.",
    followUps: ["how_payments_work", "how_reviews_work"],
  },
  {
    id: "messaging_customer",
    keywords: ["message", "chat", "contact", "talk", "communicate", "messaging", "inbox"],
    question: "How do I message my provider?",
    role: "customer",
    answer:
      "Once you accept a provider's bid, a **built-in chat** opens automatically:\n\n1. Go to **Dashboard → My Jobs**\n2. Open the job and click the **💬 Message** button\n3. Chat directly with your provider — no phone numbers needed!\n\nAll messages are stored securely on the platform.",
    followUps: ["how_bids_work", "job_statuses"],
  },
  {
    id: "how_payments_work",
    keywords: ["payment", "pay", "money", "escrow", "release", "refund", "charge", "fee", "how to pay"],
    question: "How do payments work?",
    role: "customer",
    answer:
      "HomeFixr uses a **secure escrow system**:\n\n1. 💳 You pay when accepting a bid — funds are held in **escrow** (not released to provider yet)\n2. Once the job is marked as **Completed**, funds are released to the provider\n3. If there's a dispute, contact support before releasing payment\n\n🔒 Your payment is protected until you confirm the work is done.\n\nPayment methods supported include Stripe and PayPal (based on admin configuration).",
    followUps: ["job_statuses", "how_reviews_work"],
  },
  {
    id: "how_reviews_work",
    keywords: ["review", "rating", "star", "feedback", "rate", "leave review", "how to review"],
    question: "How do I leave a review?",
    role: "customer",
    answer:
      "After a job is marked **Completed**:\n\n1. Go to **Dashboard → My Jobs**\n2. Open the completed job\n3. Click **Leave a Review**\n4. Give a ⭐ rating (1–5 stars) and write your feedback\n5. Submit — your review immediately appears on the provider's profile\n\n✅ Reviews help build trust and help other homeowners make better choices.",
    followUps: ["how_bids_work", "browse_providers"],
  },
  {
    id: "browse_providers",
    keywords: ["browse", "find provider", "search provider", "view providers", "provider list", "available providers"],
    question: "How do I browse service providers?",
    role: "customer",
    answer:
      "You can browse providers directly:\n\n1. Visit the **Browse** section or go to **/browse**\n2. View provider profiles including:\n   - ⭐ Average star rating & review count\n   - 💼 Service categories they offer\n   - 💰 Hourly rate\n   - ✅ Verified badge (ID verified by admin)\n   - 📋 Bio and years of experience\n3. Click a provider card to view their full profile at **/providers/:id**\n\nYou can also see provider bids on your open jobs.",
    followUps: ["how_bids_work", "how_reviews_work"],
  },
  {
    id: "upload_photos_job",
    keywords: ["photo", "image", "picture", "upload", "attach", "file"],
    question: "Can I upload photos when posting a job?",
    role: "customer",
    answer:
      "Yes! When creating a job at **/jobs/new**:\n\n1. Scroll down to the **Photos** section\n2. Click **Upload Photos** or drag and drop images\n3. Up to multiple photos can be attached\n4. Photos help providers understand the scope of work and give more accurate bids\n\n📸 Supported formats: JPG, PNG, WEBP",
    followUps: ["how_post_job", "ai_price_suggestion"],
  },
  {
    id: "cancel_job",
    keywords: ["cancel", "delete job", "remove job", "withdraw job"],
    question: "Can I cancel a job?",
    role: "customer",
    answer:
      "Yes, you can cancel a job **before a bid is accepted**:\n\n- Go to Dashboard → My Jobs\n- Open the job and click **Cancel Job**\n\n⚠️ If a bid has already been accepted and payment is in escrow, cancellation may be subject to the platform's refund policy. Contact support for assistance.",
    followUps: ["how_payments_work", "job_statuses"],
  },

  // ─── PROVIDER ───────────────────────────────────────────────────────────────
  {
    id: "how_signup_provider",
    keywords: ["signup provider", "join provider", "register provider", "become provider", "professional", "join as professional"],
    question: "How do I sign up as a service provider?",
    role: "provider",
    answer:
      "Joining as a provider is free:\n\n1. Go to the homepage and click **'Join as a professional'**\n2. Choose **Sign Up** and select **Service Provider** as your role\n3. Fill in your name, email, and password\n4. After signing up, go to your **Provider Profile** at **/provider** to complete setup\n\n📍 You must complete ID verification before you can receive job broadcasts.",
    followUps: ["provider_profile_setup", "provider_verification"],
  },
  {
    id: "provider_profile_setup",
    keywords: ["profile", "setup", "bio", "hourly rate", "experience", "categories", "availability", "edit profile"],
    question: "How do I set up my provider profile?",
    role: "provider",
    answer:
      "Go to **/provider** to set up your profile:\n\n1. **Profile Picture** — click the camera icon to upload a photo\n2. **Bio** — describe your skills and specialties\n3. **Service Categories** — tick all the services you offer (up to all 12 categories)\n4. **Hourly Rate** — set your hourly rate in PKR\n5. **Years of Experience** — helps customers trust you\n6. **Availability Toggle** — turn on/off to control if you appear in job broadcasts\n7. Click **Save Profile**\n\n✅ A complete profile gets more bids accepted!",
    followUps: ["provider_verification", "how_to_bid"],
  },
  {
    id: "provider_verification",
    keywords: ["verify", "verification", "id", "cnic", "document", "license", "passport", "government id", "verified badge"],
    question: "How does provider verification work?",
    role: "provider",
    answer:
      "Verification is required to receive job broadcasts and build trust with customers.\n\n**Steps:**\n1. Go to **/provider** and click the **Verification** tab\n2. Fill in your full name and document type:\n   - CNIC Front\n   - CNIC Back\n   - Passport\n   - Driving License\n   - Other Government ID\n3. Upload your ID document(s)\n4. Click **Submit Verification**\n\n**Verification Statuses:**\n- ⏳ **Pending** — under review by admin\n- ✅ **Verified** — ID confirmed, you can now receive all job broadcasts\n- ❌ **Rejected** — see admin notes and resubmit\n\nAI-assisted review speeds up the process.",
    followUps: ["provider_verification_status", "how_to_bid"],
  },
  {
    id: "provider_verification_status",
    keywords: ["verification status", "pending", "rejected", "why rejected", "how long verification"],
    question: "Why was my verification rejected?",
    role: "provider",
    answer:
      "If your verification was **Rejected**:\n\n1. Go to **/provider** → **Verification** tab\n2. Check the **Admin Notes** field — it will explain the reason (e.g. blurry image, name mismatch)\n3. Re-upload a clearer document and resubmit\n\n**Common rejection reasons:**\n- Document image is blurry or too dark\n- Name on document doesn't match profile name\n- Wrong document type uploaded\n\n⏰ Verification usually takes 24–48 hours after submission.",
    followUps: ["provider_verification", "provider_profile_setup"],
  },
  {
    id: "how_to_bid",
    keywords: ["place bid", "submit bid", "bid on job", "how to bid", "apply job", "job application"],
    question: "How do I bid on a job?",
    role: "provider",
    answer:
      "To bid on available jobs:\n\n1. Go to your **Dashboard** — you'll see **Open Jobs** available in your categories\n2. Click on a job to view details\n3. Click **Place Bid** and enter your price\n4. Alternatively, when you receive a **Job Broadcast** (a notification about a new job):\n   - **Accept** at the suggested price\n   - **Customize Price** to enter your own amount\n   - **Reject** if you're not interested\n\n📍 Your bids are tracked in the **Applied Jobs** tab at **/provider** → Jobs tab.",
    followUps: ["job_broadcasts", "applied_jobs_tab", "provider_availability"],
  },
  {
    id: "job_broadcasts",
    keywords: ["broadcast", "job notification", "alert", "new job", "incoming job", "notification"],
    question: "What are job broadcasts?",
    role: "provider",
    answer:
      "**Job Broadcasts** are real-time notifications sent to you when a customer posts a new job that matches your service categories.\n\nWhen a broadcast arrives on your Dashboard:\n- **Accept** — bid at the suggested budget price\n- **Customize Price** — enter your own bid amount\n- **Reject** — decline this job\n\n⚡ Broadcasts refresh every 5 seconds so you don't miss new jobs.\n\n✅ You must be **Verified** and have **Availability turned ON** to receive broadcasts.",
    followUps: ["how_to_bid", "provider_availability", "provider_verification"],
  },
  {
    id: "applied_jobs_tab",
    keywords: ["applied jobs", "my bids", "bid history", "bid status", "applied"],
    question: "Where can I see all my bids?",
    role: "provider",
    answer:
      "Go to **/provider** and click the **Jobs** tab.\n\nYou'll see all jobs you've applied to, including:\n- Job title and category\n- Your bid amount\n- Bid status: **Pending**, **Accepted**, **Rejected**\n- Homeowner name\n- Date applied\n\n🟢 **Accepted bids** mean the customer has chosen you — check messages for next steps!",
    followUps: ["messaging_provider", "how_to_bid"],
  },
  {
    id: "provider_availability",
    keywords: ["availability", "available", "toggle", "offline", "busy", "active", "pause"],
    question: "How do I set my availability?",
    role: "provider",
    answer:
      "On your Provider Profile page (**/provider**):\n\n1. Look for the **Availability** toggle switch\n2. **ON** (green) — you're available and will receive job broadcasts\n3. **OFF** (grey) — you're paused and won't receive new job notifications\n\n💡 Toggle off when you're busy or on holiday so customers aren't kept waiting.",
    followUps: ["job_broadcasts", "provider_profile_setup"],
  },
  {
    id: "messaging_provider",
    keywords: ["message customer", "chat", "talk", "contact customer", "inbox"],
    question: "How do I message a customer?",
    role: "provider",
    answer:
      "Once your bid is accepted by a customer:\n\n1. Go to your **Dashboard**\n2. Open the job where your bid was accepted\n3. Click **💬 Message Customer**\n4. Chat in real-time — built-in messaging, no external apps needed!\n\nUse this to confirm arrival time, ask for more details, or send updates.",
    followUps: ["how_to_bid", "applied_jobs_tab"],
  },
  {
    id: "provider_ratings",
    keywords: ["rating", "review", "star", "reputation", "feedback", "my rating"],
    question: "How are provider ratings calculated?",
    role: "provider",
    answer:
      "Your **Star Rating** is the average of all reviews left by customers after completed jobs.\n\n- Rating scale: ⭐ 1 to 5 stars\n- Your overall average is shown on your public profile and in bid listings\n- Higher ratings = more customers choosing your bids!\n\n💡 Tips to get better ratings:\n- Communicate clearly via the built-in chat\n- Arrive on time\n- Do quality work\n- Be professional and polite",
    followUps: ["messaging_provider", "provider_profile_setup"],
  },
  {
    id: "provider_profile_picture",
    keywords: ["profile picture", "photo", "avatar", "upload photo", "change picture"],
    question: "How do I upload a profile picture?",
    role: "provider",
    answer:
      "On the **Provider Profile** page (**/provider**):\n\n1. Find the circular avatar at the top of the profile section\n2. Click the **📷 Camera icon** that appears on hover\n3. Select a photo from your device\n4. Your profile picture uploads automatically\n\n✅ A clear, professional photo builds trust with customers.",
    followUps: ["provider_profile_setup", "provider_verification"],
  },

  // ─── ADMIN PANEL ────────────────────────────────────────────────────────────
  {
    id: "admin_login",
    keywords: ["admin login", "admin access", "admin panel", "how to access admin"],
    question: "How do I access the Admin Panel?",
    role: "admin",
    answer:
      "The Admin Panel is at **/admin/login**.\n\n1. Enter your admin email and password\n2. You must have the **Admin** role assigned to your account\n3. After login, you'll be redirected to **/admin/users** (Customers dashboard)\n\n🔐 The admin panel is completely separate from the main homeowner/provider interface.",
    followUps: ["admin_customers", "admin_providers", "admin_settings"],
  },
  {
    id: "admin_customers",
    keywords: ["customers", "users", "homeowners", "manage users", "user list", "admin users"],
    question: "How do I manage customers in the Admin Panel?",
    role: "admin",
    answer:
      "Go to **Admin → Customers** (**/admin/users**):\n\n- 🔍 **Search** by name or email\n- 🎛️ **Filter** by role (Homeowner / Provider / All)\n- 📋 View each user's: name, email, phone, join date, job count, bid count\n- 🚫 **Suspend** a user — removes their access\n- 🗑️ **Delete** a user — permanently removes the account\n\n⚠️ Deletion is permanent and cannot be undone.",
    followUps: ["admin_providers", "admin_jobs"],
  },
  {
    id: "admin_providers",
    keywords: ["providers", "manage providers", "provider list", "admin providers", "provider management"],
    question: "How do I manage providers in the Admin Panel?",
    role: "admin",
    answer:
      "Go to **Admin → Providers** (**/admin/providers**):\n\n- 🔍 Search by name or email\n- 🎛️ Filter by verification status (All / Pending / Verified / Rejected)\n- 📋 View: name, email, hourly rate, rating, review count, completed jobs\n- ✅ **Verify** a provider — approve their ID and grant verified status\n- ❌ **Reject** a provider — requires a rejection reason note\n- 🚫 **Suspend** a provider — removes their access",
    followUps: ["admin_verifications", "admin_customers"],
  },
  {
    id: "admin_jobs",
    keywords: ["admin jobs", "manage jobs", "job list", "all jobs", "jobs overview"],
    question: "How do I manage jobs in the Admin Panel?",
    role: "admin",
    answer:
      "Go to **Admin → Jobs** (**/admin/jobs**):\n\n- View **all jobs** posted on the platform\n- Filter by status, category, or date\n- See: job title, homeowner name, category, bid count, current status\n- Admin can view job details and monitor the marketplace\n\n📊 Useful for spotting fake or abusive listings.",
    followUps: ["admin_bids", "admin_customers"],
  },
  {
    id: "admin_bids",
    keywords: ["admin bids", "manage bids", "bids list", "all bids", "bid overview"],
    question: "How do I view bids in the Admin Panel?",
    role: "admin",
    answer:
      "Go to **Admin → Bids** (**/admin/bids**):\n\n- View all bids submitted across the entire platform\n- See: provider name, customer name, job title, bid amount, bid status\n- Filter and search by various criteria\n- Monitor for suspicious bidding patterns\n\n📋 Bid statuses: Pending, Accepted, Rejected.",
    followUps: ["admin_payments", "admin_providers"],
  },
  {
    id: "admin_payments",
    keywords: ["admin payments", "payment management", "refund", "escrow", "revenue", "transactions"],
    question: "How do I manage payments in the Admin Panel?",
    role: "admin",
    answer:
      "Go to **Admin → Payments** (**/admin/payments**):\n\n**Tabs available:**\n- 💳 **Payments** — full transaction list with status filters\n- 🔒 **Escrow** — jobs with funds currently held in escrow\n- 📈 **Revenue** — platform revenue breakdown\n\n**Actions:**\n- 🔄 **Refund** a payment if there's a dispute\n- View payment details: amount, job, homeowner, provider, date\n\n💰 Payment statuses: Pending, Completed, Refunded.",
    followUps: ["admin_jobs", "admin_settings"],
  },
  {
    id: "admin_categories",
    keywords: ["categories", "admin categories", "manage categories", "add category", "service types"],
    question: "How do I manage service categories?",
    role: "admin",
    answer:
      "Go to **Admin → Categories** (**/admin/categories**):\n\n- ➕ **Add** new service categories\n- ✏️ **Edit** existing category names\n- 🗑️ **Delete** categories that are no longer needed\n\nChanges here affect which categories customers and providers can select across the platform.",
    followUps: ["admin_providers", "admin_jobs"],
  },
  {
    id: "admin_reviews",
    keywords: ["reviews", "admin reviews", "moderate reviews", "review management"],
    question: "How do I manage reviews in the Admin Panel?",
    role: "admin",
    answer:
      "Go to **Admin → Reviews** (**/admin/reviews**):\n\n- View all reviews posted on the platform\n- See: reviewer name, provider name, star rating, review text, date\n- Search and filter reviews\n- Moderate/remove inappropriate reviews\n\n⭐ Reviews directly affect provider reputation scores.",
    followUps: ["admin_providers", "admin_reports"],
  },
  {
    id: "admin_reports",
    keywords: ["reports", "analytics", "statistics", "stats", "dashboard stats", "platform metrics"],
    question: "Where can I see platform analytics?",
    role: "admin",
    answer:
      "Go to **Admin → Reports** (**/admin/reports**):\n\n- 📊 Total users, providers, jobs, bids\n- 💰 Revenue metrics\n- 📈 Job completion rates\n- ⭐ Average platform rating\n- 📅 Date-range filters for trend analysis\n\nThis is your platform health dashboard.",
    followUps: ["admin_payments", "admin_customers"],
  },
  {
    id: "admin_notifications",
    keywords: ["notifications", "admin notifications", "send notification", "broadcast notification"],
    question: "How do I send platform notifications?",
    role: "admin",
    answer:
      "Go to **Admin → Notifications** (**/admin/notifications**):\n\n- ✉️ Send **platform-wide notifications** to all users\n- Target specific roles: Homeowners, Providers, or All Users\n- Write notification title and message\n- Notifications appear in users' notification feeds\n\n📢 Great for announcing new features, maintenance windows, or promotions.",
    followUps: ["admin_settings", "admin_customers"],
  },
  {
    id: "admin_verifications",
    keywords: ["ai verification", "verify provider", "id verification", "review documents", "approve provider"],
    question: "How does AI Verification work in the Admin Panel?",
    role: "admin",
    answer:
      "Go to **Admin → AI Verification** (**/admin/verifications**):\n\n- View all **pending provider verification requests**\n- See submitted documents (CNIC, Passport, License, etc.)\n- View the ID document image directly in the panel\n- Filter by status: Pending / Verified / Rejected\n\n**Actions:**\n- ✅ **Approve** — grants the provider a Verified badge\n- ❌ **Reject** — requires admin to enter rejection notes that appear on the provider's profile\n\n🤖 AI assists with document analysis to speed up the review process.",
    followUps: ["admin_providers", "admin_settings"],
  },
  {
    id: "admin_admins",
    keywords: ["admin accounts", "manage admins", "add admin", "admin list", "super admin"],
    question: "How do I manage admin accounts?",
    role: "admin",
    answer:
      "Go to **Admin → Admins** (**/admin/admins**):\n\n- View all administrator accounts\n- Add new admin accounts (name, email, password)\n- Manage existing admin access\n\n⚠️ Only existing admins can create new admin accounts. Keep this list restricted.",
    followUps: ["admin_settings", "admin_login"],
  },
  {
    id: "admin_settings",
    keywords: ["settings", "admin settings", "configuration", "site settings", "platform settings"],
    question: "What can I configure in Admin Settings?",
    role: "admin",
    answer:
      "Go to **Admin → Settings** (**/admin/settings**):\n\n**General Settings:**\n- Site name & description\n- Maintenance mode toggle (takes site offline for users)\n\n**AI Features:**\n- ✅ AI Pricing enabled/disabled\n- ✅ AI Verification enabled/disabled\n\n**Payment Settings:**\n- Payment escrow on/off\n- Stripe public key & secret key\n- PayPal client ID & secret\n\n**Email (SMTP) Settings:**\n- SMTP host, port, user, password, from-address\n\n**Security:**\n- JWT Secret key\n\n⚠️ Keep secret keys secure — never share them publicly.",
    followUps: ["admin_payments", "admin_notifications"],
  },
  {
    id: "admin_profile",
    keywords: ["admin profile", "my profile", "update profile", "change name", "change email"],
    question: "How do I update my admin profile?",
    role: "admin",
    answer:
      "Go to **Admin → Profile** (**/admin/profile**):\n\n- Update your admin name\n- Update your email address\n- Change your password\n\nKeep your admin credentials secure and change your password periodically.",
    followUps: ["admin_settings", "admin_login"],
  },

  // ─── SHARED / COMMON ────────────────────────────────────────────────────────
  {
    id: "forgot_password",
    keywords: ["forgot password", "reset password", "lost password", "cant login", "can't login"],
    question: "I forgot my password. How do I reset it?",
    role: "all",
    answer:
      "On the login page (**/auth?mode=login**):\n\n1. Click **'Forgot Password?'**\n2. Enter your registered email address\n3. Check your inbox for a reset link\n4. Follow the link to set a new password\n\n📧 If you don't receive the email within a few minutes, check your spam folder.",
    followUps: ["how_signup_customer", "how_signup_provider"],
  },
  {
    id: "contact_support",
    keywords: ["support", "help", "contact", "issue", "problem", "complaint"],
    question: "How do I contact support?",
    role: "all",
    answer:
      "For help with HomeFixr:\n\n📧 **Email:** support@homefixr.com\n\nWhen contacting support, please include:\n- Your registered email address\n- Description of the issue\n- Any relevant job or payment IDs\n\nOur team typically responds within 24 hours.",
    followUps: ["forgot_password", "how_payments_work"],
  },
  {
    id: "account_suspended",
    keywords: ["account suspended", "suspended", "banned", "locked out", "access denied"],
    question: "My account has been suspended. What do I do?",
    role: "all",
    answer:
      "If your account is suspended:\n\n1. You'll see a suspension notice when trying to log in\n2. Contact **support@homefixr.com** with your email address\n3. Provide any relevant context — our team will review your account\n\n⚠️ Accounts are suspended for violations of HomeFixr's Terms of Service.",
    followUps: ["contact_support"],
  },
  {
    id: "is_homefixr_free",
    keywords: ["free", "cost", "price", "fee", "charge", "how much does it cost", "free to join"],
    question: "Is HomeFixr free to use?",
    role: "all",
    answer:
      "**For Customers (Homeowners):** ✅ Completely free to sign up and post jobs. You only pay providers for the service itself.\n\n**For Providers:** ✅ Free to register and bid on jobs. A platform service fee may apply on completed payments (configured by admin).\n\n**AI Features:** ✅ AI price suggestions are free for customers.",
    followUps: ["how_signup_customer", "how_signup_provider", "how_payments_work"],
  },
  {
    id: "verified_provider_badge",
    keywords: ["verified badge", "shield", "trust", "trusted provider", "verified professional"],
    question: "What does the verified badge mean?",
    role: "all",
    answer:
      "The **✅ Verified Badge** (green shield icon) on a provider's profile means:\n\n- Their government ID has been reviewed and confirmed by HomeFixr admin\n- The AI verification system has validated their document authenticity\n- They are a real, identity-verified professional\n\n💡 Always prefer verified providers for safer, more reliable service.",
    followUps: ["provider_verification", "browse_providers"],
  },
  {
    id: "multiple_bids",
    keywords: ["multiple providers", "how many bids", "compare providers", "choose best"],
    question: "Can multiple providers bid on my job?",
    role: "customer",
    answer:
      "Yes! Multiple verified providers can bid on your job simultaneously.\n\nOn your job page you'll see a **Bids** list showing:\n- Provider name and ✅ verified status\n- ⭐ Rating and review count\n- 💰 Bid amount\n- Availability\n\nYou can compare all bids and pick the best value. There's no rush — take your time reviewing.",
    followUps: ["how_bids_work", "browse_providers", "messaging_customer"],
  },
  {
    id: "provider_categories_selection",
    keywords: ["select categories", "multiple categories", "can i offer multiple", "categories provider"],
    question: "Can I offer multiple service categories as a provider?",
    role: "provider",
    answer:
      "Absolutely! During profile setup at **/provider**:\n\n1. Under **Service Categories**, you'll see all 12 available categories\n2. Check/tick **as many as you offer** — there's no limit\n3. You'll receive job broadcasts for **all your selected categories**\n\n💡 Adding more relevant categories means more job opportunities!",
    followUps: ["provider_profile_setup", "job_broadcasts"],
  },
  {
    id: "job_estimated_time",
    keywords: ["hours", "days", "estimated hours", "estimated days", "job duration", "time estimate"],
    question: "What are estimated hours and days when posting a job?",
    role: "customer",
    answer:
      "When posting a job, you can optionally specify:\n\n- **Estimated Hours** — expected hours of work in a single day\n- **Estimated Days** — if the job spans multiple days\n\nThese help the AI price suggestion calculate a more accurate budget estimate, and give providers better context for their bids.",
    followUps: ["ai_price_suggestion", "how_post_job"],
  },
];

// ─── HELPER: Keyword Scorer ──────────────────────────────────────────────────

/**
 * Score a KB entry against a user query.
 * Returns a numeric score — higher = better match.
 */
export function scoreEntry(entry: KBEntry, query: string): number {
  const q = query.toLowerCase();
  let score = 0;

  for (const keyword of entry.keywords) {
    const kw = keyword.toLowerCase();
    if (q.includes(kw)) {
      // Longer keyword matches score more (more specific)
      score += kw.split(" ").length * 2;
    } else {
      // Partial word match
      const words = kw.split(" ");
      for (const word of words) {
        if (word.length > 3 && q.includes(word)) {
          score += 1;
        }
      }
    }
  }

  return score;
}

/**
 * Find the best matching KB entry for a given query.
 * Returns null if no good match found (score < threshold).
 */
export function findBestMatch(query: string, minScore = 1): KBEntry | null {
  let best: KBEntry | null = null;
  let bestScore = 0;

  for (const entry of knowledgeBase) {
    const s = scoreEntry(entry, query);
    if (s > bestScore) {
      bestScore = s;
      best = entry;
    }
  }

  return bestScore >= minScore ? best : null;
}

/**
 * Get KB entries by their IDs (for follow-up questions).
 */
export function getEntriesByIds(ids: string[]): KBEntry[] {
  return ids
    .map((id) => knowledgeBase.find((e) => e.id === id))
    .filter(Boolean) as KBEntry[];
}

/**
 * Get starter questions for a given role.
 */
export function getStarterQuestions(role: KBRole): KBEntry[] {
  const roleMap: Record<KBRole, string[]> = {
    all: ["what_is_homefixr", "service_categories", "is_homefixr_free", "contact_support"],
    customer: ["how_post_job", "ai_price_suggestion", "how_bids_work", "how_payments_work"],
    provider: ["provider_profile_setup", "provider_verification", "how_to_bid", "job_broadcasts"],
    admin: ["admin_customers", "admin_verifications", "admin_payments", "admin_settings"],
  };

  return getEntriesByIds(roleMap[role]);
}
