import nodemailer, { Transporter } from 'nodemailer';
import crypto from 'crypto';
import { headers } from 'next/headers';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

let cachedTransport: Transporter | null = null;

export function isSmtpEnabled(): boolean {
  return !!process.env.SMTP_HOST;
}

function getTransport(): Transporter | null {
  if (!isSmtpEnabled()) return null;
  if (cachedTransport) return cachedTransport;

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USERNAME || '';
  const pass = process.env.SMTP_PASSWORD || '';

  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });
  return cachedTransport;
}

function fromAddress(): string {
  return process.env.SMTP_FROM || 'noreply@didnotreadit.local';
}

async function baseUrl(): Promise<string> {
  const envUrl = (process.env.APP_BASE_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (!host) return '';
    const proto = h.get('x-forwarded-proto') || (process.env.COOKIE_SECURE === 'true' ? 'https' : 'http');
    return `${proto}://${host}`;
  } catch {
    return '';
  }
}

async function send(to: string, subject: string, text: string, html: string): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    console.log(`[email] SMTP not configured, skipping message to ${to} (${subject})`);
    return;
  }
  try {
    await transport.sendMail({ from: fromAddress(), to, subject, text, html });
  } catch (err) {
    console.error(`[email] failed to send to ${to}:`, err);
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${await baseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = 'Confirm your didnotreadit email';
  const text = `Click to confirm your email address:\n\n${link}\n\nIf you didn't request this, ignore this message.`;
  const html = `<p>Click to confirm your email address:</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, ignore this message.</p>`;
  await send(to, subject, text, html);
}

export async function sendReplyNotification(opts: {
  to: string;
  recipientUsername: string;
  replierUsername: string;
  kind: 'post' | 'comment';
  postId: string;
  postTitle: string;
  snippet: string;
}): Promise<void> {
  const link = `${await baseUrl()}/post/${opts.postId}`;
  const target = opts.kind === 'post' ? 'your post' : 'your comment';
  const subject = `u/${opts.replierUsername} replied to ${target}`;
  const text = `u/${opts.replierUsername} replied to ${target} "${opts.postTitle}":\n\n${opts.snippet}\n\n${link}`;
  const html = `<p><strong>u/${opts.replierUsername}</strong> replied to ${target} <em>${opts.postTitle}</em>:</p><blockquote>${opts.snippet}</blockquote><p><a href="${link}">View the thread</a></p>`;
  await send(opts.to, subject, text, html);
}

export async function sendNewPostNotification(opts: {
  to: string;
  recipientUsername: string;
  posterUsername: string;
  subredditName: string;
  postId: string;
  postTitle: string;
}): Promise<void> {
  const link = `${await baseUrl()}/post/${opts.postId}`;
  const subject = `New post in d/${opts.subredditName}`;
  const text = `u/${opts.posterUsername} posted in d/${opts.subredditName}:\n\n${opts.postTitle}\n\n${link}`;
  const html = `<p><strong>u/${opts.posterUsername}</strong> posted in <strong>d/${opts.subredditName}</strong>:</p><p><a href="${link}">${opts.postTitle}</a></p>`;
  await send(opts.to, subject, text, html);
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
