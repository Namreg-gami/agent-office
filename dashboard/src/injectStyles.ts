// Inject styles at runtime since dashboard plugins can't rely on
// separate CSS files being loaded alongside the IIFE bundle.
const style = document.createElement("style");
style.textContent = `/* Agent Office — dashboard plugin styles */
.ao-office{padding:24px;height:100%;overflow-y:auto;display:flex;flex-direction:column;gap:20px}
.ao-header{display:flex;flex-direction:column;gap:4px}
.ao-title{font-size:1.5rem;font-weight:700;margin:0;color:var(--hermes-foreground,inherit)}
.ao-subtitle{font-size:.85rem;color:var(--hermes-muted-foreground,#6b7280);margin:0}
.ao-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.ao-card{background:var(--hermes-card,#fff);border:1px solid var(--hermes-border,#e5e7eb);border-radius:12px;padding:20px;cursor:pointer;transition:box-shadow .15s ease,transform .1s ease;display:flex;flex-direction:column;gap:12px;user-select:none}
.ao-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08);transform:translateY(-2px)}
.ao-card:active{transform:translateY(0)}
.ao-card:focus-visible{outline:2px solid var(--hermes-ring,#3b82f6);outline-offset:2px}
.ao-card-avatar{display:flex;align-items:center;gap:10px}
.ao-avatar-circle{width:44px;height:44px;border-radius:50%;border:2px solid #6b7280;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.95rem;color:var(--hermes-foreground,#111827);background:var(--hermes-muted,#f3f4f6);text-transform:uppercase}
.ao-status-dot{width:10px;height:10px;border-radius:50%;animation:ao-pulse 2s ease-in-out infinite}
@keyframes ao-pulse{0%,100%{opacity:1}50%{opacity:.4}}
.ao-card-info{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.ao-card-name{font-size:1.1rem;font-weight:600;text-transform:capitalize}
.ao-card-role{font-size:.8rem;color:var(--hermes-muted-foreground,#6b7280);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ao-card-status{font-size:.85rem;font-weight:600;margin-top:2px}
.ao-card-task{font-size:.8rem;color:var(--hermes-muted-foreground,#6b7280);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}
.ao-card-task-label{font-weight:600;color:var(--hermes-foreground,inherit)}
.ao-card-badges{display:flex;gap:6px;flex-wrap:wrap}
.ao-badge{font-size:.72rem;padding:2px 8px;border-radius:9999px;background:var(--hermes-muted,#f3f4f6);color:var(--hermes-muted-foreground,#6b7280);font-weight:500}
.ao-badge--blocked{background:#fef2f2;color:#ef4444}
.ao-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:300px;gap:16px;color:var(--hermes-muted-foreground,#6b7280)}
.ao-spinner{width:36px;height:36px;border:3px solid var(--hermes-muted,#e5e7eb);border-top-color:var(--hermes-primary,#3b82f6);border-radius:50%;animation:ao-spin .8s linear infinite}
@keyframes ao-spin{to{transform:rotate(360deg)}}
.ao-error{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:300px;gap:8px;text-align:center;color:var(--hermes-muted-foreground,#6b7280)}
.ao-error h3{margin:0;color:var(--hermes-destructive,#ef4444)}
.ao-error-icon{font-size:2.5rem}
.ao-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;min-height:300px;gap:8px;text-align:center;color:var(--hermes-muted-foreground,#6b7280)}
.ao-empty h3{margin:0}
.ao-empty-icon{font-size:3rem}
.ao-panel-overlay{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:100;display:flex;justify-content:flex-end;animation:ao-fade-in .15s ease}
@keyframes ao-fade-in{from{opacity:0}to{opacity:1}}
.ao-panel{width:420px;max-width:90vw;height:100%;background:var(--hermes-background,#fff);border-left:1px solid var(--hermes-border,#e5e7eb);overflow-y:auto;box-shadow:-4px 0 24px rgba(0,0,0,.1);animation:ao-slide-in .2s ease;display:flex;flex-direction:column}
@keyframes ao-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
.ao-panel-header{padding:20px 20px 16px;border-bottom:1px solid var(--hermes-border,#e5e7eb);display:flex;justify-content:space-between;align-items:flex-start}
.ao-panel-title{margin:0;font-size:1.2rem;font-weight:700;text-transform:capitalize}
.ao-panel-subtitle{margin:2px 0 0;font-size:.82rem;color:var(--hermes-muted-foreground,#6b7280)}
.ao-panel-close{background:none;border:1px solid var(--hermes-border,#e5e7eb);border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;color:var(--hermes-muted-foreground,#6b7280);flex-shrink:0}
.ao-panel-close:hover{background:var(--hermes-muted,#f3f4f6);color:var(--hermes-foreground,inherit)}
.ao-panel-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px 20px;border-bottom:1px solid var(--hermes-border,#e5e7eb)}
.ao-stat{display:flex;flex-direction:column;gap:2px}
.ao-stat-value{font-size:1.3rem;font-weight:700;text-transform:capitalize}
.ao-stat-label{font-size:.75rem;color:var(--hermes-muted-foreground,#6b7280);text-transform:uppercase;letter-spacing:.05em}
.ao-panel-model{padding:10px 20px;border-bottom:1px solid var(--hermes-border,#e5e7eb);font-size:.82rem;color:var(--hermes-muted-foreground,#6b7280)}
.ao-panel-section{padding:16px 20px;border-bottom:1px solid var(--hermes-border,#e5e7eb)}
.ao-section-title{margin:0 0 10px;font-size:.85rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--hermes-muted-foreground,#6b7280)}
.ao-task-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.ao-task-status{font-size:.7rem;font-weight:600;text-transform:uppercase;padding:1px 6px;border-radius:4px}
.ao-task-status--running{background:#eff6ff;color:#3b82f6}
.ao-task-status--blocked{background:#fef2f2;color:#ef4444}
.ao-task-status--ready{background:#f0fdf4;color:#10b981}
.ao-task-status--triage,.ao-task-status--todo{background:var(--hermes-muted,#f3f4f6);color:var(--hermes-muted-foreground,#6b7280)}
.ao-task-status--review{background:#fffbeb;color:#f59e0b}
.ao-task-status--done{background:#f0fdf4;color:#10b981}
.ao-task-id{font-size:.7rem;font-family:monospace;color:var(--hermes-muted-foreground,#9ca3af)}
.ao-task-title{font-size:.92rem;font-weight:600;margin:0 0 8px;line-height:1.4}
.ao-task-summary{font-size:.8rem;color:var(--hermes-muted-foreground,#6b7280);background:var(--hermes-muted,#f9fafb);padding:10px;border-radius:6px;white-space:pre-wrap;word-break:break-word;margin:0;max-height:200px;overflow-y:auto}
.ao-runs-list{display:flex;flex-direction:column;gap:8px}
.ao-run-item{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:.8rem;padding:6px 8px;border-radius:6px;background:var(--hermes-muted,#f9fafb)}
.ao-run-status{font-weight:600;white-space:nowrap}
.ao-run-time{color:var(--hermes-muted-foreground,#9ca3af);font-size:.75rem;white-space:nowrap}
.ao-run-summary{width:100%;color:var(--hermes-muted-foreground,#6b7280);font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ao-events-list{display:flex;flex-direction:column;gap:4px}
.ao-event-item{display:flex;justify-content:space-between;align-items:center;font-size:.8rem;padding:4px 8px;border-radius:4px}
.ao-event-item:hover{background:var(--hermes-muted,#f9fafb)}
.ao-event-kind{font-family:monospace;font-size:.75rem}
.ao-event-time{color:var(--hermes-muted-foreground,#9ca3af);font-size:.72rem}
.ao-none{font-size:.82rem;color:var(--hermes-muted-foreground,#9ca3af);margin:0}
.ao-error-text{color:var(--hermes-destructive,#ef4444)}
`;
document.head.appendChild(style);
