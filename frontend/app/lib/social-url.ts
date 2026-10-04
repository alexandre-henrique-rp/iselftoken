export type SocialNetwork = "instagram" | "twitter" | "linkedin";

const HOSTS: Record<SocialNetwork, string[]> = {
  instagram: ["instagram.com", "www.instagram.com"],
  twitter: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
};

export function isOfficialSocialUrl(value: string, network: SocialNetwork) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && HOSTS[network].includes(url.hostname.toLowerCase()) && url.pathname.length > 1;
  } catch {
    return false;
  }
}

export const socialUrlMessage = (label: string) =>
  `${label} deve ser uma URL HTTPS oficial (ex.: https://...).`;
