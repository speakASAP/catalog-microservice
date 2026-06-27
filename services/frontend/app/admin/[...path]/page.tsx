import { redirect } from 'next/navigation';

export default async function LegacyAdminPathRedirect({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  redirect(`/dashboard${path.length ? `/${path.join('/')}` : ''}`);
}
