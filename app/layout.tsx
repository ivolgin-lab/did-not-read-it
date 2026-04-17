import './globals.css';
import Header from '@/components/Header';
import AppBanners from '@/components/AppBanners';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'did-not-read-it',
  description: 'The front page of things nobody read',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="app-body">
        <AppBanners />
        <Header />
        <main className="container">
          {children}
        </main>
        <footer className="app-footer">
          <span>{process.env.APP_VERSION}</span>
        </footer>
      </body>
    </html>
  );
}
