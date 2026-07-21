import type { ChannelProvider } from "./types";
import { simulatorProvider } from "./simulator";
import { resendProvider } from "./resend";
import { twilioSmsProvider, twilioWhatsAppProvider } from "./twilio";

// ─────────────────────────────────────────────────────────────────────────────
// Provider registry — one env var per channel selects which ChannelProvider
// handles it. Everything defaults to "simulator" so the demo path needs zero
// configuration. Going live with a real provider later is a one-line env
// change (e.g. EMAIL_PROVIDER=resend), not a code change.
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDERS_BY_CHANNEL: Record<string, Record<string, ChannelProvider>> = {
  EMAIL: {
    simulator: simulatorProvider,
    resend: resendProvider,
  },
  SMS: {
    simulator: simulatorProvider,
    twilio: twilioSmsProvider,
  },
  WHATSAPP: {
    simulator: simulatorProvider,
    twilio: twilioWhatsAppProvider,
  },
  RCS: {
    simulator: simulatorProvider,
  },
};

const ENV_VAR_BY_CHANNEL: Record<string, string> = {
  EMAIL: "EMAIL_PROVIDER",
  SMS: "SMS_PROVIDER",
  WHATSAPP: "WHATSAPP_PROVIDER",
  RCS: "RCS_PROVIDER",
};

/**
 * Resolves the ChannelProvider for a given channel, honouring the matching
 * `<CHANNEL>_PROVIDER` env var (default: "simulator"). Throws on an unknown
 * channel or an unknown/unimplemented provider name so misconfiguration fails
 * loudly instead of silently falling back.
 */
export function getProvider(channel: string): ChannelProvider {
  const normalizedChannel = channel.toUpperCase();
  const providers = PROVIDERS_BY_CHANNEL[normalizedChannel];
  if (!providers) {
    throw new Error(`No providers registered for channel: ${channel}`);
  }

  const envVar = ENV_VAR_BY_CHANNEL[normalizedChannel];
  const providerName = (process.env[envVar] ?? "simulator").trim().toLowerCase();

  const provider = providers[providerName];
  if (!provider) {
    throw new Error(
      `Unknown provider "${providerName}" for channel ${normalizedChannel} ` +
      `(set via ${envVar}). Available: ${Object.keys(providers).join(", ")}`
    );
  }

  return provider;
}

export type { ChannelProvider, SendPayload, SendResult } from "./types";
