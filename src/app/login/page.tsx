import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { reset } = await searchParams;

  return <LoginForm resetSuccess={reset === "success"} />;
}
