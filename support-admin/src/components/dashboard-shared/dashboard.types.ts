export type Message = {
  id: string | number;
  client_id: number;
  sender_type: "client" | "manager" | "ai_bot";
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

export type WorkflowStatus = "new" | "in_progress" | "waiting_client" | "completed";

export type PriorityLabel = "high" | "medium" | "low";

export type ChatPreview = {
  clientId: number;
  telegramChatId: number | null;
  title: string;
  subtitle: string;
  lastMessage: string;
  lastTimestamp: string;
  totalMessages: number;
  unreadCount: number;
  workflowStatus: WorkflowStatus;
  priorityScore: number;
  priorityLabel: PriorityLabel;
  priorityReason: string | null;
  isAssigned: boolean;
};

export type ManagerProfile = {
  id: number;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  position: string;
};

export type ManagerAvailabilityStatus = "online" | "away" | "coffee";

export type ManagerDisplayStatus = "offline" | ManagerAvailabilityStatus;

export type ManagerStatusRecord = {
  manager_id: number;
  status: ManagerAvailabilityStatus;
  updated_at: string;
};

export type ClientAssignment = {
  client_id: number;
  assigned_manager_id: number | null;
  previous_manager_id: number | null;
  last_reassigned_by_manager_id: number | null;
  last_reassigned_by_manager_name: string | null;
  ai_auto_reply_enabled: boolean;
  workflow_status: WorkflowStatus;
  priority_score: number;
  priority_label: PriorityLabel;
  priority_reason: string | null;
  last_client_message_at: string | null;
  last_manager_message_at: string | null;
  status_updated_at: string;
  priority_updated_at: string;
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

export type ChatWorkflowFilter = "all" | WorkflowStatus;

export type ChatPriorityFilter = "all" | PriorityLabel;

export type TeamMessage = {
  id: number;
  sender_id: number;
  sender_name: string;
  text: string;
  created_at: string;
};

export type TeamReadState = {
  manager_id: number;
  last_read_message_id: number | null;
};

export type AdminDashboardProps = {
  initialMessages: Message[];
  teamMessages: TeamMessage[];
  teamReadState: TeamReadState | null;
  errorMessage: string | null;
  currentManager: ManagerProfile | null;
  managers: ManagerProfile[];
  managerStatuses: ManagerStatusRecord[];
  assignments: ClientAssignment[];
  readStates: ClientReadState[];
  realtimeAccessToken: string;
};
