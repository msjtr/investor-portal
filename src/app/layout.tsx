import "./globals.css";

export const metadata = {
  title: "Investor Portal",
  description: "Investor Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
