/* Mohamed — sprites.js: o registro de sprites desenhados por código (carrega antes dos arquivos de arte).
   Sprites.registrar(id, def) · Sprites.def(id) · Sprites.tem(id) · Sprites.lista() · Sprites.desenhar(ctx, id, x, y, tam, o)
   desenhar: pés em (x, y); tam = altura de um monstro comum em px (def.escala aumenta mini-chefes e chefões);
   o = { estado, vista, dir, t, prog, fase, espelho } chega inteiro ao def.desenhar. */
window.Sprites = (() => {
  const tabela = {};
  return {
    registrar(id, def) { tabela[id] = def; return def; },
    def: id => tabela[id],
    tem: id => !!tabela[id],
    lista: () => Object.keys(tabela),
    desenhar(ctx, id, x, y, tam, o = {}) {
      const d = tabela[id];
      if (!d) return false;
      const k = tam ? tam * (d.escala || 1) / d.h : 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(o.espelho ? -k : k, k);
      d.desenhar(ctx, { ...o, estado: o.estado || 'idle', vista: o.vista || 'frente', t: o.t != null ? o.t : performance.now() / 1000 });
      ctx.restore();
      return true;
    }
  };
})();
