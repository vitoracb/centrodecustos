import { useEffect } from "react";
import { supabase } from "@/src/lib/supabaseClient";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

export interface UseRealtimeSyncParams<Row> {
  table: string;
  channel?: string;
  filters?: { column: string; value: string | number }[];
  onInsert?: (row: Row) => void;
  onUpdate?: (row: Row) => void;
  onDelete?: (row: Row) => void;
}

/**
 * Hook genérico para escutar eventos Realtime do Supabase.
 * Ainda não está plugado em nenhum contexto; pode ser usado aos poucos.
 */
export function useRealtimeSync<Row = any>(params: UseRealtimeSyncParams<Row>): void {
  const { table, channel, filters, onInsert, onUpdate, onDelete } = params;

  useEffect(() => {
    if (!table) return;

    const channelName = channel ?? `realtime:${table}`;

    let builder = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: undefined,
        },
        (payload) => {
          console.log("[Realtime] payload bruto:", payload);

          const row = payload.new as Row;

          if (filters && filters.length > 0) {
            const match = filters.every((f) => (row as any)[f.column] === f.value);
            if (!match) {
              console.log("[Realtime] descartado por filtro", {
                eventType: payload.eventType,
                row,
                filters,
              });
              return;
            }
          }

          console.log("[Realtime] evento após filtro:", payload.eventType, row);

          if (payload.eventType === "INSERT" && onInsert) onInsert(row);
          if (payload.eventType === "UPDATE" && onUpdate) onUpdate(row);
          if (payload.eventType === "DELETE" && onDelete) {
            const oldRow = (payload.old ?? payload.new) as Row;
            onDelete(oldRow);
          }
        }
      );

    const subscription = builder.subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [table, channel, JSON.stringify(filters)]);
}
