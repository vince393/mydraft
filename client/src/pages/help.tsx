import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { MarketingNav } from "@/components/marketing-nav";
import { Seo } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import draftLogo from "@assets/mydraft_logo.png";
import {
  Search,
  Send,
  CheckCircle2,
  Loader2,
  BookOpen,
  Inbox,
  Sparkles,
  CreditCard,
  Shield,
  HelpCircle,
  Mail,
  ArrowLeft,
  Clock,
  Globe,
  Settings,
  Gift,
  Wand2,
  Star,
  Trash2,
  FolderPlus,
  Mic,
  Languages,
  FileText,
  Palette,
  Link2,
  UserPlus,
  MousePointerClick,
  ChevronRight,
  Lock,
  Bell,
  Pencil,
  CalendarClock,
  Paperclip,
  Smartphone,
  RefreshCw,
  Eye,
  Download,
  TicketPercent,
  ShieldAlert,
  AtSign,
} from "lucide-react";

interface HelpArticle {
  id: string;
  question: string;
  readTime: string;
  category: string;
  icon: any;
  iconColor: string;
  content: {
    intro: string;
    paragraphs: string[];
    steps?: { title: string; description: string }[];
    tip?: string;
  };
}

const articles: HelpArticle[] = [
  {
    id: "create-account",
    question: "How do I create a MyDraft account?",
    readTime: "2 min read",
    category: "Getting Started",
    icon: UserPlus,
    iconColor: "#3B82F6",
    content: {
      intro: "Creating your MyDraft account takes less than a minute. Here's how to get started and set up your email inbox.",
      paragraphs: [
        "MyDraft is designed to get you up and running quickly. When you visit the homepage, you'll see a \"Get Started\" button that takes you straight to the registration page. All you need is an email address and a password to create your account.",
        "After signing up, you'll go through a quick onboarding process. This is where you pick a plan that works for you (Free, Pro, or Business), set your AI preferences like your preferred writing tone, and tell us a bit about how you use email. This helps our AI write better replies for you from day one.",
        "Once onboarding is done, you'll be asked to connect your email account — either Gmail or Microsoft Outlook. After that, your inbox loads and you're ready to go."
      ],
      steps: [
        { title: "Visit the homepage", description: "Click \"Get Started\" or \"Sign Up\" to begin." },
        { title: "Enter your details", description: "Type in your email address and create a secure password." },
        { title: "Choose a plan", description: "Pick Free, Pro, or Business. Pro and Business include a 3-day free trial." },
        { title: "Set AI preferences", description: "Choose your writing tone (professional, casual, friendly) and other preferences." },
        { title: "Connect your email", description: "Link your Gmail or Outlook account through secure OAuth sign-in." },
      ],
      tip: "You can always change your plan and AI preferences later in Settings."
    }
  },
  {
    id: "connect-email",
    question: "How do I connect my Gmail or Outlook account?",
    readTime: "3 min read",
    category: "Getting Started",
    icon: Link2,
    iconColor: "#3B82F6",
    content: {
      intro: "MyDraft works with your existing email account. We support Gmail (Google Workspace) and Microsoft Outlook (Office 365 and personal accounts).",
      paragraphs: [
        "Connecting your email is simple and secure. MyDraft uses OAuth, which means you sign in directly with Google or Microsoft — we never see or store your email password. We only receive a secure access token that lets us read and send emails on your behalf.",
        "During onboarding, you'll be prompted to connect your account. If you skip that step, you can always connect later by going to Settings and clicking \"Connect Email.\" You'll be redirected to Google or Microsoft's sign-in page where you grant MyDraft permission to access your inbox.",
        "Once connected, your inbox loads automatically. MyDraft syncs your latest emails and keeps everything up to date in real time. You can disconnect your account at any time from Settings, which immediately revokes our access and deletes all cached data."
      ],
      steps: [
        { title: "Go to email connection", description: "During onboarding, or navigate to Settings > Email Account." },
        { title: "Choose your provider", description: "Click the Gmail or Microsoft Outlook button." },
        { title: "Sign in with your provider", description: "You'll be redirected to Google or Microsoft to sign in and grant access." },
        { title: "Return to MyDraft", description: "After authorizing, you'll be redirected back and your inbox will load." },
      ],
      tip: "Your email connection is encrypted and secured with industry-standard OAuth 2.0. We never store your email password."
    }
  },
  {
    id: "free-trial",
    question: "How does the free trial work?",
    readTime: "2 min read",
    category: "Getting Started",
    icon: Clock,
    iconColor: "#3B82F6",
    content: {
      intro: "Pro and Business plans both come with a 3-day free trial so you can explore everything before you're charged.",
      paragraphs: [
        "When you choose Pro or Business during signup, you'll be asked to enter a payment method. This is just to set up your subscription — you won't be charged anything for the first 3 days. During the trial, you get full access to every feature included in your chosen plan.",
        "If you decide MyDraft isn't for you, simply cancel before the trial ends and you won't be charged at all. You can cancel from Settings > Billing at any time. If you don't cancel, your subscription starts automatically on day 4 at the regular plan price.",
        "The Free plan doesn't require a trial — it's free forever with basic features and 10 AI credits per month."
      ],
      steps: [
        { title: "Choose Pro or Business", description: "Select your plan during onboarding or from the Pricing page." },
        { title: "Enter payment details", description: "Add a card to activate your 3-day trial." },
        { title: "Use all features", description: "Enjoy full access to everything in your plan for 3 days." },
        { title: "Keep or cancel", description: "Cancel anytime in Settings > Billing. No charge if cancelled before day 4." },
      ],
    }
  },
  {
    id: "supported-providers",
    question: "What email providers does MyDraft support?",
    readTime: "2 min read",
    category: "Getting Started",
    icon: Mail,
    iconColor: "#3B82F6",
    content: {
      intro: "MyDraft currently supports the two most popular email providers: Google Gmail and Microsoft Outlook.",
      paragraphs: [
        "You can connect any Gmail account, including personal Gmail addresses and Google Workspace (business) accounts. For Microsoft, we support Office 365 accounts and personal Outlook/Hotmail accounts. Both providers connect through secure OAuth 2.0 authentication.",
        "Each MyDraft account supports one connected email account at a time. If you need to switch providers, you can disconnect your current account in Settings and connect a different one. All your MyDraft preferences and AI settings will carry over.",
        "We're working on adding support for more providers in the future. If you need a specific provider, let us know through the contact form at the bottom of this page."
      ],
    }
  },
  {
    id: "navigate-inbox",
    question: "How do I navigate my inbox and folders?",
    readTime: "3 min read",
    category: "Inbox & Email",
    icon: Inbox,
    iconColor: "#8B5CF6",
    content: {
      intro: "MyDraft organizes your email into familiar folders with a clean sidebar for easy navigation.",
      paragraphs: [
        "Your sidebar on the left shows all your email folders: Inbox, Starred, Sent, Drafts, Archive, Spam, and Trash. Each folder shows a count of unread messages so you always know where your attention is needed. Click any folder to see its emails in the main list view.",
        "The email list shows your messages with the sender name, subject line, and a preview snippet. Unread emails are highlighted so they're easy to spot. Click any email to open it and read the full message. On mobile, you can use swipe gestures to quickly archive or delete emails.",
        "Pro and Business users can also create custom folders with AI-powered auto-sorting. Set a description for your folder and MyDraft's AI will automatically suggest moving matching emails there during cleanup scans."
      ],
      steps: [
        { title: "Use the sidebar", description: "Click folder names like Inbox, Starred, Sent, Archive, or Trash to switch views." },
        { title: "Read an email", description: "Click any email in the list to open and read the full message." },
        { title: "Go back to the list", description: "Click the back arrow or use your browser's back button to return to the email list." },
        { title: "Check unread counts", description: "Badge numbers next to folder names show how many unread messages you have." },
      ],
    }
  },
  {
    id: "compose-email",
    question: "How do I compose and send an email?",
    readTime: "3 min read",
    category: "Inbox & Email",
    icon: Send,
    iconColor: "#8B5CF6",
    content: {
      intro: "Writing and sending emails in MyDraft is straightforward, with built-in features like contact autocomplete and email signatures.",
      paragraphs: [
        "To compose a new email, click the \"Compose\" button in the sidebar. This opens a compose window where you can add recipients, write a subject line, and type your message. The To, Cc, and Bcc fields all support autocomplete — as you start typing, MyDraft suggests contacts from people you've previously emailed.",
        "If you've set up an email signature in Settings, it will be automatically added to every new email, reply, and forwarded message. You can edit or remove the signature on a per-email basis before sending. If you haven't set up a signature yet, MyDraft will show a helpful suggestion to add one.",
        "Once your email is ready, hit Send. MyDraft sends the email through your connected account (Gmail or Outlook), so it appears in your sent folder on both MyDraft and your email provider."
      ],
      steps: [
        { title: "Click Compose", description: "Find the Compose button in the sidebar to open a new email window." },
        { title: "Add recipients", description: "Type email addresses in the To field. Use Cc and Bcc for additional recipients." },
        { title: "Write your subject and message", description: "Enter a subject line and compose your email in the body editor." },
        { title: "Review and send", description: "Check your message, then click Send to deliver it." },
      ],
      tip: "Set up your email signature in Settings > Email so it's automatically added to all your messages."
    }
  },
  {
    id: "reply-forward",
    question: "How do I reply to or forward an email?",
    readTime: "2 min read",
    category: "Inbox & Email",
    icon: Mail,
    iconColor: "#8B5CF6",
    content: {
      intro: "Replying and forwarding works just like you'd expect, with the original message included for context.",
      paragraphs: [
        "When you're viewing an email, you'll see action buttons for Reply, Reply All, and Forward. Reply sends your response to the original sender only. Reply All sends it to everyone who was included in the conversation. Forward lets you send the email to someone new.",
        "In all cases, the original message is quoted below your reply so the recipient has full context. You can edit the quoted text if needed. If you have an email signature set up, it will be inserted between your reply and the quoted message automatically.",
        "You can also use MyDraft's AI features to generate a reply draft before sending — just click the AI button to get a suggested response that you can review and edit."
      ],
      steps: [
        { title: "Open the email", description: "Click on the email you want to respond to." },
        { title: "Choose your action", description: "Click Reply, Reply All, or Forward from the action buttons." },
        { title: "Write your response", description: "Type your message. The original email is quoted below." },
        { title: "Send", description: "Review your message and click Send to deliver it." },
      ],
    }
  },
  {
    id: "star-archive-delete",
    question: "How do I star, archive, or delete emails?",
    readTime: "3 min read",
    category: "Inbox & Email",
    icon: Star,
    iconColor: "#8B5CF6",
    content: {
      intro: "MyDraft gives you several ways to organize your inbox — star important emails, archive ones you want to keep, or delete what you don't need.",
      paragraphs: [
        "Starring an email marks it as important and makes it easy to find later in the Starred folder. When viewing an email, click the star icon to toggle it on or off. Starred emails are never touched by AI cleanup suggestions, so they're safe from accidental removal.",
        "Archiving removes an email from your inbox without deleting it. It's perfect for messages you've dealt with but might need to reference later. Archived emails go to the Archive folder where they're always accessible. You can archive individual emails or select multiple at once.",
        "Deleting sends an email to the Trash folder. Emails in Trash are typically permanently removed after 30 days by your email provider. If you accidentally delete something, you can recover it from Trash before it's permanently gone."
      ],
      steps: [
        { title: "Star an email", description: "Click the star icon on any email to mark it as important." },
        { title: "Archive an email", description: "Click the archive icon or swipe right on mobile to move it out of your inbox." },
        { title: "Delete an email", description: "Click the trash icon or swipe left on mobile to move it to Trash." },
        { title: "Bulk actions", description: "Long-press an email to enter selection mode, then select multiple emails for batch actions." },
      ],
      tip: "Swipe gestures on mobile make organizing emails even faster — swipe right to archive, swipe left to delete."
    }
  },
  {
    id: "custom-folders",
    question: "How do I create custom folders?",
    readTime: "3 min read",
    category: "Inbox & Email",
    icon: FolderPlus,
    iconColor: "#8B5CF6",
    content: {
      intro: "Pro and Business users can create custom folders to organize emails exactly the way they want, with optional AI-powered auto-sorting.",
      paragraphs: [
        "Custom folders let you group emails by project, client, topic, or anything else that makes sense for your workflow. To create one, look for the \"New Folder\" option in your sidebar. Give it a name and optionally add an AI description — this tells MyDraft's AI what kind of emails should go in this folder.",
        "When you set an AI description for a folder (like \"Emails about the Q2 marketing campaign\" or \"Invoices and receipts\"), the AI cleanup scanner will automatically suggest moving matching emails there. This means your emails get sorted without you having to do it manually.",
        "You can move emails to custom folders manually too — just use the move option from the email actions menu. You can rename or delete custom folders at any time from the sidebar."
      ],
      steps: [
        { title: "Create a folder", description: "Click \"New Folder\" in the sidebar and give it a name." },
        { title: "Add an AI description (optional)", description: "Write a brief description of what emails belong in this folder." },
        { title: "Move emails manually", description: "Use the move action on any email to place it in your custom folder." },
        { title: "Let AI sort for you", description: "Run an AI cleanup scan and it will suggest moving matching emails to your folders." },
      ],
      tip: "The more specific your AI description, the better the auto-sorting works. Instead of \"Work emails,\" try \"Client invoices and payment reminders.\""
    }
  },
  {
    id: "ai-draft-replies",
    question: "How do I use AI to draft email replies?",
    readTime: "4 min read",
    category: "AI Features",
    icon: Sparkles,
    iconColor: "#F59E0B",
    content: {
      intro: "MyDraft's AI can write reply drafts for you based on the email you're reading and your personal writing preferences.",
      paragraphs: [
        "When you open an email, you'll see an AI button that lets you generate a reply draft. Click it and MyDraft's AI will analyze the email content, understand what kind of response is needed, and write a professional reply in your preferred tone. The draft appears in the reply editor where you can review, edit, and customize it before sending.",
        "The AI takes into account your preferences set during onboarding — things like your preferred writing tone (professional, casual, friendly), how formal or informal you like to be, and your communication style. Pro and Business users get even better results because MyDraft learns their unique writing style over time by analyzing emails they've sent.",
        "You can also use quick-generate to get a reply with just one click, or use the AI refine feature to improve a draft you've already started writing. The AI assistant in the sidebar can help with more complex email tasks like drafting from scratch, summarizing threads, or translating content.",
        "Free users get 10 AI credits per month. Pro users get 50 credits per month, and Business users get 200 credits per month. Each AI action uses credits (for example, an AI reply costs 2 credits and a summary costs 1), and you can top up anytime with credit packs."
      ],
      steps: [
        { title: "Open an email", description: "Click on the email you want to reply to." },
        { title: "Click the AI button", description: "Look for the sparkle/AI icon in the reply area or email actions." },
        { title: "Review the draft", description: "The AI writes a reply based on the email context and your preferences." },
        { title: "Edit and send", description: "Tweak the draft to your liking, then hit Send." },
      ],
      tip: "Pro users: the more emails you send through MyDraft, the better the AI learns your writing style."
    }
  },
  {
    id: "ai-cleanup",
    question: "How does AI inbox cleanup work?",
    readTime: "3 min read",
    category: "AI Features",
    icon: Wand2,
    iconColor: "#F59E0B",
    content: {
      intro: "The AI cleanup scanner analyzes your inbox and suggests actions like deleting junk, archiving old emails, or sorting into folders.",
      paragraphs: [
        "To run a cleanup scan, click the AI Cleanup button (the wand icon near the top of your inbox). MyDraft's AI will scan your recent emails and identify things that could be cleaned up — newsletters you never read, expired promotions, old notifications, spam, and more.",
        "After the scan, you'll see a compact checklist of suggested actions grouped by type (delete, archive, move to spam, etc.). Everything is pre-selected by default. Simply uncheck any emails you want to keep, then tap \"Clean up\" to apply all the changes at once. It's designed to be fast — most people can clean their inbox in about 10 seconds.",
        "The AI gets smarter over time. It learns from your deletion and archive patterns, so emails from senders you regularly clean up will be flagged first. If you have custom folders with AI descriptions, the scanner will also suggest sorting emails into the right folders."
      ],
      steps: [
        { title: "Click AI Cleanup", description: "Tap the wand icon at the top of your inbox." },
        { title: "Start the scan", description: "Click \"Start Scan\" and wait a few seconds." },
        { title: "Review suggestions", description: "Everything is pre-checked. Uncheck any emails you want to keep." },
        { title: "Apply changes", description: "Click the \"Clean up\" button to process all selected actions at once." },
      ],
      tip: "The AI never touches starred emails, so star anything important before running a scan."
    }
  },
  {
    id: "writing-style",
    question: "How does writing style learning work?",
    readTime: "3 min read",
    category: "AI Features",
    icon: FileText,
    iconColor: "#F59E0B",
    content: {
      intro: "Pro and Business users get personalized AI drafts that match their unique writing voice, thanks to writing style learning.",
      paragraphs: [
        "When you send emails through MyDraft, the AI quietly analyzes your writing patterns — things like your sentence length, vocabulary, greeting style, sign-off preferences, and overall tone. After you've sent a few emails (at least 3), MyDraft builds a writing style profile that's unique to you.",
        "Once your style profile is built, every AI-generated draft will match your voice. Instead of generic responses, you'll get replies that sound like you actually wrote them. The AI continues to learn and refine its understanding as you send more emails, so it keeps getting better over time.",
        "This feature is available on Pro and Business plans only. Free users still get AI drafts, but they use a general tone based on your preferences (professional, casual, etc.) rather than a personalized writing profile. You can view your style profile in Settings > AI Preferences."
      ],
      steps: [
        { title: "Send emails normally", description: "Use MyDraft to send at least 3 emails so the AI can learn your style." },
        { title: "Style profile is built", description: "After enough samples, MyDraft creates a writing profile automatically." },
        { title: "AI drafts match your voice", description: "All future AI-generated replies will sound like you wrote them." },
        { title: "Review in Settings", description: "Check your style profile in Settings > AI Preferences." },
      ],
      tip: "The more emails you send through MyDraft, the more accurate your style profile becomes."
    }
  },
  {
    id: "email-translation",
    question: "How do I translate emails?",
    readTime: "3 min read",
    category: "AI Features",
    icon: Languages,
    iconColor: "#F59E0B",
    content: {
      intro: "MyDraft supports translation in over 30 languages with culturally-aware tone adaptation, perfect for international communication.",
      paragraphs: [
        "When you're reading an email in a language you don't understand, look for the translate option in the email actions. MyDraft's AI will translate the email into your preferred language while preserving the original meaning and context. The translation appears right below the original text.",
        "What makes MyDraft's translation special is cultural awareness. When translating to or from languages with specific cultural norms — like formal Japanese keigo or casual Australian English — the AI adapts the tone appropriately. You can also choose between formal, casual, or neutral translation modes to match what you need.",
        "For international users, MyDraft also provides cultural etiquette tips when you receive emails from different regions. A small banner may appear suggesting culturally appropriate ways to respond, helping you communicate effectively across borders."
      ],
      steps: [
        { title: "Open an email", description: "Click on the email you want to translate." },
        { title: "Click Translate", description: "Find the translate option in the email action bar." },
        { title: "Choose language and tone", description: "Select your target language and formality level (formal, casual, or auto)." },
        { title: "Read the translation", description: "The translated text appears with cultural notes when relevant." },
      ],
      tip: "Set your preferred language and region in Settings > AI Preferences so translations default to your language."
    }
  },
  {
    id: "email-summary",
    question: "How do I get an AI summary of an email?",
    readTime: "2 min read",
    category: "AI Features",
    icon: FileText,
    iconColor: "#F59E0B",
    content: {
      intro: "Long emails can be summarized instantly by MyDraft's AI, giving you the key points without reading the full message.",
      paragraphs: [
        "When viewing a long email, click the summary button in the email actions bar. The AI reads the entire email and generates a concise summary highlighting the key points, action items, and important details. This is especially useful for lengthy threads or formal communications.",
        "Summaries are generated on demand and appear at the top of the email. They typically capture who the email is from, what they're asking or telling you, any deadlines or action items, and the overall tone of the message. This helps you decide quickly whether an email needs an immediate response or can wait."
      ],
      steps: [
        { title: "Open a long email", description: "Click on the email you want summarized." },
        { title: "Click Summarize", description: "Find the summary option in the email actions." },
        { title: "Read the key points", description: "A concise summary appears highlighting what matters." },
      ],
    }
  },
  {
    id: "ai-assistant",
    question: "How do I use the AI assistant?",
    readTime: "3 min read",
    category: "AI Features",
    icon: Sparkles,
    iconColor: "#F59E0B",
    content: {
      intro: "The AI assistant is a chat-style helper that can answer questions about your emails, draft messages from scratch, and more.",
      paragraphs: [
        "You can access the AI assistant from the sidebar. It works like a conversation — type what you need and the AI responds. You can ask it to draft an email from scratch, summarize your inbox, suggest replies, translate content, or help you with any email-related task.",
        "The assistant has context about your inbox, so you can ask questions like \"Do I have any unread emails from my manager?\" or \"Help me write a follow-up email about the meeting yesterday.\" It combines your email data with AI to give relevant, personalized responses.",
        "Conversation history is saved, so you can pick up where you left off. The assistant uses the same AI preferences and writing style you've set up, ensuring consistent communication across all MyDraft features."
      ],
      steps: [
        { title: "Open the assistant", description: "Click the AI assistant icon in the sidebar." },
        { title: "Type your request", description: "Ask it to draft emails, answer questions, or help with inbox tasks." },
        { title: "Review the response", description: "The AI provides answers, drafts, or suggestions based on your request." },
        { title: "Continue the conversation", description: "Follow up with more questions or refine the response." },
      ],
    }
  },
  {
    id: "plans-pricing",
    question: "What are the available plans and pricing?",
    readTime: "3 min read",
    category: "Billing & Plans",
    icon: CreditCard,
    iconColor: "#10B981",
    content: {
      intro: "MyDraft offers three plans to fit different needs: Free, Pro, and Business. Pro and Business include a 3-day free trial.",
      paragraphs: [
        "The Free plan gives you basic inbox management with 10 AI credits per month. It's a great way to try MyDraft and see if it works for you. There's no time limit on the Free plan — it's free forever.",
        "Pro is $4.99/month (or $4.16/month billed annually — saving $21/year). It includes writing style memory so the AI learns to write like you, 50 AI credits per month, email scheduling, advanced inbox management, and custom folders with AI sorting. Pro is the best value for individuals who use email heavily.",
        "Business is $14.99/month (or $12.49/month billed annually — saving $49/year). It includes everything in Pro plus enhanced AI quality for better draft generation, 200 AI credits per month, voice assistant, custom AI training, and team collaboration features. Business is designed for professionals and teams who want the best AI email experience."
      ],
      steps: [
        { title: "Compare plans", description: "Visit the Pricing page to see a full feature comparison." },
        { title: "Start your trial", description: "Pro and Business plans include 3 days free." },
        { title: "Choose monthly or annual", description: "Annual billing saves you money — up to $49/year on Business." },
        { title: "Upgrade anytime", description: "Switch plans in Settings > Billing whenever you need to." },
      ],
    }
  },
  {
    id: "upgrade-plan",
    question: "How do I upgrade, downgrade, or switch plans?",
    readTime: "3 min read",
    category: "Billing & Plans",
    icon: CreditCard,
    iconColor: "#10B981",
    content: {
      intro: "You can change your plan at any time from Settings. Upgrades take effect immediately, and downgrades happen at the end of your billing period.",
      paragraphs: [
        "To change your plan, go to Settings > Billing. You'll see your current plan and options to upgrade or switch. If you're on Free and want to upgrade to Pro or Business, you'll be taken through a secure checkout to add your payment details and start your 3-day trial.",
        "If you're already on a paid plan and want to switch (Pro to Business, or Business to Pro), MyDraft handles the transition automatically. When upgrading, you'll get the new features immediately and your billing is prorated so you only pay the difference. When downgrading, you keep your current plan until the end of the billing period.",
        "To downgrade to Free, go to Settings > Billing and cancel your subscription. You'll keep your paid features until your current billing period ends, then automatically switch to the Free plan."
      ],
      steps: [
        { title: "Go to Settings", description: "Open Settings from the sidebar or your profile menu." },
        { title: "Click Billing", description: "Select the Billing tab to see your current plan." },
        { title: "Choose a new plan", description: "Click Upgrade, Downgrade, or Switch to select your new plan." },
        { title: "Confirm changes", description: "Review the changes and confirm. Upgrades apply immediately." },
      ],
    }
  },
  {
    id: "cancel-subscription",
    question: "How do I cancel my subscription?",
    readTime: "2 min read",
    category: "Billing & Plans",
    icon: CreditCard,
    iconColor: "#10B981",
    content: {
      intro: "You can cancel your subscription anytime with no cancellation fees. You'll keep your plan until the end of the billing period.",
      paragraphs: [
        "To cancel, go to Settings > Billing and click the cancel option. You'll be asked to confirm, and you can choose to cancel immediately or at the end of your billing period. If you cancel at the end of the period, you'll continue to have full access to all your paid features until then.",
        "If you cancel immediately, your account switches to the Free plan right away. Any remaining time on your billing period is not refunded for immediate cancellations. Cancelling at the end of the billing period is usually the better choice since you've already paid for that time.",
        "After cancelling, your account, emails, and preferences are all preserved. You can re-subscribe at any time to get your paid features back."
      ],
      steps: [
        { title: "Go to Settings > Billing", description: "Navigate to the billing section in your settings." },
        { title: "Click Cancel", description: "Choose to cancel your subscription." },
        { title: "Choose when", description: "Cancel immediately or at the end of your billing period." },
        { title: "Confirm", description: "Confirm your cancellation. You can re-subscribe anytime." },
      ],
    }
  },
  {
    id: "payment-methods",
    question: "What payment methods are accepted?",
    readTime: "2 min read",
    category: "Billing & Plans",
    icon: CreditCard,
    iconColor: "#10B981",
    content: {
      intro: "MyDraft accepts all major credit and debit cards through our secure payment processor, Stripe.",
      paragraphs: [
        "We accept Visa, Mastercard, American Express, and other major credit and debit cards. All payments are processed through Stripe, one of the world's most trusted payment platforms. Your card details are never stored on MyDraft servers — they go directly to Stripe's PCI-compliant infrastructure.",
        "When you subscribe, Stripe securely stores your payment method for recurring billing. You can update your card details at any time through Settings > Billing. All transactions are encrypted and your payment information is protected to the highest industry standards."
      ],
    }
  },
  {
    id: "referral-program",
    question: "How does the referral program work?",
    readTime: "3 min read",
    category: "Billing & Plans",
    icon: Gift,
    iconColor: "#10B981",
    content: {
      intro: "Earn free credits by referring friends and colleagues to MyDraft. When a friend signs up with your link and connects their inbox, you both get 25 credits.",
      paragraphs: [
        "The referral program is available to all MyDraft users. Go to Settings > Referrals to find your unique referral link. Share it with friends, colleagues, or anyone who might benefit from MyDraft. When they sign up using your link, the referral is tracked automatically.",
        "Here's how the reward works: when a friend signs up through your link and connects their email inbox, you get 25 credits and they get 25 credits too. The credits are added to both accounts automatically — there's nothing to claim. There's no limit to how many friends you can refer.",
        "You can track your referrals in Settings > Referrals. It shows how many friends have signed up, how many have connected their inbox, and how many credits you've earned."
      ],
      steps: [
        { title: "Get your referral link", description: "Go to Settings > Referrals and copy your unique link." },
        { title: "Share with others", description: "Send the link to friends, colleagues, or share on social media." },
        { title: "They sign up and connect", description: "Your friend creates an account through your link and connects their email inbox." },
        { title: "You both get credits", description: "25 credits are added to both your account and your friend's automatically." },
      ],
      tip: "The reward only counts once your friend actually connects an email inbox — a signup alone doesn't qualify."
    }
  },
  {
    id: "data-security",
    question: "How is my data secured?",
    readTime: "4 min read",
    category: "Security & Privacy",
    icon: Shield,
    iconColor: "#EF4444",
    content: {
      intro: "MyDraft uses bank-level encryption and has been approved by Google for CASA Tier 2 security compliance with a Letter of Validation.",
      paragraphs: [
        "Your email content stored in MyDraft is encrypted at rest using AES-256-GCM, the same encryption standard used by banks and governments. This means even MyDraft's database administrators cannot read your email content. Data in transit is protected with TLS encryption, ensuring your information is secure as it travels between your device and our servers.",
        "MyDraft has passed Google's Cloud Application Security Assessment (CASA) at Tier 2 level, the highest standard required for applications that access Gmail data. We received an official Letter of Validation (LOV) from Google confirming our security meets their rigorous requirements. This assessment covers data handling, authentication, encryption, and vulnerability management.",
        "We implement additional security measures including rate limiting on all endpoints to prevent abuse, session security with httpOnly cookies, XSS prevention through content sanitization, and audit logging for sensitive actions like login attempts and password changes. Your passwords are hashed using the scrypt algorithm with random salts.",
        "For a complete overview of our security practices, visit the Security page from the main navigation."
      ],
    }
  },
  {
    id: "email-storage",
    question: "Do you store my emails?",
    readTime: "2 min read",
    category: "Security & Privacy",
    icon: Shield,
    iconColor: "#EF4444",
    content: {
      intro: "MyDraft caches emails temporarily for performance but never permanently stores your email content beyond what's needed for the features you use.",
      paragraphs: [
        "When you open MyDraft, we fetch your emails directly from Gmail or Outlook through their official APIs. Email content may be temporarily cached in encrypted form to improve loading speed and enable features like AI summarization and translation. This cached data is encrypted with AES-256-GCM.",
        "We never use your email content to train AI models. Your emails are processed only to provide features you explicitly use (like AI drafts, summaries, and translations). You can disconnect your email account at any time from Settings, which immediately revokes our access and deletes all cached data from our servers."
      ],
    }
  },
  {
    id: "disconnect-email",
    question: "How do I disconnect my email account?",
    readTime: "2 min read",
    category: "Security & Privacy",
    icon: Link2,
    iconColor: "#EF4444",
    content: {
      intro: "You can disconnect your email account at any time, which immediately revokes MyDraft's access and deletes all cached email data.",
      paragraphs: [
        "Go to Settings and find the email connection section. Click \"Disconnect\" next to your connected account. This immediately revokes the OAuth token that allows MyDraft to access your inbox, and all cached email data is permanently deleted from our servers.",
        "After disconnecting, your MyDraft account remains active with all your preferences and settings intact. You can reconnect the same email account or connect a different one at any time. Your AI preferences, writing style profile, and other account settings are preserved."
      ],
      steps: [
        { title: "Go to Settings", description: "Open Settings from the sidebar." },
        { title: "Find your connected account", description: "Look for the email connection section." },
        { title: "Click Disconnect", description: "Click the Disconnect button to revoke access." },
        { title: "Confirm", description: "Your email is disconnected and cached data is deleted." },
      ],
    }
  },
  {
    id: "delete-account",
    question: "How do I delete my account?",
    readTime: "2 min read",
    category: "Security & Privacy",
    icon: Trash2,
    iconColor: "#EF4444",
    content: {
      intro: "You can permanently delete your MyDraft account and all associated data from the account settings.",
      paragraphs: [
        "To delete your account, go to Settings > Account and scroll to the bottom where you'll find the danger zone. Click \"Delete Account\" and confirm your decision. This action is permanent and cannot be undone.",
        "When you delete your account, we remove everything: your email connection, cached emails, AI drafts, writing style profile, preferences, and all personal data. If you have an active subscription, it will be cancelled automatically. We recommend disconnecting your email account first and cancelling any subscription before deleting your account."
      ],
      steps: [
        { title: "Go to Settings > Account", description: "Navigate to your account settings." },
        { title: "Scroll to Danger Zone", description: "Find the account deletion option at the bottom." },
        { title: "Click Delete Account", description: "This starts the permanent deletion process." },
        { title: "Confirm deletion", description: "Confirm to permanently remove all your data." },
      ],
      tip: "Account deletion is permanent. Make sure to export any data you need before proceeding."
    }
  },
  {
    id: "two-factor-auth",
    question: "Does MyDraft support two-factor authentication?",
    readTime: "2 min read",
    category: "Security & Privacy",
    icon: Shield,
    iconColor: "#EF4444",
    content: {
      intro: "Yes, MyDraft supports two-factor authentication (2FA) for an extra layer of security on your account.",
      paragraphs: [
        "Two-factor authentication adds an extra step when you log in. After entering your password, you'll be asked to provide a second verification code. This means even if someone gets your password, they can't access your account without the second factor.",
        "You can enable 2FA in Settings > Security. Once enabled, you'll use an authenticator app (like Google Authenticator or Authy) to generate verification codes. We recommend enabling 2FA for anyone who uses MyDraft for business or handles sensitive communications."
      ],
      steps: [
        { title: "Go to Settings > Security", description: "Navigate to the security settings." },
        { title: "Enable 2FA", description: "Click the option to set up two-factor authentication." },
        { title: "Scan the QR code", description: "Use an authenticator app to scan the QR code." },
        { title: "Enter verification code", description: "Type the code from your app to confirm setup." },
      ],
    }
  },
  {
    id: "change-appearance",
    question: "Can I change the appearance of MyDraft?",
    readTime: "2 min read",
    category: "Customization",
    icon: Palette,
    iconColor: "#EC4899",
    content: {
      intro: "MyDraft features a sleek dark interface designed for comfortable email reading, with customization options available in Settings.",
      paragraphs: [
        "MyDraft uses a dark theme inspired by modern email clients like Superhuman and Hey.com. This design reduces eye strain during long email sessions and gives the interface a clean, focused feel. The dark theme is the default and primary experience.",
        "You can adjust your preferences in Settings > Appearance where available display options are configured. The interface is fully responsive, working smoothly on desktop browsers, tablets, and mobile phones."
      ],
    }
  },
  {
    id: "ai-preferences",
    question: "How do I change my AI preferences?",
    readTime: "2 min read",
    category: "Customization",
    icon: Settings,
    iconColor: "#EC4899",
    content: {
      intro: "Your AI preferences control how MyDraft's AI writes for you — tone, formality, language, and more. You can update them anytime.",
      paragraphs: [
        "During onboarding, you set your initial AI preferences including your preferred writing tone (professional, casual, or friendly), your region, preferred language, and how you typically use email. These preferences shape every AI-generated draft and response.",
        "To update your preferences, go to Settings > AI Preferences. Here you can change your writing tone, adjust your region and language for culturally-aware communication, set your formality level, and fine-tune other AI behavior. Changes apply immediately to all future AI interactions."
      ],
      steps: [
        { title: "Go to Settings", description: "Open Settings from the sidebar or profile menu." },
        { title: "Click AI Preferences", description: "Select the AI tab in your settings." },
        { title: "Update your preferences", description: "Change tone, language, region, formality, or other options." },
        { title: "Save changes", description: "Your new preferences apply to all future AI features immediately." },
      ],
    }
  },
  {
    id: "email-signature",
    question: "How do I set up my email signature?",
    readTime: "2 min read",
    category: "Customization",
    icon: FileText,
    iconColor: "#EC4899",
    content: {
      intro: "Set up an email signature once and it's automatically added to every email you send — new messages, replies, and forwards.",
      paragraphs: [
        "Go to Settings > Email to create or edit your signature. Type your signature text — this could be your name, title, company, phone number, or any other information you want at the bottom of your emails. The signature is saved to your account and persists across sessions.",
        "Once you've set a signature, it's automatically appended to every email you compose, including replies and forwards. It's also included in AI-generated drafts, so your branding and contact info are always consistent. If you compose an email without a signature set up, MyDraft will show a helpful banner suggesting you add one."
      ],
      steps: [
        { title: "Go to Settings > Email", description: "Navigate to the email settings section." },
        { title: "Write your signature", description: "Type your name, title, company, phone, or other info." },
        { title: "Save", description: "Your signature is now auto-added to all outgoing emails." },
      ],
      tip: "Keep your signature concise — a few lines with your name, title, and one or two contact methods works best."
    }
  },
  {
    id: "multilingual",
    question: "How do I use MyDraft in my language?",
    readTime: "2 min read",
    category: "Customization",
    icon: Globe,
    iconColor: "#EC4899",
    content: {
      intro: "MyDraft supports over 30 languages for AI features including drafts, translations, and summaries.",
      paragraphs: [
        "To set your preferred language, go to Settings > AI Preferences and update your language and region. When you set a language, AI-generated drafts and replies will be written in that language by default. Translations will also default to your preferred language.",
        "MyDraft's AI is culturally aware — when you set your region, the AI adapts its communication style to match cultural norms. For example, emails drafted for a Japanese audience will use more formal language, while drafts for an Australian audience might be more casual. This helps you communicate naturally with people around the world."
      ],
    }
  },
  {
    id: "voice-assistant",
    question: "How do I use the voice assistant?",
    readTime: "2 min read",
    category: "AI Features",
    icon: Mic,
    iconColor: "#F59E0B",
    content: {
      intro: "Business plan users can use voice to interact with MyDraft — dictate emails, ask questions, and manage their inbox hands-free.",
      paragraphs: [
        "The voice assistant is available on the Business plan. Click the microphone icon to start speaking. You can dictate emails, ask the AI assistant questions about your inbox, or give voice commands. MyDraft uses advanced speech recognition to convert your words into text accurately.",
        "This feature is especially useful when you're on the go or prefer speaking over typing. You can dictate a full email reply, ask \"What unread emails do I have?\" or say \"Draft a follow-up email to the meeting invite.\" The AI processes your voice input just like typed text."
      ],
      steps: [
        { title: "Find the microphone icon", description: "Look for the mic button in the AI assistant or compose window." },
        { title: "Click and speak", description: "Click the microphone and start talking." },
        { title: "Review the transcription", description: "Your speech is converted to text for review." },
        { title: "Send or continue editing", description: "Edit the transcribed text if needed, then proceed." },
      ],
      tip: "Speak clearly and at a natural pace for the best transcription accuracy."
    }
  },
  {
    id: "mobile-use",
    question: "Can I use MyDraft on my phone?",
    readTime: "2 min read",
    category: "Tips & Tricks",
    icon: Globe,
    iconColor: "#6366F1",
    content: {
      intro: "Yes, MyDraft is fully responsive and works great on phones and tablets through your mobile browser.",
      paragraphs: [
        "MyDraft's interface automatically adapts to your screen size. On mobile, you get a streamlined view with touch-friendly buttons, swipe gestures for quick actions, and an optimized layout that makes reading and writing emails comfortable on smaller screens.",
        "Simply open MyDraft in your mobile browser (Chrome, Safari, Firefox, etc.) and log in. All features work on mobile including AI drafts, email composition, inbox management, and settings. The experience is designed to feel native even though it runs in the browser."
      ],
    }
  },
  {
    id: "inbox-zero",
    question: "Any tips for reaching inbox zero?",
    readTime: "3 min read",
    category: "Tips & Tricks",
    icon: Inbox,
    iconColor: "#6366F1",
    content: {
      intro: "MyDraft is built to help you get to inbox zero faster. Here are some tips to make the most of it.",
      paragraphs: [
        "Start with an AI cleanup scan. This is the fastest way to clear out junk, old promotions, and newsletters you never read. Run the scan, uncheck anything important, and clean up the rest in one tap. Most people can remove 30-50% of their inbox clutter this way.",
        "Use the star feature for emails that need action. Star anything you need to respond to or follow up on, then archive everything else. Your Starred folder becomes your to-do list, and your inbox stays clean.",
        "Let AI handle the replies. For routine emails — confirmations, acknowledgments, simple questions — use the AI draft feature. It generates a response in seconds, you review and tweak it, then send. This alone can save hours each week.",
        "Set up custom folders with AI descriptions for recurring categories of email (invoices, project updates, client communications). The AI cleanup scanner will automatically suggest sorting new emails into the right folders."
      ],
    }
  },
  {
    id: "contact-support",
    question: "How do I contact support?",
    readTime: "1 min read",
    category: "General",
    icon: Mail,
    iconColor: "#6B7280",
    content: {
      intro: "You can reach MyDraft support through the contact form at the bottom of this help page or by emailing us directly.",
      paragraphs: [
        "Scroll down to find the contact form below. Fill in your name, email, and describe your issue or question. Our support team typically responds within 24 hours. You can also email us directly at support@mydraft.io.",
        "When contacting support, include as much detail as possible about your issue — what you were trying to do, what happened instead, and any error messages you saw. This helps us resolve your issue faster."
      ],
    }
  },
  {
    id: "search-inbox",
    question: "How do I search for emails?",
    readTime: "2 min read",
    category: "Inbox & Email",
    icon: Search,
    iconColor: "#8B5CF6",
    content: {
      intro: "MyDraft has a built-in search bar that lets you quickly find any email by subject, sender, or content.",
      paragraphs: [
        "The search bar is located at the top of your email list. Click on it and start typing — results appear instantly as you type. You can search by sender name, email address, subject line, or keywords from the email body. The search covers all your emails across every folder.",
        "Search results are displayed in the same list format as your inbox, so you can click on any result to open and read the full email. You can also use search to find specific conversations or track down an email you remember receiving but can't locate in your inbox."
      ],
      steps: [
        { title: "Click the search bar", description: "Find it at the top of your email list." },
        { title: "Type your search", description: "Enter a name, subject, or keyword." },
        { title: "Browse results", description: "Matching emails appear instantly as you type." },
        { title: "Open an email", description: "Click any result to read the full message." },
      ],
    }
  },
  {
    id: "select-multiple",
    question: "How do I select and manage multiple emails at once?",
    readTime: "2 min read",
    category: "Inbox & Email",
    icon: CheckCircle2,
    iconColor: "#8B5CF6",
    content: {
      intro: "You can select multiple emails at once to archive, delete, or move them in bulk — saving time when cleaning up your inbox.",
      paragraphs: [
        "To enter selection mode, long-press (press and hold) on any email in your list. You'll see a checkbox appear next to each email. Tap additional emails to add them to your selection. The action bar at the top shows how many emails you've selected and gives you bulk action buttons.",
        "Once you've selected the emails you want, use the action buttons to archive all of them, delete them, or move them to a folder. This is much faster than handling emails one by one, especially when you're catching up on a full inbox.",
        "On desktop, you can also click the checkbox area that appears when hovering over an email to select it without long-pressing."
      ],
      steps: [
        { title: "Long-press an email", description: "Press and hold on any email to start selecting." },
        { title: "Tap more emails", description: "Tap additional emails to add them to your selection." },
        { title: "Use bulk actions", description: "Archive, delete, or move all selected emails at once." },
        { title: "Exit selection mode", description: "Tap the X or deselect all emails to return to normal view." },
      ],
    }
  },
  {
    id: "mark-read-unread",
    question: "How do I mark emails as read or unread?",
    readTime: "2 min read",
    category: "Inbox & Email",
    icon: Eye,
    iconColor: "#8B5CF6",
    content: {
      intro: "You can mark emails as read or unread to keep track of which messages still need your attention.",
      paragraphs: [
        "Emails are automatically marked as read when you open them. If you want to mark an email as unread again (to remind yourself to deal with it later), open the email and use the action menu to toggle its read status. This puts the bold/unread styling back so it stands out in your list.",
        "You can also mark multiple emails as read at once by selecting them in bulk and using the mark-as-read action. This is useful when you've quickly scanned a batch of emails and know they don't need responses."
      ],
      steps: [
        { title: "Open the email", description: "Click on any email to view it." },
        { title: "Find the action menu", description: "Look for the more options menu in the email view." },
        { title: "Toggle read/unread", description: "Click 'Mark as unread' to flag it for later attention." },
      ],
    }
  },
  {
    id: "swipe-gestures",
    question: "How do swipe gestures work on mobile?",
    readTime: "2 min read",
    category: "Inbox & Email",
    icon: Smartphone,
    iconColor: "#8B5CF6",
    content: {
      intro: "On mobile devices, you can swipe left or right on emails for quick actions — no need to open menus.",
      paragraphs: [
        "Swipe gestures make managing your inbox fast and intuitive on phones and tablets. Swipe right on an email to archive it instantly. Swipe left to delete it. These gestures work throughout the email list and feel natural once you get used to them.",
        "The swipe actions are designed to match what most people do most often — archive things they've dealt with and delete things they don't need. For other actions like starring, replying, or moving to folders, open the email and use the action buttons.",
        "Swipe gestures are only available on touch devices (phones and tablets). On desktop, use the action buttons that appear when you hover over an email or open it."
      ],
    }
  },
  {
    id: "cc-bcc",
    question: "How do I use Cc and Bcc in emails?",
    readTime: "2 min read",
    category: "Inbox & Email",
    icon: AtSign,
    iconColor: "#8B5CF6",
    content: {
      intro: "Cc (Carbon Copy) and Bcc (Blind Carbon Copy) let you send emails to additional recipients beyond the main To field.",
      paragraphs: [
        "When composing an email, you'll see Cc and Bcc fields below the To field. Cc is used when you want someone to receive a copy of the email and everyone can see they're included. Bcc is for when you want to include someone without other recipients knowing — their address is hidden from everyone else.",
        "Both Cc and Bcc fields support the same contact autocomplete as the To field. As you type, MyDraft suggests people you've previously emailed. You can add multiple addresses to each field. Cc'd recipients can see all other recipients, while Bcc'd recipients are completely hidden."
      ],
      steps: [
        { title: "Open compose", description: "Click Compose to start a new email." },
        { title: "Expand Cc/Bcc", description: "Click the Cc or Bcc labels to show those fields." },
        { title: "Add recipients", description: "Type email addresses in the Cc or Bcc fields." },
        { title: "Send normally", description: "Compose your message and send as usual." },
      ],
    }
  },
  {
    id: "attachments",
    question: "How do I view and download attachments?",
    readTime: "2 min read",
    category: "Inbox & Email",
    icon: Paperclip,
    iconColor: "#8B5CF6",
    content: {
      intro: "MyDraft lets you view and download file attachments from emails you receive.",
      paragraphs: [
        "When an email has attachments, you'll see them listed at the bottom of the email or indicated by an attachment icon in the email list. Click on an attachment to download it to your device. Common file types like images, PDFs, and documents can often be previewed directly.",
        "For security, MyDraft scans attachments for potential threats. Certain file types that are commonly used for malware (like .exe files) may be blocked. This helps protect your device from malicious attachments while still letting you access legitimate files."
      ],
      steps: [
        { title: "Open the email", description: "Click on an email that has attachments." },
        { title: "Find the attachments", description: "Scroll down to see attached files listed at the bottom." },
        { title: "Download or preview", description: "Click an attachment to download it or preview it inline." },
      ],
      tip: "MyDraft automatically scans attachments for security threats to keep you safe."
    }
  },
  {
    id: "email-scheduling",
    question: "Can I schedule emails to send later?",
    readTime: "2 min read",
    category: "Inbox & Email",
    icon: CalendarClock,
    iconColor: "#8B5CF6",
    content: {
      intro: "Pro and Business users can schedule emails to be sent at a specific date and time, perfect for working across time zones or planning ahead.",
      paragraphs: [
        "When composing an email, instead of clicking Send immediately, look for the schedule option. You can pick a specific date and time for the email to be delivered. This is useful when you're writing emails outside business hours or want to reach someone in a different time zone at the right moment.",
        "Scheduled emails are saved and sent automatically at the time you specify. You can view and manage your scheduled emails before they're sent, including editing the content or cancelling the scheduled send if you change your mind."
      ],
      steps: [
        { title: "Compose your email", description: "Write your email as normal." },
        { title: "Click the schedule option", description: "Look for the clock icon or Schedule Send button." },
        { title: "Pick a date and time", description: "Choose when you want the email delivered." },
        { title: "Confirm", description: "The email will be sent automatically at the scheduled time." },
      ],
    }
  },
  {
    id: "ai-refine",
    question: "How do I use AI to improve a draft I've written?",
    readTime: "2 min read",
    category: "AI Features",
    icon: Pencil,
    iconColor: "#F59E0B",
    content: {
      intro: "Already started writing a reply? The AI refine feature can polish your draft — fix grammar, improve tone, and make it more professional.",
      paragraphs: [
        "When you've written a draft but want to improve it, use the AI refine option. The AI will take your existing text and enhance it — fixing grammar and spelling, improving sentence structure, adjusting the tone to match your preferences, and making the overall message more polished and professional.",
        "The refine feature preserves your original intent and key points. It doesn't rewrite your message from scratch — it improves what you've already written. This is perfect when you've gotten your thoughts down but want to make sure the email reads well before sending.",
        "You can refine as many times as you want. Each refinement builds on the previous version, so you can keep polishing until you're happy with the result."
      ],
      steps: [
        { title: "Write your draft", description: "Type your reply or new email in the editor." },
        { title: "Click AI Refine", description: "Look for the refine option in the compose toolbar." },
        { title: "Review improvements", description: "The AI enhances your text while keeping your message intact." },
        { title: "Send when ready", description: "Make any final tweaks and send." },
      ],
    }
  },
  {
    id: "ai-limits",
    question: "How do AI credits work for each plan?",
    readTime: "2 min read",
    category: "AI Features",
    icon: RefreshCw,
    iconColor: "#F59E0B",
    content: {
      intro: "Every AI action uses credits. Here's how many credits each plan includes and what different actions cost.",
      paragraphs: [
        "Free users get 10 AI credits per month, Pro users get 50, and Business users get 200. Your monthly credits refresh each billing cycle, and credits expire 30 days after they're added. If you run out, you can still compose and send emails manually — only the AI features pause until you have credits again.",
        "Different AI actions cost different amounts. An AI reply or compose costs 2 credits, while a summary, rewrite, grammar check, translation, AI chat message, or read-aloud costs 1 credit each. Language detection is free. You can always see your balance in the sidebar and on the Credits page.",
        "Need more? You can buy one-time credit packs (50 credits for $4.99 up to 1,500 for $99.99) or add a recurring monthly top-up to your plan. Referring a friend earns you 25 bonus credits when they connect an email account."
      ],
    }
  },
  {
    id: "spam-phishing",
    question: "How does MyDraft handle spam and phishing emails?",
    readTime: "3 min read",
    category: "Security & Privacy",
    icon: ShieldAlert,
    iconColor: "#EF4444",
    content: {
      intro: "MyDraft works alongside your email provider's spam filters and adds its own AI-powered detection during inbox cleanup scans.",
      paragraphs: [
        "Your email provider (Gmail or Outlook) already filters most spam before it reaches your inbox. MyDraft respects these filters and shows spam emails in a separate Spam folder. You can move emails to spam manually if something slips through, or rescue legitimate emails that were incorrectly flagged.",
        "During AI cleanup scans, MyDraft's AI can identify potentially suspicious or phishing emails and suggest moving them to spam. It looks for red flags like deceptive sender addresses, urgent language designed to trick you, suspicious links, and emails pretending to be from known companies.",
        "The AI is careful to distinguish between legitimate promotional emails and actual phishing attempts. Known companies (Google, Apple, Amazon, banks, etc.) are never marked as spam, even if their emails are unwanted — those are flagged as junk instead."
      ],
      steps: [
        { title: "Check your Spam folder", description: "Open the Spam folder from the sidebar to review filtered emails." },
        { title: "Report spam manually", description: "Move suspicious emails to Spam using the action menu." },
        { title: "Run AI cleanup", description: "The AI scan can catch phishing emails your provider missed." },
        { title: "Rescue false positives", description: "Move legitimate emails out of Spam back to your inbox." },
      ],
      tip: "Never click links or download attachments from emails you don't recognize. When in doubt, delete it."
    }
  },
  {
    id: "change-password",
    question: "How do I change my password?",
    readTime: "2 min read",
    category: "Security & Privacy",
    icon: Lock,
    iconColor: "#EF4444",
    content: {
      intro: "You can change your MyDraft password at any time from your account settings.",
      paragraphs: [
        "Go to Settings > Security and look for the password change option. You'll need to enter your current password first for verification, then type your new password. Choose a strong password — at least 8 characters with a mix of letters, numbers, and symbols.",
        "When you change your password, all active sessions on other devices are automatically terminated for security. You'll need to log in again on any other devices you use. This prevents unauthorized access if your old password was compromised."
      ],
      steps: [
        { title: "Go to Settings", description: "Open Settings from the sidebar." },
        { title: "Click Security", description: "Navigate to the Security tab." },
        { title: "Enter current password", description: "Type your existing password for verification." },
        { title: "Set new password", description: "Enter and confirm your new password." },
      ],
    }
  },
  {
    id: "email-notifications",
    question: "How do email notifications work?",
    readTime: "2 min read",
    category: "Customization",
    icon: Bell,
    iconColor: "#EC4899",
    content: {
      intro: "MyDraft syncs your inbox in real time so you always see the latest emails when you open the app.",
      paragraphs: [
        "When you open MyDraft, your inbox is automatically synced with your email provider to show the latest messages. New emails appear at the top of your inbox list. The sync happens in the background so you don't need to manually refresh.",
        "If you want to manually trigger a sync, you can pull down to refresh on mobile or click the refresh button in the inbox toolbar. MyDraft also shows unread counts on each folder in the sidebar so you can see at a glance where new messages are waiting."
      ],
    }
  },
  {
    id: "promo-codes",
    question: "How do I use a promo code?",
    readTime: "2 min read",
    category: "Billing & Plans",
    icon: TicketPercent,
    iconColor: "#10B981",
    content: {
      intro: "If you have a promo code, you can apply it during checkout or in your billing settings to get a discount on your subscription.",
      paragraphs: [
        "Promo codes can be applied when you're subscribing to a paid plan. During the checkout process, look for a \"Promo Code\" or \"Discount Code\" field. Enter your code there and the discount will be applied to your subscription. You'll see the updated price before confirming your payment.",
        "Each promo code is single-use and has an expiration date, so we recommend applying it as soon as possible. Some codes give you a percentage off, while others give you a free month of Pro. (Note: the referral program rewards you with credits automatically, not promo codes — see the referral FAQ for details.)"
      ],
      steps: [
        { title: "Start checkout", description: "Choose a plan and go to the payment page." },
        { title: "Find the promo code field", description: "Look for 'Promo Code' or 'Discount Code' on the checkout form." },
        { title: "Enter your code", description: "Type or paste your promo code." },
        { title: "Verify the discount", description: "Check that the price updated before completing payment." },
      ],
    }
  },
  {
    id: "billing-annual",
    question: "Should I choose monthly or annual billing?",
    readTime: "2 min read",
    category: "Billing & Plans",
    icon: CreditCard,
    iconColor: "#10B981",
    content: {
      intro: "Annual billing saves you money — up to $49 per year on the Business plan compared to paying monthly.",
      paragraphs: [
        "Both Pro and Business plans offer monthly and annual billing options. With annual billing, you pay for the whole year upfront at a discounted rate. Pro is $4.99/month or $8.25/month billed annually at $99/year (saving $21). Business is $14.99/month or $24.92/month billed annually at $299/year (saving $49).",
        "Annual billing is the better value if you plan to use MyDraft long-term. You can switch from monthly to annual billing at any time from Settings > Billing. The change takes effect at your next billing cycle. If you're not sure yet, start with monthly and switch to annual once you've decided MyDraft is right for you."
      ],
    }
  },
  {
    id: "export-data",
    question: "Can I export my data from MyDraft?",
    readTime: "2 min read",
    category: "Security & Privacy",
    icon: Download,
    iconColor: "#EF4444",
    content: {
      intro: "Your emails always remain in your Gmail or Outlook account. MyDraft doesn't hold your emails hostage — they're always accessible through your email provider.",
      paragraphs: [
        "Since MyDraft connects to your existing email account through OAuth, all your emails remain stored by Google or Microsoft. If you ever stop using MyDraft, your emails are exactly where they've always been — in your Gmail or Outlook inbox. Nothing is lost.",
        "Your AI drafts, writing style profile, and preferences are stored in MyDraft. If you want to stop using the service, you can disconnect your email account and delete your MyDraft account. Your emails continue to exist in your email provider's servers regardless of what you do in MyDraft."
      ],
    }
  },
];

