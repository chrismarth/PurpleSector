// In dev mode, logo is served by Vite dev server on port 5173
const LOGO_URL = import.meta.env.DEV
  ? "http://localhost:5173/images/purpleSector_logo.svg"
  : "/images/purpleSector_logo.svg";

export function TitleBar() {
  return (
    <header className="flex items-center h-12 pl-1 pr-3 border-b bg-gray-50 dark:bg-gray-700 shadow-sm shrink-0">
      <img
        src={LOGO_URL}
        alt="Purple Sector"
        className="h-8 w-auto"
      />
    </header>
  );
}
