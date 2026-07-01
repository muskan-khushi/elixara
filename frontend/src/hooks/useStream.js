import { useCallback, useRef } from "react";
import { useQueryStore } from "../store/useQueryStore";
import { streamUrl } from "../api/query";

/**
 * Opens an SSE connection to /api/query/stream and feeds tokens
 * into the query store. Handles done / error events.
 */
export function useStream() {
  const { startStream, appendToken, finishStream } = useQueryStore();
  const esRef = useRef(null);

  const submit = useCallback(
    (query, scopeDocId = null) => {
      // Close any existing stream
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      startStream(query, scopeDocId);

      // Pass token in header via fetch-based approach isn't possible with EventSource.
      // The gateway's requireAuth middleware also checks Authorization header.
      // We use the blocking /query endpoint when auth is needed or fall back to
      const url = streamUrl(query, scopeDocId);
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.token !== undefined) {
            appendToken(data.token);
          }
          if (data.done) {
            finishStream(data.sources || [], data.confidence || 0, data.cached || false);
            es.close();
            esRef.current = null;
          }
          if (data.error) {
            finishStream([], 0, false);
            es.close();
            esRef.current = null;
          }
        } catch (_) {}
      };

      es.onerror = () => {
        finishStream([], 0, false);
        es.close();
        esRef.current = null;
      };
    },
    [startStream, appendToken, finishStream]
  );

  const cancel = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      finishStream([], 0, false);
    }
  }, [finishStream]);

  return { submit, cancel };
}
