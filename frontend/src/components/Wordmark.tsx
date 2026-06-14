// Только значок «пин + росток», без текста. Натуральные пропорции 120×140.
// Используется в шапке Карты и на экране регистрации (хендоф home_map).
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <img
      className="logo-mark"
      src="/assets/logo/ogorod-mark.svg"
      alt="оГород"
      width={size}
      height={(size * 140) / 120}
    />
  );
}

// Логотип оГород: значок «пин + росток» + слово, где «о» зелёное, «Город»
// морковное — чтобы вылез спрятанный «город». См. дизайн-систему оГород.
export function Wordmark({ withMark = true, markSize = 28 }: { withMark?: boolean; markSize?: number }) {
  return (
    <span className="wordmark">
      {withMark && (
        <img src="/assets/logo/ogorod-mark.svg" alt="" width={markSize} height={(markSize * 140) / 120} />
      )}
      <span>
        <span className="wm-o">о</span>
        <span className="wm-gorod">Город</span>
      </span>
    </span>
  );
}
