# SupportBot C4 PlantUML

This folder contains cleaned up PlantUML architecture diagrams for the current SupportBot codebase.

Files:

- `01-system-context.puml` - external actors and system boundaries
- `02-container.puml` - runtime containers and data flow between them
- `03-component.puml` - code-level dependencies inside `support-admin` and `telegram-webhook`

Diagram rules used here:

- left-to-right layout
- orthogonal arrows for readable dependency flow
- labels describe actual calls and data movement from the current code
- `public.messages` is the primary persistence boundary
