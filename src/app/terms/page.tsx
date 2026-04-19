import type { Metadata } from "next";
import ResourcePage from "@/components/site/ResourcePage";

export const metadata: Metadata = {
  title: "Terms of Service | BetterMe",
  description: "The basic rules for using BetterMe.",
};

const sections = [
  {
    title: "Using BetterMe",
    paragraphs: [
      "By accessing BetterMe, you agree to use the product responsibly and only for lawful purposes. The service is designed to help you track habits, quests, progress, and social activity tied to your account.",
      "You are responsible for the accuracy of the information you provide and for keeping your sign-in credentials secure.",
    ],
  },
  {
    title: "Account Responsibilities",
    paragraphs: [
      "You must not share credentials in a way that compromises account security, impersonate another person, or attempt to gain access to data that does not belong to you.",
    ],
    bullets: [
      "Keep your password and authentication methods private",
      "Use your own account information and maintain accurate profile details",
      "Notify the product team promptly if you believe your account has been misused",
    ],
  },
  {
    title: "Acceptable Conduct",
    paragraphs: [
      "You may not interfere with the service or use BetterMe in a way that harms other users, the platform, or the integrity of progression systems.",
    ],
    bullets: [
      "No scraping, reverse engineering, or attempts to bypass security controls",
      "No automated abuse, spam invitations, or artificial manipulation of XP, streaks, or rankings",
      "No unlawful, harassing, or deceptive activity through the product",
    ],
  },
  {
    title: "Product Changes and Availability",
    paragraphs: [
      "BetterMe may evolve over time. Features may be added, removed, refined, or interrupted while we improve the service, resolve bugs, or respond to security concerns.",
      "We aim for reliability, but the service is provided on an as-available basis and may occasionally be unavailable.",
    ],
  },
  {
    title: "Content, Feedback, and Limits",
    paragraphs: [
      "You keep ownership of the content and task information you create inside the app. By submitting content needed to operate BetterMe, you give us permission to store, process, and display it within the product.",
      "If you send product feedback, we may use it to improve BetterMe without additional obligation to you.",
    ],
  },
  {
    title: "Important Launch Note",
    paragraphs: [
      "These terms are suitable as product-ready starter content for the current app, but they are not a substitute for legal review. Replace or expand them if you need a production-grade agreement tailored to your jurisdiction and business model.",
    ],
  },
] satisfies Parameters<typeof ResourcePage>[0]["sections"];

export default function TermsPage() {
  return (
    <ResourcePage
      eyebrow="Terms"
      title="Terms of Service"
      intro="These terms set the baseline expectations for using BetterMe, including account security, acceptable conduct, and how the app may change over time."
      updatedLabel="Last updated: April 19, 2026"
      sections={sections}
      sidebarTitle="Need something else?"
      sidebarText="You can jump between the terms, privacy details, and support guidance without losing the same visual context."
      quickLinks={[
        { href: "/privacy", label: "View Privacy Policy" },
        { href: "/help", label: "Visit Help Center" },
        { href: "/auth/signup", label: "Create an Account" },
      ]}
      note="If this app is heading to production, legal review is still the right next step before treating these terms as final."
    />
  );
}