const categoryColors: Record<string, string> = {
  "Getting Started": "#3B82F6",
  "Inbox & Email": "#8B5CF6",
  "AI Features": "#F59E0B",
  "Billing & Plans": "#10B981",
  "Security & Privacy": "#EF4444",
  "Customization": "#EC4899",
  "Tips & Tricks": "#6366F1",
  "General": "#6B7280",
};

const categoryIcons: Record<string, any> = {
  "Getting Started": BookOpen,
  "Inbox & Email": Inbox,
  "AI Features": Sparkles,
  "Billing & Plans": CreditCard,
  "Security & Privacy": Shield,
  "Customization": Palette,
  "Tips & Tricks": MousePointerClick,
  "General": HelpCircle,
};

function AnimatedStep({ step, index, total }: { step: { title: string; description: string }; index: number; total: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex gap-4 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transitionDelay: `${index * 120}ms`,
      }}
    >
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: "rgba(59,130,246,0.15)", color: "#60A5FA", border: "1.5px solid rgba(59,130,246,0.3)" }}
        >
          {index + 1}
        </div>
        {index < total - 1 && (
          <div className="w-px flex-1 min-h-[20px] mt-1" style={{ background: "rgba(var(--overlay-rgb), 0.06)" }} />
        )}
      </div>
      <div className="pb-5">
        <p className="text-sm font-medium text-foreground/80">{step.title}</p>
        <p className="text-xs text-foreground/40 mt-0.5 leading-relaxed">{step.description}</p>
      </div>
    </div>
  );
}

