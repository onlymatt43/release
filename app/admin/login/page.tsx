import LoginForm from "@/components/admin/LoginForm";

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { from } = await searchParams;
  return <LoginForm from={from} />;
}
