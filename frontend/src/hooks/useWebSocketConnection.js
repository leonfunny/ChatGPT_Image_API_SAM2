/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef, useCallback } from "react";

const useWebSocketConnection = (wsBaseUrl, clientId) => {
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [waitingForResult, setWaitingForResult] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const onMessageCallbackRef = useRef(null);

  const setupWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      setWsStatus("connecting");
      const fullWsUrl = `${wsBaseUrl}/${clientId}`;
      const ws = new WebSocket(fullWsUrl);

      ws.onopen = () => {
        setWsStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === "processing") {
            setWsStatus("processing");
            setWaitingForResult(true);
          } else if (data.status === "success") {
            setWsStatus("connected");
            setWaitingForResult(false);
          } else if (data.status === "error") {
            setWsStatus("error");
            setWaitingForResult(false);
          }

          if (
            onMessageCallbackRef.current &&
            typeof onMessageCallbackRef.current === "function"
          ) {
            onMessageCallbackRef.current(data);
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = () => {
        setWsStatus("error");
      };

      ws.onclose = () => {
        setWsStatus("disconnected");

        if (!ws.intentionalClose) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setupWebSocket();
          }, 5000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setWsStatus("error");
    }
  }, [wsBaseUrl, clientId]);

  useEffect(() => {
    if (clientId) {
      setupWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.intentionalClose = true;
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [clientId, setupWebSocket]);

  const setOnMessageHandler = useCallback((callback) => {
    onMessageCallbackRef.current = callback;
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message);
        wsRef.current.send(messageStr);
        return true;
      } catch (error) {
        return false;
      }
    } else {
      return false;
    }
  }, []);

  // Kết nối lại
  const reconnect = useCallback(() => {
    setupWebSocket();
  }, [setupWebSocket]);

  return {
    wsStatus,
    waitingForResult,
    sendMessage,
    reconnect,
    setOnMessageHandler,
  };
};

export default useWebSocketConnection;
