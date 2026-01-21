import { useState, useCallback, type ReactNode } from "react";
import type { HistoryExchange, ConversationTurn } from "../types/session";
import { SessionContext } from "./sessionContextDef";

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [exchanges, setExchanges] = useState<HistoryExchange[]>([]);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string | null>(null);

  const addExchange = useCallback((exchange: Omit<HistoryExchange, "id" | "timestamp" | "conversationHistory">) => {
    const timestamp = Date.now();
    // Initialize conversation history with the first exchange
    const conversationHistory: ConversationTurn[] = [
      {
        role: 'user',
        content: exchange.prompt,
        imageUrl: exchange.imageUrl,
        timestamp,
      },
      {
        role: 'assistant',
        content: exchange.response,
        timestamp,
      },
    ];

    const newExchange: HistoryExchange = {
      ...exchange,
      id: crypto.randomUUID(),
      timestamp,
      conversationHistory,
    };
    setExchanges((prev) => [newExchange, ...prev]);
    setSelectedExchangeId(newExchange.id);
  }, []);

  const addFollowUpToExchange = useCallback((exchangeId: string, userPrompt: string, assistantResponse: string) => {
    const timestamp = Date.now();
    setExchanges((prev) =>
      prev.map((exchange) => {
        if (exchange.id !== exchangeId) return exchange;

        const newTurns: ConversationTurn[] = [
          {
            role: 'user',
            content: userPrompt,
            timestamp,
          },
          {
            role: 'assistant',
            content: assistantResponse,
            timestamp,
          },
        ];

        return {
          ...exchange,
          // Update the main response to show the latest
          response: assistantResponse,
          conversationHistory: [...exchange.conversationHistory, ...newTurns],
        };
      })
    );
  }, []);

  const selectExchange = useCallback((id: string | null) => {
    setSelectedExchangeId(id);
  }, []);

  const getExchangeById = useCallback(
    (id: string) => exchanges.find((e) => e.id === id),
    [exchanges]
  );

  return (
    <SessionContext.Provider
      value={{
        exchanges,
        selectedExchangeId,
        addExchange,
        addFollowUpToExchange,
        selectExchange,
        getExchangeById,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
