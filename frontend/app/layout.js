import './globals.css';
import Nav from './Nav';

export const metadata = {
  title: 'shortn — url shortener',
  description: 'A small, fast link shortener with click analytics.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
