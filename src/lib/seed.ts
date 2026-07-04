import { ensureSchema, getSql } from "./db.server";
import { hashPassword } from "./auth.server";

export async function seedDatabase() {
  await ensureSchema();
  const sql = getSql();

  // Create settings table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Create categories table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Insert default categories
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
    await sql`
      INSERT INTO categories (name, description)
      VALUES (${category.name}, ${category.description})
      ON CONFLICT (name) DO NOTHING
    `;
  }

  // Insert default settings
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
    await sql`
      INSERT INTO settings (key, value)
      VALUES (${setting.key}, ${setting.value})
      ON CONFLICT (key) DO UPDATE SET value = ${setting.value}, updated_at = NOW()
    `;
  }

  // Create default admin user if it doesn't exist
  const existingAdmin = await sql`
    SELECT id FROM users WHERE email = 'admin@homefixr.com' AND role = 'admin'
  `;

  if (existingAdmin.length === 0) {
    const hashedPassword = await hashPassword("HomeFixr@2026");
    await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ('admin@homefixr.com', ${hashedPassword}, 'Admin User', 'admin')
    `;
    console.log("✅ Default admin user created:");
    console.log("   Email: admin@homefixr.com");
    console.log("   Password: HomeFixr@2026");
  } else {
    console.log("ℹ️  Admin user already exists");
  }

  console.log("✅ Database seeded successfully");
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error seeding database:", error);
      process.exit(1);
    });
}