import { useRef, useEffect, useState } from "react";

export const useWebSocket = (clientId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("idle");
  const socketRef = useRef(null);

  const getToken = () => {
    return localStorage.getItem("accessToken");
  };

  const connect = () => {
    if (!clientId) return;

    const token = getToken();
    if (!token) {
      setError("Please login to continue");
      return;
    }

    const wsUrl = `ws://localhost:8000/ws/${clientId}`;
    const ws = new WebSocket(wsUrl);

    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      setStatus("connected");

      sendMessage({
        action: "authenticate",
        token: token,
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);

        if (data.status) {
          setStatus(data.status);
        }

        if (data.status === "error") {
          setError(data.message || "Something went wrong");
        }
      } catch (error) {
        setError(error);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setStatus("disconnected");

      if (event.code !== 1000) {
        setError(`Disconnected: ${event.reason || ""}`);
        setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      setError("WebSocket error: " + error.message);
      setStatus("error");
    };
  };

  const disconnect = () => {
    if (
      socketRef.current &&
      [WebSocket.OPEN, WebSocket.CONNECTING].includes(
        socketRef.current.readyState
      )
    ) {
      socketRef.current.close(1000, "Client disconnected");
      setIsConnected(false);
      setStatus("disconnected");
    }
  };

  const sendMessage = (data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
      return true;
    } else {
      setError("WebSocket not connected");
      return false;
    }
  };

  const processImage = (imageUrl, prompts) => {
    if (!imageUrl) {
      setError("URL image not empty");
      return false;
    }

    if (!prompts || prompts.length === 0) {
      setError("Prompt not empty");
      return false;
    }

    return sendMessage({
      action: "process_image",
      image_url: imageUrl,
      prompts: prompts,
    });
  };

  const updatePrompt = (imageUrl, prompts) => {
    if (!imageUrl) {
      setError("URL not empty");
      return false;
    }

    return sendMessage({
      action: "update_prompt",
      image_url: imageUrl,
      prompts: prompts,
    });
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [clientId]);

  return {
    isConnected,
    status,
    error,
    messages,
    sendMessage,
    disconnect,
    processImage,
    updatePrompt,
    reconnect: connect,
    getLatestMessage: () =>
      messages.length > 0 ? messages[messages.length - 1] : null,
  };
};

export default useWebSocket;
