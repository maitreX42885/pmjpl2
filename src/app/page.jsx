"use client";


import Link from "next/link";
import 'aos/dist/aos.css'; // Import AOS styles globally
import AOS from 'aos';
import { useEffect } from 'react';


export default function Home() {

  useEffect(() => {
    AOS.init({
      duration: 1000, // Optional: customize animations
      once: true,     // Whether animation should happen only once
    });
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 border">
      <main className="flex flex-col items-center justify-center w-full h-screen">
        <h1 className="">Welcome to the Home Page</h1>
        <p className="">
          This is the main content area. You can add your content here.
        </p>
        <Link href="/home" className="btn btn-primary mt-4">
          Go to About Page
        </Link>
      </main>
    </div>
  );
}
