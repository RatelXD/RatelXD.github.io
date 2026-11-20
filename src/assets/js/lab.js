function setupPacketLab(lab) {
  const form = lab.querySelector(".lab-form");
  const input = form.elements.namedItem("ip");
  const error = lab.querySelector("#lab-error");
  const destination = lab.querySelector("[data-lab-destination]");
  const result = lab.querySelector("[data-lab-result]");
  const presets = [...lab.querySelectorAll("[data-lab-preset]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const routes = [...lab.querySelectorAll("[data-lab-route]")].map(row => {
    const [network, length] = row.dataset.cidr.split("/");
    const prefix = Number(length);
    const block = 2 ** (32 - prefix);
    const id = row.dataset.labRoute;
    return {
      row, prefix, block,
      range: Math.floor(ipv4Number(network) / block),
      node: lab.querySelector(`[data-lab-node="${id}"]`),
      wire: lab.querySelector(`[data-lab-wire="${id}"]`),
      status: row.querySelector("[data-lab-match]")
    };
  }).sort((a, b) => b.prefix - a.prefix);

  function ipv4Number(text) {
    const octets = text.split(".");
    if (octets.length !== 4 || octets.some(octet =>
      !/^(0|[1-9]\d{0,2})$/.test(octet) || Number(octet) > 255
    )) return null;
    return octets.reduce((sum, octet) => sum * 256 + Number(octet), 0);
  }

  function clearError() {
    error.hidden = true;
    error.textContent = "";
    input.removeAttribute("aria-invalid");
  }

  function calculate() {
    const address = input.value.trim();
    const value = ipv4Number(address);
    if (value === null) {
      error.hidden = false;
      error.textContent = "10.24.2.31처럼 0부터 255 사이의 숫자 네 개를 점으로 구분해 입력하세요.";
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }

    clearError();
    input.value = address;
    const matches = routes.filter(route => Math.floor(value / route.block) === route.range);
    // The supplied example table includes a default route, so every IPv4 address matches.
    const winner = matches[0];
    for (const route of routes) {
      const chosen = route === winner;
      for (const part of [route.row, route.node, route.wire]) part.classList.toggle("chosen", chosen);
      route.status.textContent = chosen ? "선택" : matches.includes(route) ? "일치" : "범위 밖";
    }
    winner.wire.parentElement.append(winner.wire);
    const pulse = winner.wire.querySelector(".lab-pulse");
    if (!reducedMotion.matches && typeof pulse.animate === "function") {
      pulse.getAnimations().forEach(animation => animation.cancel());
      pulse.animate([
        { strokeDashoffset: "6", opacity: 0 },
        { strokeDashoffset: "0", opacity: 1, offset: .08 },
        { strokeDashoffset: "-104", opacity: 0 }
      ], { duration: 660, easing: "linear" });
    }
    for (const button of presets) {
      if (button.dataset.labPreset === address) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    }
    destination.textContent = address;
    result.textContent = matches.length > 1
      ? `목적지 ${address}에 일치하는 경로는 ${matches.length}개입니다. /${winner.prefix}이 /${matches[1].prefix}보다 구체적이므로 ${winner.row.dataset.cidr} 경로를 선택합니다.`
      : `목적지 ${address}는 두 /16 대역의 범위 밖에 있습니다. 라우터는 기본 경로 0.0.0.0/0의 대상인 인터넷 게이트웨이를 선택합니다.`;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    calculate();
  });
  input.addEventListener("input", clearError);
  presets.forEach(button => button.addEventListener("click", () => {
    input.value = button.dataset.labPreset;
    calculate();
  }));
  lab.querySelector("[data-lab-controls]").hidden = false;
}
