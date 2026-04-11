# SupportBot Sequence Diagrams

This folder contains PlantUML sequence diagrams for key business flows.

Files:

- `01-manager-assigns-client.puml` - manager assigns a client to self or another manager
- `02-client-appears-in-system.puml` - first incoming Telegram message creates the client/chat context
- `03-manager-replies-to-client.puml` - manager sends an outgoing reply to the client dialog
- `04-seed-managers-from-auth-users.puml` - migration bootstrap that copies existing auth users into managers
