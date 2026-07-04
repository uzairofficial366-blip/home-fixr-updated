import { createFileRoute, Link } from "@tanstack/react-router";
import { Container } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ShieldCheck,
  Sparkles,
  Gavel,
  MessagesSquare,
  Star,
  Wrench,
  Zap,
  Droplets,
  Home as HomeIcon,
  Sparkle,
  Paintbrush,
  Trees,
  Bug,
  BrickWall,
  Fan,
  Hammer,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

const CATEGORIES = [
  { name: "Plumbing", Icon: Droplets },
  { name: "Electrical", Icon: Zap },
  { name: "Gardening", Icon: Trees },
  { name: "Carpenter", Icon: Hammer },
  { name: "Painter", Icon: Paintbrush },
  { name: "Cleaning", Icon: Sparkle },
  { name: "AC Technician", Icon: Fan },
  { name: "Mason", Icon: BrickWall },
  { name: "Home Maintenance", Icon: HomeIcon },
  { name: "Appliance Repair", Icon: Wrench },
  { name: "Pest Control", Icon: Bug },
  { name: "Other Services", Icon: Wrench },
];

const FEATURES = [
  {
    Icon: ShieldCheck,
    title: "Verified professionals",
    body: "AI-assisted ID and license verification for every provider on the platform.",
  },
  {
    Icon: Gavel,
    title: "Transparent bidding",
    body: "Providers compete with clear hourly rates and equipment costs. You pick the best fit.",
  },
  {
    Icon: Sparkles,
    title: "AI fair-price guidance",
    body: "Get a fair price range for your job the moment you describe it, powered by Groq.",
  },
  {
    Icon: MessagesSquare,
    title: "Built-in chat",
    body: "Message your provider directly once a bid is accepted, no phone numbers required.",
  },
  {
    Icon: Star,
    title: "Ratings & reviews",
    body: "Every completed job builds provider reputation with a 1-5 star review.",
  },
];

function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/90" />
        <Container className="relative grid gap-10 py-16 sm:py-24 lg:grid-cols-2 lg:items-center lg:py-32">
          <div className="text-blue-50">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/30 bg-blue-100/10 px-3 py-1 text-xs font-medium text-blue-100 backdrop-blur-sm">
              <Sparkles className="h-3 w-3" /> AI-powered marketplace
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-white">
              Home repairs, done by <span className="text-accent-orange">trusted pros</span>.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-blue-100">
              HomeFixr connects homeowners with verified service providers through a transparent
              bidding system — plus AI to help you price fairly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="bg-accent-orange hover:bg-orange-600 text-white shadow-lg">
                  Post your first job <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" variant="outline" className="border-blue-200 text-primary hover:bg-white hover:border-primary">
                  Join as a professional
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-blue-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-orange" /> Verified providers
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-orange" /> AI fair pricing
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-accent-orange" /> Real reviews
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-white/20 blur-2xl" />
            <Card className="relative overflow-hidden p-6 shadow-2xl border-0">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Live example</p>
                  <p className="mt-1 font-semibold text-lg">Leaky kitchen sink</p>
                </div>
                <span className="rounded-full bg-accent-orange/10 px-2 py-0.5 text-xs font-medium text-accent-orange">
                  Plumbing
                </span>
              </div>
              <div className="rounded-xl border-2 border-accent-orange/20 bg-gradient-to-br from-accent-orange/5 to-accent-orange/10 p-4">
                <p className="text-xs font-medium text-primary">AI suggested fair price</p>
                <p className="mt-1 text-3xl font-bold text-primary">PKR 2,500 – 4,500</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on labour + typical replacement parts.
                </p>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { name: "Ali R.", stars: 4.9, rate: "PKR 2,800", verified: true },
                  { name: "Fatima K.", stars: 4.7, rate: "PKR 3,200", verified: true },
                  { name: "Usman M.", stars: 4.5, rate: "PKR 3,900", verified: false },
                ].map((b) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {b.name}{" "}
                        {b.verified && (
                          <ShieldCheck className="ml-1 inline h-3.5 w-3.5 text-success" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">⭐ {b.stars}</p>
                    </div>
                    <p className="font-semibold text-primary">{b.rate}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* Categories */}
      <section className="border-y border-border/60 bg-muted/40 py-12">
        <Container>
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-primary">
            Services we cover
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORIES.map(({ name, Icon }) => (
              <div
                key={name}
                className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-white p-5 text-center shadow-soft transition-all hover:border-accent-orange/40 hover:shadow-card-hover hover:-translate-y-1"
              >
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-brand-soft text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium text-foreground">{name}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-primary">Why HomeFixr</h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to fix things at home without the guesswork.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }) => (
              <Card key={title} className="p-6 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1">
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-brand-soft text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/90 p-10 text-center text-white shadow-elevated">
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to get it fixed?
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-white/90">
                Post a job in under a minute. Providers bid in hours, not days.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <Button size="lg" className="bg-accent-orange hover:bg-orange-600 text-white shadow-lg">
                    Get started free <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <footer className="border-t border-border/60 bg-white py-8">
        <Container>
          <div className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} HomeFixr — FYP by Ahmad Abbas Khan, Arman Khan & Saeed Ahmad.
          </div>
        </Container>
      </footer>
    </main>
  );
}
