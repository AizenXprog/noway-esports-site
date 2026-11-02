/* NOWAY × TREZZY — cópia de cupom sem alterar scripts existentes. */
(() => {
  const button = document.getElementById('nowayPartnerCopy');
  const feedback = document.getElementById('nowayPartnerFeedback');
  if (!button || !feedback) return;
  const coupon = 'NIEL5';

  button.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(coupon);
      } else {
        const field = document.createElement('textarea');
        field.value = coupon;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        let copied = false;
        try { copied = document.execCommand('copy'); }
        finally { field.remove(); }
        if (!copied) throw new Error('Cópia indisponível');
      }
      feedback.textContent = 'Cupom NIEL5 copiado!';
      button.textContent = 'COPIADO ✓';
    } catch {
      feedback.textContent = 'Não foi possível copiar. Selecione o cupom NIEL5 acima.';
      button.textContent = 'COPIAR CUPOM';
    }
  });
})();
