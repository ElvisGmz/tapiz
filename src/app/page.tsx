"use client";

import { useSyncExternalStore } from "react";
import { Editor } from "@/components/Editor";

const subscribe = () => () => {};

export default function Home() {
  // The editor is canvas + localStorage driven, so it only renders on the client.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return <div className="h-dvh bg-zinc-950" />;
  return <Editor />;
}
