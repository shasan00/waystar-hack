// app/signup/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    fullName: "",
    phone: "",
    dateOfBirth: "",
    mrn: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        role: "patient",
        profileData: {
          fullName: form.fullName,
          phone: form.phone,
          dateOfBirth: form.dateOfBirth || null,
          mrn: form.mrn || null,
        },
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }

    router.push("/login?registered=true");
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6">Patient Sign Up</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input type="text"     placeholder="Display Name"   onChange={set("name")}        className="border p-2 rounded" required />
        <input type="email"    placeholder="Email"          onChange={set("email")}       className="border p-2 rounded" required />
        <input type="password" placeholder="Password"       onChange={set("password")}    className="border p-2 rounded" required />
        <input type="text"     placeholder="Full Legal Name" onChange={set("fullName")}   className="border p-2 rounded" required />
        <input type="tel"      placeholder="Phone (optional)" onChange={set("phone")}     className="border p-2 rounded" />
        <input type="date"     placeholder="Date of Birth"  onChange={set("dateOfBirth")} className="border p-2 rounded" />
        <input type="text"     placeholder="MRN (optional)" onChange={set("mrn")}         className="border p-2 rounded" />

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>
      <p className="mt-4 text-sm text-center">
        Already have an account?{" "}
        <a href="/login" className="text-blue-600 underline">Log in</a>
      </p>
    </div>
  );
}