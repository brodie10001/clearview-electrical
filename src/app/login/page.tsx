import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { reset, error } = await searchParams;

  return <LoginForm resetSuccess={reset === "success"} signupExpired={error === "signup-expired"} />;
}
