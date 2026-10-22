import type { Metadata } from "next";
import "./globals.css";
import "./dashboard.css";
import "./planning.css";
import "./examinations.css";
import "./library.css";
import "./finance.css";
import "./settings.css";
export const metadata: Metadata = {
  title: "EduManage · School Dashboard",
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
