# LocalizeIt progress

- DONE: Audited role routes and buyer/shop/rider/admin screen actions.
- DONE: Demo mode uses persisted local stores and shared workflow services.
- PARTIAL: Supabase adapters, schema, RPCs, and Razorpay Edge Functions exist but live mode is not wired as the default.
- DONE: Live-mode default is now false-demo; AI supports Groq, Hugging Face, OpenRouter, Gemini, and custom OpenAI-compatible providers.
- PARTIAL: Cross-role order workflow exists; browser-tab BroadcastChannel sync is not implemented.
- DONE: Fee engine applies platform, delivery, pickup, COD, and commission rules in demo workflow.
- PARTIAL: Atomic server checkout exists in Supabase RPCs; demo checkout is local and not transactional across tabs.
- DONE: Role guards, stock checks, order transitions, shop/rider/admin dashboards, and audit activity exist.
- PARTIAL: OTP, payment, notifications, rider document upload, and server-side secret protection require provider configuration.
- DONE: OpenRouteService driving routes are available when configured, with animated rider tracking in buyer order detail.
- PARTIAL: PWA manifest and offline shell are present; install prompt and full offline-state UI are not.
- DONE: Reinstalled dependencies and confirmed the development server responds on port 5173.
- DONE: Fixed current TypeScript build blockers.
- DONE: Added Windows live-mode dev script, demo seed command, manifest, app icon, and service worker.
- DONE: Added cross-tab store rehydration and Supabase realtime refresh for catalog changes.
- DONE: Removed seeded shops, products, orders, riders, buyers, settlements, and local seed command; live mode now starts empty until Supabase data is added.
- DONE: Added live Supabase application RPCs and shop/rider registration flows; both remain pending until admin approval.
- SKIPPED: Git commit; this workspace is not a Git repository.
