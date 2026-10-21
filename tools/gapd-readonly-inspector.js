/*
 * Read-only GAPD-7300 web UI inspector.
 *
 * Run only while logged in to http://192.168.219.1 and on the router's own
 * MAC-filtering page. Paste this snippet into DevTools Console.
 *
 * It does NOT submit forms, click buttons, change settings, or print cookies,
 * passwords, input values, or authorization headers. It reports only page
 * structure and same-origin request URL paths to help determine whether the
 * currently loaded firmware exposes a rule-management endpoint.
 */
(() => {
  const safePath = (value) => {
    try {
      const u = new URL(value, location.href);
      if (u.origin !== location.origin) return null;
      return u.pathname + (u.search ? '?[query omitted]' : '');
    } catch { return null; }
  };

  const forms = [...document.forms].map((form, index) => ({
    index,
    method: (form.method || 'GET').toUpperCase(),
    action: safePath(form.action),
    fieldNames: [...form.elements]
      .map((el) => el.name || el.id || el.tagName.toLowerCase())
      .filter(Boolean)
      .filter((name) => !/pass|password|token|secret|cookie|auth/i.test(name))
      .slice(0, 40)
  }));

  const scripts = [...document.scripts]
    .map((script) => safePath(script.src))
    .filter(Boolean);

  const resources = performance.getEntriesByType('resource')
    .map((entry) => safePath(entry.name))
    .filter(Boolean);

  const relevant = [...new Set([...scripts, ...resources])]
    .filter((path) => /network_0406|mac|filter|cgi|apply|config|action|asp|php|js/i.test(path))
    .slice(0, 100);

  const buttons = [...document.querySelectorAll('button, input[type="button"], input[type="submit"], a')]
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      label: String(el.innerText || el.value || el.getAttribute('aria-label') || '')
        .replace(/\s+/g, ' ').trim().slice(0, 60),
      hrefPath: el.tagName === 'A' ? safePath(el.href) : null,
      onclickPresent: Boolean(el.getAttribute('onclick'))
    }))
    .filter((item) => /mac|filter|추가|적용|설정|삭제|수정|갱신/i.test(item.label))
    .slice(0, 50);

  const report = {
    title: document.title,
    pagePath: location.pathname,
    note: 'Read-only inspection; no forms submitted and no settings changed.',
    forms,
    relevantSameOriginResources: relevant,
    relevantControls: buttons
  };

  console.log(JSON.stringify(report, null, 2));
  return report;
})();
