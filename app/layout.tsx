import './globals.css';
import Header from '@/components/Header';

export const metadata = {
  title: 'did-not-read-it',
  description: 'The front page of things nobody read',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
