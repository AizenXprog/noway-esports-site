/* NOWAY — manter URLs de navegação limpas de parâmetros de campanha externos.
   Preserva autenticação, códigos, fragmentos de página e outros dados legítimos. */
(() => {
  try {
    const address = new URL(window.location.href);
    let changed = false;
    for (const key of [...address.searchParams.keys()]) {
      if (!/^utm_(?:source|medium|campaign|term|content|id)$/i.test(key)) continue;
      address.searchParams.delete(key);
      changed = true;
    }
    if (changed) {
      window.history.replaceState(
        window.history.state,
        "",
        address.pathname + address.search + address.hash
      );
    }
  } catch (_) {
    // Uma URL não padronizada não deve afetar a navegação.
  }
})();
