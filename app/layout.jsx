export const metadata = {
  title: 'Pricing Studio - Project Quote Calculator',
  description: 'Professional pricing calculator for web projects',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
