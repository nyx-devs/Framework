import Header from "./Header";
import Footer from "./Footer";

/**
 * The one shared wrapper for every public page (home, about, news, positions,
 * login, register, dashboard and so on). Pages must NOT render their own
 * <main>; this component provides it.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-school-navy focus:shadow-md"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
