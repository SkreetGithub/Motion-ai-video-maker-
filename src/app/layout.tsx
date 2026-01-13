import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Motion AI Video Engine - Create Professional Cinematic Videos",
  description: "Create professional, cinematic AI videos with character consistency, Hollywood-quality visuals, and multi-model intelligence. Generate long-form content up to 60 minutes with our enterprise-grade video generation platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        {children}
        <Footer />
      </body>
    </html>
  );
}
