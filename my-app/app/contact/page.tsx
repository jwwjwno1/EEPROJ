import Navbar from "@/components/navbar";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto py-32 px-6 text-center">
        <h1 className="text-5xl font-bold mb-10">
          联系我们
        </h1>

        <div className="space-y-4 text-zinc-400 text-lg">
          <p>邮箱：support@eestudio.com</p>
          <p>Discord：EE Studio 官方频道</p>
          <p>Instagram：@eestudio</p>
        </div>
      </div>
    </main>
  );
}
