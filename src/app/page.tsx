import RoomChat from "@/components/RoomChat";

export default function Home() {
  return (
    <main className="flex-1">
      <RoomChat />

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-ink/75 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-serif text-lg text-ink">Roomwise</span>
        <span>Hackathon demo. Sample data, no real payments.</span>
      </footer>
    </main>
  );
}
