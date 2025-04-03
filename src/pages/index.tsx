// src/pages/index.tsx
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import abi from "../../abi/EternaVerse.json";

interface Poem {
  sender: string;
  poem: string;
  timestamp: string;
}

declare global {
  interface EthereumProvider {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on?: (eventName: string, callback: (...args: unknown[]) => void) => void;
  }

  interface Window {
    ethereum?: EthereumProvider;
  }
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;
//const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111");

export default function Home() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [poem, setPoem] = useState("");
  const [poems, setPoems] = useState<Poem[]>([]);
  const [status, setStatus] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("🦊 Please install MetaMask.");
      return;
    }

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts.length === 0) {
        alert("⚠️ No wallet connected.");
        return;
      }

      setWallet(accounts[0]);
    } catch (err: unknown) {
      console.error("Wallet connection failed:", err);
      alert("❌ Wallet connection failed.");
    }
  };

  const writePoem = async () => {
    if (!wallet || poem.trim() === "") {
      setStatus("⚠️ Please write a poem.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      const tx = await contract.writePoem(poem);
      setStatus("✍️ Writing your verse...");
      await tx.wait();
      setStatus("✅ Your poem lives on the chain!");
      setPoem("");
      await loadPoems();
    } catch (err: unknown) {
      console.error("Transaction failed:", err);
      setStatus("❌ Transaction failed.");
    }
  };

  const loadPoems = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
      const totalBig = await contract.getTotalPoems();
      const total = Number(totalBig);

      if (total === 0) {
        setPoems([]);
        return;
      }

      const list: Poem[] = [];

      for (let i = total - 1; i >= 0 && i > total - 10; i--) {
        const [sender, verse, time]: [string, string, bigint] = await contract.getPoem(i);
        list.push({
          sender,
          poem: verse,
          timestamp: new Date(Number(time) * 1000).toLocaleString(),
        });
      }

      setPoems(list);
    } catch (err: unknown) {
      console.error("Failed to load poems:", err);
    }
  };

  useEffect(() => {
    if (wallet) loadPoems();
  }, [wallet]);

  return (
    <main
      style={{
        fontFamily: "serif",
        padding: "2rem",
        backgroundColor: "#1e1e2f",
        color: "#f9f9f9",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "2rem" }}>EternaVerse</h1>
      <p>
        <em>&quot;Write your soul, and it shall live forever.&quot;</em>
      </p>

      {!wallet ? (
        <button
          onClick={connectWallet}
          style={{
            backgroundColor: "#6c63ff",
            color: "#fff",
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "5px",
            fontWeight: "bold",
            cursor: "pointer",
            marginTop: "1rem",
          }}
        >
          🔑 Connect Wallet
        </button>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          <textarea
            rows={4}
            value={poem}
            onChange={(e) => setPoem(e.target.value)}
            placeholder="Write your soul's whisper here..."
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              backgroundColor: "#2e2e40",
              color: "#ffffff",
              border: "1px solid #999",
              borderRadius: "5px",
            }}
          />
          <button
            onClick={writePoem}
            style={{
              marginTop: "0.5rem",
              backgroundColor: "#6c63ff",
              color: "#fff",
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "5px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            📜 Submit Poem
          </button>
          <p>{status}</p>
        </div>
      )}

      <section style={{ marginTop: "2rem" }}>
        <h2>🕊 Eternal Verses</h2>
        {poems.length === 0 ? (
          <p>No SoulVerses yet... be the first to whisper.</p>
        ) : (
          poems.map((v, i) => (
            <div key={i} style={{ borderTop: "1px solid #aaa", padding: "1rem 0" }}>
              <p style={{ fontStyle: "italic" }}>&quot;{v.poem}&quot;</p>
              <small>
                by {v.sender} on {v.timestamp}
              </small>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
