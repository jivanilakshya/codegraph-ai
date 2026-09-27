import { TerminalSquare } from "lucide-react";

type ConsolePanelProps = { messages: string[] };

export function ConsolePanel({ messages }: ConsolePanelProps) {
  return (
    <section className="border-t border-[#202020] bg-[#050505] select-none">
      <div className="flex h-9 items-center border-b border-[#202020] bg-[#0A0A0A] px-4 font-mono text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
        <TerminalSquare className="mr-2 size-3.5 text-white" /> Console
      </div>
      <div className="h-24 overflow-auto px-4 py-2 font-mono text-xs leading-6 text-[#E5E5E5]">
        {messages.map((message, index) => (
          <p key={`${message}-${index}`}>
            <span className="mr-2 text-white font-bold">›</span>
            <span>{message}</span>
          </p>
        ))}
      </div>
    </section>
  );
}

