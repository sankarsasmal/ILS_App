# Antigravity Context & Memory Strategy

Before scanning full directories, reading raw files, or analyzing the entire codebase:
1. Always call `memories:get_context` or `memories:search_memories` to retrieve existing architectural notes, file structures, and past session summaries.
2. Only scan raw files if the memory store does not contain the required context.
3. After completing major tasks, updates, or code additions, save key takeaways using `memories:add_memory`.
