import { isSmtpEnabled } from '@/lib/email';
import RegisterForm from './RegisterForm';

export default function RegisterPage() {
  return <RegisterForm smtpEnabled={isSmtpEnabled()} />;
}
