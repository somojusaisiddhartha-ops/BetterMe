import type { Metadata } from "next";
import ResourcePage from "@/components/site/ResourcePage";

export const metadata: Metadata = {
  title: "Privacy Policy | BetterMe",
  description: "Learn what data BetterMe uses and how it is handled.",
};

const sections = [
  {
    title: "What We Collect",
    paragraphs: [
      "BetterMe needs a small set of information to create your account, keep your quests synced, and show your progress across the app.",
      "That can include your email address, profile details you choose to add, quest activity, streak and XP data, invitation activity, and technical diagnostics that help us keep the service working.",
    ],
    bullets: [
      "Account details such as your email address and display name",
      "Quest, completion, streak, XP, analytics, and leaderboard activity",
      "Invitation and friend-connection data when you choose to use those features",
      "Basic device, browser, and error information used for security and troubleshooting",
    ],
  },
  {
    title: "How We Use Your Information",
    paragraphs: [
      "We use your information to operate core product features, personalize your experience, protect accounts, and understand whether the app is healthy and improving over time.",
    ],
    bullets: [
      "Authenticate your account and keep you signed in",
      "Store quests, completions, dashboards, analytics, and profile data",
      "Show social features such as invitations, friends, and rankings when you use them",
      "Investigate bugs, abuse, and security incidents",
      "Improve product quality, performance, and reliability",
    ],
  },
  {
    title: "When Information Is Shared",
    paragraphs: [
      "BetterMe does not sell your personal information. Information is only shared when it is necessary to run the service, when you intentionally make something visible through product features, or when disclosure is legally required.",
    ],
    bullets: [
      "Infrastructure and service providers that help us host and secure the app",
      "Other users, but only for information you surface through social or leaderboard features",
      "Authorities or legal processes when disclosure is required by law",
      "A successor organization if BetterMe is involved in a merger, acquisition, or asset transfer",
    ],
  },
  {
    title: "Retention and Protection",
    paragraphs: [
      "We retain information for as long as it is reasonably needed to provide BetterMe, satisfy legal obligations, resolve disputes, and prevent abuse.",
      "We apply practical administrative, technical, and organizational safeguards, but no internet service can guarantee absolute security.",
    ],
  },
  {
    title: "Your Choices",
    paragraphs: [
      "You can review and update profile information inside the app. If you decide not to use an optional feature, such as invitations or leaderboards, the related sharing does not occur.",
      "If you have a privacy question about the product or need a formal policy update for production use, this page should be replaced with counsel-reviewed language before launch.",
    ],
  },
] satisfies Parameters<typeof ResourcePage>[0]["sections"];

export default function PrivacyPage() {
  return (
    <ResourcePage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="This page explains the information BetterMe uses to run the product and how that information supports accounts, quests, streaks, analytics, and social features."
      updatedLabel="Last updated: April 19, 2026"
      sections={sections}
      sidebarTitle="Explore related pages"
      sidebarText="If you came here from the sign-in footer, the other support pages are now available too."
      quickLinks={[
        { href: "/terms", label: "Read Terms of Service" },
        { href: "/help", label: "Open Help Center" },
        { href: "/auth/signin", label: "Return to Sign In" },
      ]}
      note="This is solid starter copy for the product experience, but privacy language should still be reviewed before any real public launch."
    />
  );
}
