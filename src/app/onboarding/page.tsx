import { redirect } from 'next/navigation'

// Em produção: verificar se onboarding foi concluído via Supabase.
// No MVP, redireciona direto para o dashboard.
export default function OnboardingPage() {
  redirect('/dashboard')
}
