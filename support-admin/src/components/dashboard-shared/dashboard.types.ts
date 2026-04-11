export type Message = {
  id: string | number;
  client_id: number;
  sender_type: "client" | "manager";
  sender_label: string;
  text: string;
  created_at: string;
  client: {
    id: number;
    telegram_chat_id: number;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export type ChatPreview = {
  clientId: number;
  telegramChatId: number | null;
  title: string;
  subtitle: string;
  lastMessage: string;
  lastTimestamp: string;
  totalMessages: number;
};

export type AdminDashboardProps = {
  initialMessages: Message[];
  errorMessage: string | null;
};
