/** Widget CSS. Lives inside the Shadow DOM, so nothing leaks in or out. */
export const CSS = `
:host{all:initial;display:block;max-width:560px;margin:16px 0}
.tps{
  --bg:#ffffff;--fg:#1c1530;--muted:#5d5670;--line:#ddd8e8;--field:#faf9fd;
  --accent:#6d28d9;--accent-fg:#ffffff;--liquid:#c4b5fd;--fill-line:#6d28d9;--over:#b91c1c;
  --warn-bg:#fff7e6;--warn-fg:#7a4b00;--badge-bg:#f3edff;--badge-fg:#4c1d95;--focus:#f59e0b;
  font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--fg);
  -webkit-text-size-adjust:100%;
}
@media (prefers-color-scheme:dark){
  .tps[data-theme="auto"]{
    --bg:#17131f;--fg:#efeaf8;--muted:#aaa2bd;--line:#352e45;--field:#1f1a2a;
    --accent:#a78bfa;--accent-fg:#17131f;--liquid:#5b3fa8;--fill-line:#c4b5fd;--over:#f87171;
    --warn-bg:#2d2414;--warn-fg:#fcd58a;--badge-bg:#2a2140;--badge-fg:#d9ccff;
  }
}
.tps[data-theme="dark"]{
  --bg:#17131f;--fg:#efeaf8;--muted:#aaa2bd;--line:#352e45;--field:#1f1a2a;
  --accent:#a78bfa;--accent-fg:#17131f;--liquid:#5b3fa8;--fill-line:#c4b5fd;--over:#f87171;
  --warn-bg:#2d2414;--warn-fg:#fcd58a;--badge-bg:#2a2140;--badge-fg:#d9ccff;
}
*{box-sizing:border-box}
[hidden]{display:none !important}
.card{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:16px;container-type:inline-size}
.head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:0 0 12px}
.title{font-size:17px;font-weight:700;margin:0;letter-spacing:-.01em}
.sub{margin:0;color:var(--muted);font-size:13px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;margin:0}
@container (max-width:360px){.grid{grid-template-columns:1fr}}
.field{display:flex;flex-direction:column;gap:4px;min-width:0;font-size:13px;color:var(--muted);font-weight:600}
.field.wide{grid-column:1/-1}
.pair{display:flex;gap:6px}
.pair input{flex:1;min-width:0}
.pair select{flex:0 0 auto;width:auto}
input,select{
  font:inherit;font-size:16px;color:var(--fg);background:var(--field);border:1px solid var(--line);
  border-radius:9px;padding:9px 10px;width:100%;min-height:44px;font-weight:500;
}
select{cursor:pointer}
input:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid var(--focus);outline-offset:1px}
input[aria-invalid="true"]{border-color:var(--over)}
.mix{margin:0;color:var(--fg);font-weight:500;font-size:14px}
.out{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}
.result{margin:0 0 6px;font-size:17px}
.result strong{color:var(--accent);font-size:22px}
.graphic svg{display:block;width:100%;height:auto;max-height:84px}
.barrel{fill:var(--field);stroke:var(--muted);stroke-width:1.2}
.plunger,.hub{fill:var(--line);stroke:var(--muted);stroke-width:1}
.needle{stroke:var(--muted);stroke-width:1.5}
.liquid{fill:var(--liquid)}
.line{stroke:var(--fill-line);stroke-width:2.5}
.line.over{stroke:var(--over)}
.tick{stroke:var(--muted);stroke-width:.8}
.num{fill:var(--muted);font-size:8px;text-anchor:middle;font-family:inherit}
.facts{display:flex;flex-wrap:wrap;gap:6px 18px;margin:8px 0 0}
.facts div{display:flex;gap:6px;align-items:baseline}
.facts dt{color:var(--muted);font-size:13px}
.facts dd{margin:0;font-weight:600}
.each{margin:8px 0 4px;color:var(--muted);font-size:13px}
.parts{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.parts li{display:flex;justify-content:space-between;gap:12px;border-bottom:1px dashed var(--line);padding:3px 0}
.warn{margin:10px 0 0;padding:8px 10px 8px 26px;background:var(--warn-bg);color:var(--warn-fg);border-radius:9px;font-size:13px}
.warn li+li{margin-top:4px}
.note{margin:10px 0 0;color:var(--muted);font-size:13px}
.note:empty{display:none}
.badge{display:inline-block;background:var(--badge-bg);color:var(--badge-fg);border-radius:999px;padding:0 8px;font-weight:600;font-size:12px}
a{color:var(--accent);text-underline-offset:2px}
.foot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;font-size:12px;color:var(--muted)}
.powered{font-weight:700;text-decoration:none}
.powered:hover{text-decoration:underline}
`;
