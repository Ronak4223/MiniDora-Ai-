export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <div className="text-6xl">🤖</div>
      <h1 className="text-2xl font-bold text-foreground">404 — Not Found</h1>
      <a href="/" className="text-primary text-sm underline underline-offset-4">Go home</a>
    </div>
  );
}
