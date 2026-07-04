import { prisma } from "./prisma.js";
import { hashPassword } from "../utils/password.js";

export async function seedDatabase() {
  console.log("🌱 Seeding database with rich test data...");

  // 1. Insert default categories
  const defaultCategories = [
    { name: "Plumbing", description: "Plumbing services including repairs, installations, and maintenance" },
    { name: "Electrical", description: "Electrical work including wiring, fixtures, and repairs" },
    { name: "Cleaning", description: "House cleaning and maintenance services" },
    { name: "Painting", description: "Interior and exterior painting services" },
    { name: "Carpentry", description: "Woodwork, furniture, and carpentry services" },
    { name: "HVAC", description: "Heating, ventilation, and air conditioning services" },
    { name: "Landscaping", description: "Garden and outdoor maintenance services" },
    { name: "Handyman", description: "General repairs and maintenance services" },
  ];

  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: { name: category.name, description: category.description },
    });
  }
  console.log("✅ Categories seeded");

  // 2. Insert default settings
  const defaultSettings = [
    { key: "site_name", value: "HomeFixr" },
    { key: "site_description", value: "Trusted home service professionals" },
    { key: "maintenance_mode", value: "false" },
    { key: "ai_pricing_enabled", value: "true" },
    { key: "ai_verification_enabled", value: "true" },
    { key: "payment_escrow_enabled", value: "true" },
    { key: "support_email", value: "support@homefixr.com" },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, updatedAt: new Date() },
      create: { key: setting.key, value: setting.value },
    });
  }
  console.log("✅ Settings seeded");

  // 3. Create default admin user if it doesn't exist
  const existingAdmin = await prisma.user.findFirst({
    where: { email: "admin@homefixr.com" },
  });

  if (!existingAdmin) {
    const hashedPassword = await hashPassword("HomeFixr@2026");
    await prisma.user.create({
      data: {
        email: "admin@homefixr.com",
        passwordHash: hashedPassword,
        name: "Admin User",
        role: "admin",
      },
    });
    console.log("✅ Default admin user created: admin@homefixr.com / HomeFixr@2026");
  }

  // Clear existing non-admin data to avoid duplicate conflicts on reseeding
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.verificationRequest.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.job.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.user.deleteMany({
    where: { NOT: { role: "admin" } }
  });

  // 4. Create Homeowners
  const homeownersData = [
    { name: "John Doe", email: "john@doe.com", phone: "+1555123456" },
    { name: "Jane Smith", email: "jane@smith.com", phone: "+1555987654" },
    { name: "Alice Brown", email: "alice@brown.com", phone: "+1555543210" },
  ];

  const homeowners = [];
  const defaultUserPassword = await hashPassword("Password123!");

  for (const h of homeownersData) {
    const user = await prisma.user.create({
      data: {
        name: h.name,
        email: h.email,
        passwordHash: defaultUserPassword,
        role: "homeowner",
        phone: h.phone,
      }
    });
    homeowners.push(user);
  }
  console.log("✅ Homeowners seeded");

  // 5. Create Providers
  const providersData = [
    { name: "Bob Miller", email: "bob@miller.com", phone: "+1555111222", bio: "Experienced plumber with 10+ years in residential repair.", categories: ["Plumbing"], hourlyRate: 85, exp: 12, verification: "verified" },
    { name: "Charlie Davis", email: "charlie@davis.com", phone: "+1555333444", bio: "Licensed master electrician specializing in smart home integration.", categories: ["Electrical", "Handyman"], hourlyRate: 95, exp: 8, verification: "verified" },
    { name: "Diana Prince", email: "diana@prince.com", phone: "+1555555666", bio: "Professional residential cleaner. Spotless service guaranteed.", categories: ["Cleaning"], hourlyRate: 45, exp: 5, verification: "pending" },
    { name: "Evan Wright", email: "evan@wright.com", phone: "+1555777888", bio: "Fine woodworker and carpenter. Cabinet installation, trim, framing.", categories: ["Carpentry"], hourlyRate: 75, exp: 15, verification: "unverified" },
  ];

  const providers = [];
  for (const p of providersData) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        passwordHash: defaultUserPassword,
        role: "provider",
        phone: p.phone,
      }
    });

    await prisma.providerProfile.create({
      data: {
        userId: user.id,
        bio: p.bio,
        categories: p.categories,
        hourlyRate: p.hourlyRate,
        yearsExperience: p.exp,
        verificationStatus: p.verification,
        isAvailable: true,
      }
    });

    providers.push(user);
  }
  console.log("✅ Providers and Profiles seeded");

  // 6. Create Jobs
  const jobsData = [
    {
      homeownerIndex: 0, // John Doe
      title: "Leaking Kitchen Sink Pipe",
      description: "The pipe underneath the kitchen sink is leaking when water runs. Need it repaired or replaced ASAP.",
      category: "Plumbing",
      address: "123 Main St, Springfield",
      budget: 150,
      status: "completed",
    },
    {
      homeownerIndex: 1, // Jane Smith
      title: "Ceiling Fan Installation",
      description: "Need to install a new ceiling fan in the master bedroom. Wiring is already in place, just need the fixture assembled and mounted.",
      category: "Electrical",
      address: "456 Oak Ave, Greenwood",
      budget: 120,
      status: "in_progress",
    },
    {
      homeownerIndex: 2, // Alice Brown
      title: "Full House Deep Cleaning",
      description: "3-bedroom, 2-bathroom house needs a deep spring cleaning. Cleaning supplies must be provided by the professional.",
      category: "Cleaning",
      address: "789 Pine Rd, Lakeshore",
      budget: 250,
      status: "open",
    },
    {
      homeownerIndex: 0, // John Doe
      title: "Wooden Deck Repair",
      description: "Several boards on the backyard deck are rotting and need to be replaced. Looking for a skilled carpenter.",
      category: "Carpentry",
      address: "123 Main St, Springfield",
      budget: 500,
      status: "open",
    },
  ];

  const jobs = [];
  for (const jd of jobsData) {
    const homeowner = homeowners[jd.homeownerIndex];
    const job = await prisma.job.create({
      data: {
        homeownerId: homeowner.id,
        title: jd.title,
        description: jd.description,
        category: jd.category,
        address: jd.address,
        budget: jd.budget,
        status: jd.status,
      }
    });
    jobs.push(job);
  }
  console.log("✅ Jobs seeded");

  // 7. Create Bids
  // Plumbing Job (Completed) - Bid by Bob (Plumber)
  const completedJob = jobs[0];
  const plumber = providers[0]; // Bob
  const completedBid = await prisma.bid.create({
    data: {
      jobId: completedJob.id,
      providerId: plumber.id,
      hourlyRate: 75,
      hoursEstimate: 2,
      equipmentCost: 20,
      total: 170,
      message: "I can come over today and fix this leak quickly. I have spare pipes and washers in my van.",
      status: "accepted",
    }
  });

  // Update Completed Job to reference accepted bid
  await prisma.job.update({
    where: { id: completedJob.id },
    data: { acceptedBidId: completedBid.id, completedAt: new Date() }
  });

  // Electrical Job (In Progress) - Bid by Charlie (Electrician)
  const inProgressJob = jobs[1];
  const electrician = providers[1]; // Charlie
  const inProgressBid = await prisma.bid.create({
    data: {
      jobId: inProgressJob.id,
      providerId: electrician.id,
      hourlyRate: 85,
      hoursEstimate: 1.5,
      equipmentCost: 0,
      total: 127.5,
      message: "I am a licensed electrician and have done many fan installations. Ready to support.",
      status: "accepted",
    }
  });

  await prisma.job.update({
    where: { id: inProgressJob.id },
    data: { acceptedBidId: inProgressBid.id }
  });

  // Cleaning Job (Open) - Bids from Diana
  const openCleaningJob = jobs[2];
  const cleaner = providers[2]; // Diana
  await prisma.bid.create({
    data: {
      jobId: openCleaningJob.id,
      providerId: cleaner.id,
      hourlyRate: 40,
      hoursEstimate: 6,
      equipmentCost: 20,
      total: 260,
      message: "I can do this full cleaning on Saturday morning. I bring all my eco-friendly products.",
      status: "pending",
    }
  });

  // Deck Job (Open) - Bids from Evan (unverified)
  const openDeckJob = jobs[3];
  const carpenter = providers[3]; // Evan
  await prisma.bid.create({
    data: {
      jobId: openDeckJob.id,
      providerId: carpenter.id,
      hourlyRate: 70,
      hoursEstimate: 7,
      equipmentCost: 100,
      total: 590,
      message: "I have the tools and experience to repair your rotting boards and inspect the joists.",
      status: "pending",
    }
  });
  console.log("✅ Bids seeded");

  // 8. Create Payments
  // Plumbing Job (Completed) - Payment released
  await prisma.payment.create({
    data: {
      jobId: completedJob.id,
      amount: 170,
      status: "released",
    }
  });

  // Electrical Job (In Progress) - Payment held in escrow
  await prisma.payment.create({
    data: {
      jobId: inProgressJob.id,
      amount: 127.5,
      status: "held",
    }
  });
  console.log("✅ Payments seeded");

  // 9. Create Reviews
  // Review from John Doe for Bob Miller (Plumbing)
  await prisma.review.create({
    data: {
      jobId: completedJob.id,
      reviewerId: homeowners[0].id,
      providerId: plumber.id,
      rating: 5,
      comment: "Bob did an excellent job. Arrived on time, fixed the leak, and cleaned up afterwards. Highly recommended!",
    }
  });
  console.log("✅ Reviews seeded");

  // 10. Create Verification Request
  // Pending verification request for Diana Prince (Cleaner)
  await prisma.verificationRequest.create({
    data: {
      providerId: cleaner.id,
      fullName: "Diana Prince",
      documentType: "National ID",
      documentDescription: "Driver License copy front/back and business tax registration document.",
      idDocumentUrl: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=400",
      licenseDocumentUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=400",
      status: "pending",
    }
  });
  console.log("✅ Verification requests seeded");

  // 11. Create Notifications for Admin Panel UI
  await prisma.notification.create({
    data: {
      userId: 1, // Admin User
      title: "New Verification Request",
      body: "Diana Prince has submitted a new verification request for Cleaning services.",
      link: "/admin/verifications",
      isRead: false,
    }
  });

  await prisma.notification.create({
    data: {
      userId: homeowners[0].id,
      title: "Job Completed Successfully",
      body: "Your sink pipe job has been completed by Bob Miller.",
      link: `/jobs/${completedJob.id}`,
      isRead: true,
    }
  });
  console.log("✅ Notifications seeded");

  console.log("✅ Database seeded with complete rich layout data successfully!");
}

seedDatabase()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Error seeding database:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
