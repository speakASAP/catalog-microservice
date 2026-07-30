import Link from 'next/link';

/**
 * Site footer for catalog.alfares.cz.
 *
 * Adapted from the Alfares (StateX) website footer, trimmed to the parts that
 * apply to the catalog app: brand, catalog navigation, Alfares company/legal
 * contact block, and legal links. Legal/company links point at the main
 * Alfares site (https://alfares.cz) where those pages actually live.
 */

const company = {
  name: 'Alfares Catalog',
  legalName: 'Alfares s.r.o.',
  description:
    'Single source of truth for product data across all Alfares sales channels — SKU, descriptions, categories, pricing, and media.',
  ico: '27138038',
  dic: 'CZ27138038',
  phone: '+420 774 287 541',
  email: 'contact@alfares.cz',
  address: 'Cetechovice 70, 768 02, Czech Republic',
  siteUrl: 'https://alfares.cz',
};

const catalogLinks = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Products', href: '/dashboard/products' },
  { title: 'Sign in', href: '/login' },
  { title: 'Register', href: '/register' },
];

const companyLinks = [
  { title: 'Alfares home', href: 'https://alfares.cz', external: true },
  { title: 'Contact', href: 'mailto:contact@alfares.cz', external: true },
];

const legalLinks = [
  { title: 'Privacy Policy', href: 'https://alfares.cz/legal/privacy-policy' },
  { title: 'Terms of Service', href: 'https://alfares.cz/legal/terms-of-service' },
  { title: 'Cookie Policy', href: 'https://alfares.cz/legal/cookie-policy' },
  { title: 'GDPR Compliance', href: 'https://alfares.cz/legal/gdpr-compliance' },
];

const social = [
  { name: 'LinkedIn', href: 'https://linkedin.com/company/statex', icon: '🔗' },
  { name: 'GitHub', href: 'https://github.com/statex', icon: '💻' },
];

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ title: string; href: string; external?: boolean }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-400">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            {link.external || link.href.startsWith('http') || link.href.startsWith('mailto:') ? (
              <a
                href={link.href}
                target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noopener noreferrer"
                className="text-sm text-slate-300 transition-colors hover:text-white"
              >
                {link.title}
              </a>
            ) : (
              <Link href={link.href} className="text-sm text-slate-300 transition-colors hover:text-white">
                {link.title}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand + contact */}
          <div>
            <Link href="/" className="text-lg font-extrabold text-white">
              {company.name}
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">{company.description}</p>

            <dl className="mt-6 space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="font-semibold text-slate-400">Legal name:</dt>
                <dd className="text-slate-300">{company.legalName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-slate-400">IČ:</dt>
                <dd className="text-slate-300">{company.ico}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-slate-400">DIČ:</dt>
                <dd className="text-slate-300">{company.dic}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-slate-400">Phone:</dt>
                <dd>
                  <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="text-slate-300 hover:text-white">
                    {company.phone}
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-slate-400">Email:</dt>
                <dd>
                  <a href={`mailto:${company.email}`} className="text-slate-300 hover:text-white">
                    {company.email}
                  </a>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-slate-400">Address:</dt>
                <dd className="text-slate-300">{company.address}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Follow us</h4>
              <ul className="mt-3 flex gap-4">
                {social.map((s) => (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.name}
                      className="inline-flex items-center gap-1.5 text-sm text-slate-300 transition-colors hover:text-white"
                    >
                      <span aria-hidden>{s.icon}</span>
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <LinkColumn title="Catalog" links={catalogLinks} />
          <LinkColumn title="Company" links={companyLinks} />
          <LinkColumn title="Legal" links={legalLinks} />
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400" suppressHydrationWarning>
            © {year} {company.legalName}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {legalLinks.slice(0, 3).map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-white"
              >
                {link.title}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