function ArticleView({ article, onBack }: { article: HelpArticle; onBack: () => void }) {
  const catColor = categoryColors[article.category] || "#6B7280";

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-foreground/40 hover:text-foreground/70 transition-colors cursor-pointer mb-8"
        data-testid="button-back-to-articles"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Help Center
      </button>

      <div className="mb-6">
        <span
          className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md inline-block mb-4"
          style={{ background: `${catColor}15`, color: catColor }}
        >
          {article.category}
        </span>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground/90 mb-4">
          {article.question}
        </h1>
        <div className="flex items-center gap-3">
          <img src={draftLogo} alt="MyDraft" className="w-6 h-6 rounded-full" style={{ background: "rgba(var(--overlay-rgb), 0.1)" }} />
          <span className="text-sm text-foreground/50">MyDraft</span>
          <span className="text-foreground/15">|</span>
          <span className="text-sm text-foreground/35 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {article.readTime}
          </span>
        </div>
      </div>

      <div className="h-px w-full mb-8" style={{ background: "rgba(var(--overlay-rgb), 0.06)" }} />

      <div className="space-y-5">
        <p className="text-base text-foreground/60 leading-relaxed font-medium">
          {article.content.intro}
        </p>

        {article.content.paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-foreground/50 leading-relaxed">
            {p}
          </p>
        ))}

        {article.content.steps && article.content.steps.length > 0 && (
          <div
            className="rounded-xl p-5 mt-6"
            style={{ background: "rgba(var(--overlay-rgb), 0.02)", border: "1px solid rgba(var(--overlay-rgb), 0.06)" }}
          >
            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5" />
              How to do it
            </p>
            <div>
              {article.content.steps.map((step, i) => (
                <AnimatedStep key={i} step={step} index={i} total={article.content.steps!.length} />
              ))}
            </div>
          </div>
        )}

        {article.content.tip && (
          <div
            className="rounded-xl p-4 flex items-start gap-3 mt-4"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-300/70 leading-relaxed">
              <span className="font-medium text-blue-300/90">Tip: </span>
              {article.content.tip}
            </p>
          </div>
        )}
      </div>

      <div className="h-px w-full my-10" style={{ background: "rgba(var(--overlay-rgb), 0.06)" }} />

      <div className="flex items-center gap-3 mb-8">
        <img src={draftLogo} alt="MyDraft" className="w-8 h-8 rounded-full" style={{ background: "rgba(var(--overlay-rgb), 0.1)" }} />
        <div>
          <p className="text-sm font-medium text-foreground/60">MyDraft</p>
          <p className="text-xs text-foreground/30">Help Center</p>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({ article, onClick }: { article: HelpArticle; onClick: () => void }) {
  const Icon = article.icon;
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      onClick={onClick}
      className="w-full text-left rounded-xl p-4 cursor-pointer transition-all duration-200 group"
      style={{
        background: "rgba(var(--overlay-rgb), 0.02)",
        border: "1px solid rgba(var(--overlay-rgb), 0.06)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s, transform 0.4s, background 0.2s, border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(var(--overlay-rgb), 0.04)";
        e.currentTarget.style.borderColor = "rgba(var(--overlay-rgb), 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(var(--overlay-rgb), 0.02)";
        e.currentTarget.style.borderColor = "rgba(var(--overlay-rgb), 0.06)";
      }}
      data-testid={`article-card-${article.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${article.iconColor}15` }}
        >
          <Icon className="w-4 h-4" style={{ color: article.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground/75 group-hover:text-foreground/90 transition-colors leading-snug">
            {article.question}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-foreground/25 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {article.readTime}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-foreground/15 group-hover:text-foreground/30 transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const contactMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; message: string }) => {
      await apiRequest("POST", "/api/support/contact", data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const categories = useMemo(() => {
    const cats = new Map<string, HelpArticle[]>();
    for (const article of articles) {
      if (!cats.has(article.category)) cats.set(article.category, []);
      cats.get(article.category)!.push(article);
    }
    return Array.from(cats.entries());
  }, []);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      a =>
        a.question.toLowerCase().includes(q) ||
        a.content.intro.toLowerCase().includes(q) ||
        a.content.paragraphs.some(p => p.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const selectedArticle = selectedArticleId ? articles.find(a => a.id === selectedArticleId) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    contactMutation.mutate({
      name: contactName,
      email: contactEmail,
      message: contactMessage,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Help Center — Guides & FAQ | MyDraft"
        description="Find answers about connecting email, AI reply drafting, credits, custom folders, billing, and more in the MyDraft help center."
        path="/help"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: articles
              .filter((a) => a.question && a.content?.intro)
              .map((a) => ({
                "@type": "Question",
                name: a.question,
                acceptedAnswer: { "@type": "Answer", text: a.content.intro },
              })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://mydraft.io/" },
              { "@type": "ListItem", position: 2, name: "Help Center", item: "https://mydraft.io/help" },
            ],
          },
        ]}
      />
      <MarketingNav />

      <main className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {selectedArticle ? (
            <ArticleView article={selectedArticle} onBack={() => setSelectedArticleId(null)} />
          ) : (
            <>
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Help Center
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
                  How can we help you?
                </h1>
                <p className="text-muted-foreground text-base max-w-xl mx-auto">
                  Browse articles or search to find answers to your questions.
                </p>
              </div>

              <div className="relative max-w-xl mx-auto mb-10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 h-12 text-base bg-card/50 border-black/10 dark:border-white/10 focus:border-primary/50"
                  data-testid="input-search-help"
                />
                {searchQuery && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {filteredArticles?.length || 0} result{(filteredArticles?.length || 0) !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {filteredArticles ? (
                filteredArticles.length === 0 ? (
                  <div className="text-center py-16">
                    <HelpCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No results found</h3>
                    <p className="text-muted-foreground text-sm">
                      Try different keywords or contact support below.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 mb-16">
                    {filteredArticles.map(article => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        onClick={() => { setSelectedArticleId(article.id); setSearchQuery(""); }}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-10 mb-16">
                  {categories.map(([category, catArticles]) => {
                    const CatIcon = categoryIcons[category] || HelpCircle;
                    const color = categoryColors[category] || "#6B7280";
                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2.5 mb-3 px-1">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: `${color}15` }}
                          >
                            <CatIcon className="w-3.5 h-3.5" style={{ color }} />
                          </div>
                          <h2 className="text-sm font-semibold text-foreground/60">{category}</h2>
                          <span className="text-xs text-foreground/20">{catArticles.length} articles</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catArticles.map(article => (
                            <ArticleCard
                              key={article.id}
                              article={article}
                              onClick={() => setSelectedArticleId(article.id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  background: "linear-gradient(145deg, rgba(var(--overlay-rgb), 0.03) 0%, rgba(var(--overlay-rgb), 0.01) 100%)",
                  border: "1px solid rgba(var(--overlay-rgb), 0.06)",
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-lg font-semibold mb-1">Still need help?</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Send us a message and we'll get back to you within 24 hours.
                </p>

                {isSubmitted ? (
                  <div className="py-6">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <h3 className="text-base font-medium mb-1">Message sent!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      We'll respond within 24 hours.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSubmitted(false)}
                      data-testid="button-send-another"
                    >
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-3 text-left">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs">Name</Label>
                        <Input
                          id="name"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Your name"
                          className="bg-background/50 border-black/10 dark:border-white/10 h-10"
                          data-testid="input-contact-name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="bg-background/50 border-black/10 dark:border-white/10 h-10"
                          data-testid="input-contact-email"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="message" className="text-xs">Message</Label>
                      <Textarea
                        id="message"
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="How can we help you?"
                        rows={3}
                        className="bg-background/50 border-black/10 dark:border-white/10 resize-none"
                        data-testid="input-contact-message"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={contactMutation.isPending}
                      data-testid="button-submit-contact"
                    >
                      {contactMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-black/[0.06] dark:border-white/[0.06] py-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground mb-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="footer-link-privacy">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="footer-link-terms">Terms</Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors" data-testid="footer-link-cookies">Cookies</Link>
            <Link href="/acceptable-use" className="hover:text-foreground transition-colors" data-testid="footer-link-aup">Acceptable Use</Link>
            <Link href="/dpa" className="hover:text-foreground transition-colors" data-testid="footer-link-dpa">DPA</Link>
            <Link href="/ai-policy" className="hover:text-foreground transition-colors" data-testid="footer-link-ai">AI Policy</Link>
            <Link href="/refund-policy" className="hover:text-foreground transition-colors" data-testid="footer-link-refund">Refunds</Link>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} MyDraft. All rights reserved.</p>
            <a href="mailto:support@mydraft.io" className="hover:text-foreground transition-colors" data-testid="footer-email">support@mydraft.io</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
