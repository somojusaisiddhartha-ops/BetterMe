import type { Metadata } from "next";
import ResourcePage from "@/components/site/ResourcePage";

export const metadata: Metadata = {
  title: "Help Center | BetterMe",
  description: "Help with signing in, creating quests, invites, analytics, and navigation in BetterMe.",
};

const sections = [
  {
    title: "Getting Started",
    paragraphs: [
      "New to BetterMe? Start by creating an account, then head to your dashboard to create quests and begin earning XP through daily consistency.",
    ],
    bullets: [
      "Create an account from the sign-up page",
      "Open the dashboard to see your current focus and progress",
      "Use the quests page to create, edit, and complete habit quests",
    ],
  },
  {
    title: "Common Account Questions",
    paragraphs: [
      "If you cannot access your account, first confirm that you are using the same email address you used during sign-up. Then retry from the sign-in page.",
      "If you arrived through an invitation link, keep using that same flow so the invite can be associated with your account after authentication.",
    ],
  },
  {
    title: "Where to Find Key Features",
    paragraphs: [
      "BetterMe already separates the main experience into dedicated views, so most support questions are really navigation questions.",
    ],
    bullets: [
      "Dashboard: your main overview and daily momentum",
      "Quests: create and manage habits, rewards, and completion status",
      "Analytics: inspect streaks, trends, and performance snapshots",
      "Arena: view leaderboard standings and rank progression",
      "Profile: manage identity, invites, and friend activity",
    ],
  },
  {
    title: "Invitations and Social Features",
    paragraphs: [
      "Invitation links are generated from the profile area. A person who opens the link can sign up or sign in, and the app will use that invitation context during the onboarding flow.",
      "If an invite does not appear to connect immediately, finish authentication first and then re-open the dashboard so the app can continue the association flow.",
    ],
  },
  {
    title: "Progress and Analytics",
    paragraphs: [
      "XP, streaks, and analytics depend on quest completion data. If something looks off, verify that the quest was completed in the correct status and then refresh the relevant page.",
      "If you are testing locally, some values may reflect the current seed data or your most recent synced session.",
    ],
  },
] satisfies Parameters<typeof ResourcePage>[0]["sections"];

export default function HelpPage() {
  return (
    <ResourcePage
      eyebrow="Support"
      title="Help Center"
      intro="Use this page as the quick orientation layer for BetterMe. It covers onboarding, navigation, invitations, and the most likely places users get stuck."
      updatedLabel="Last updated: April 19, 2026"
      sections={sections}
      sidebarTitle="Jump straight in"
      sidebarText="These routes already exist in the app, so the support page can point people to real destinations instead of dead ends."
      quickLinks={[
        { href: "/auth/signin", label: "Open Sign In" },
        { href: "/auth/signup", label: "Open Sign Up" },
        { href: "/privacy", label: "View Privacy Policy" },
        { href: "/terms", label: "Read Terms of Service" },
      ]}
      note="If you want a deeper support experience later, the next step would be turning this into a searchable FAQ or article-based help system."
    />
  );
}
