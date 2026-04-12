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
  unreadCount: number;
};

export type ManagerProfile = {
  id: number;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  position: string;
};

export type ClientAssignment = {
  client_id: number;
  assigned_manager_id: number | null;
  previous_manager_id: number | null;
  last_reassigned_by_manager_id: number | null;
  last_reassigned_by_manager_name: string | null;
};

export type ClientReadState = {
  client_id: number;
  manager_id: number;
  last_read_message_id: number | null;
  last_read_at: string | null;
};

export type ChatAssignmentFilter =
  | "all"
  | "unread"
  | "unassigned"
  | "mine"
  | `manager:${number}`;

export type AdminDashboardProps = {
  initialMessages: Message[];
  errorMessage: string | null;
  currentManager: ManagerProfile | null;
  managers: ManagerProfile[];
  assignments: ClientAssignment[];
  readStates: ClientReadState[];
  realtimeAccessToken: string;
};
