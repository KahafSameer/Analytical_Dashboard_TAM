export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantSource = {
  site: string;
  field: string;
  value: string;
};
