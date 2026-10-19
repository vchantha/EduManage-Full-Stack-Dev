import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "EduManage · Academic workspace",
  description:
    "Curriculum, subject allocation and lesson planning for your school.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
