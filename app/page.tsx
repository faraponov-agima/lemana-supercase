"use client";

import dynamic from "next/dynamic";

const TowerScene = dynamic(() => import("./components/TowerScene"), {
  ssr: false,
});

export default function Home() {
  return <TowerScene />;
}
