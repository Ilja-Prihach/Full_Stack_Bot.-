export type Message = {
  id: string | number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  text: string;
  created_at: string;
};

export type ChatPreview = {
  chatId: number;
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
