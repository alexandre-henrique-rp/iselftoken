export type SocialNetwork = 'instagram' | 'twitter' | 'linkedin';

const HOSTS: Record<SocialNetwork, ReadonlySet<string>> = {
  instagram: new Set(['instagram.com', 'www.instagram.com']),
  twitter: new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']),
  linkedin: new Set(['linkedin.com', 'www.linkedin.com']),
};

export function isOfficialSocialUrl(
  value: string,
  network: SocialNetwork,
): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      HOSTS[network].has(url.hostname.toLowerCase()) &&
      Boolean(url.pathname && url.pathname !== '/')
    );
  } catch {
    return false;
  }
}

export function validateSocialUrls(
  values: Partial<Record<SocialNetwork, string | undefined>>,
): string[] {
  const errors: string[] = [];
  const labels: Record<SocialNetwork, string> = {
    instagram: 'Instagram',
    twitter: 'X / Twitter',
    linkedin: 'LinkedIn',
  };

  for (const network of Object.keys(labels) as SocialNetwork[]) {
    const value = values[network]?.trim();
    if (value && !isOfficialSocialUrl(value, network)) {
      errors.push(
        `${labels[network]} deve ser uma URL HTTPS oficial da rede (ex.: https://${network === 'twitter' ? 'x.com' : `${network}.com`}/perfil).`,
      );
    }
  }

  return errors;
}
