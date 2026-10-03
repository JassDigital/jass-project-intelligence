import "./globals.css";

export const metadata = {
  title: "JASS Project Intelligence",
  description: "Intelligent GitHub repository analysis by JASS Digital Lab",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
