#!/usr/bin/env node
/* Build script — produce dist/Index.html con CSS y JS embebidos para deployar a Google Apps Script.
   Uso: node build.mjs
   Resultado: dist/Index.html  (pegar en Apps Script como archivo HTML llamado "Index")
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const SRC  = path.join(ROOT, 'src');
const OUT  = path.join(ROOT, 'dist');
fs.mkdirSync(OUT, { recursive: true });

const cssOrder = ['tokens.css', 'base.css', 'components.css', 'app.css'];
const css = cssOrder.map(f => fs.readFileSync(path.join(SRC, 'css', f), 'utf8')).join('\n\n');

/* Concatenar JS módulos respetando dependencias topológicas.
   El bundle final usa un objeto __mp__ como namespace; cada módulo se envuelve
   en una IIFE y registra sus exports en él. */
const modules = collectModules(path.join(SRC, 'js'));
const bundle = wrapBundle(modules);

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace(/<link rel="stylesheet" href="src\/css\/[^"]+" *\/?>/g, '')
  .replace(/<script[^>]*type="module"[^>]*src="src\/js\/main\.js"[^>]*>\s*<\/script>/, '')
  .replace('</head>',
    `<style>\n${css}\n</style>\n</head>`)
  .replace('</body>',
    `<script>\n${bundle}\n</script>\n</body>`);

fs.writeFileSync(path.join(OUT, 'Index.html'), html);
console.log('✓ dist/Index.html  (' + Math.round(html.length/1024) + ' KB)');

/* ---------- helpers ---------- */
function collectModules(dir) {
  const out = [];
  walk(dir);
  return out;

  function walk(d) {
    fs.readdirSync(d).forEach(name => {
      const p = path.join(d, name);
      const s = fs.statSync(p);
      if (s.isDirectory()) walk(p);
      else if (name.endsWith('.js')) out.push({ rel: path.relative(SRC, p), abs: p, src: fs.readFileSync(p, 'utf8') });
    });
  }
}

function wrapBundle(modules) {
  /* Sustituye imports/exports por accesos a __mp__.modules['<rel>']. */
  const transform = m => {
    let s = m.src;
    /* exports nombrados: export [async] function/class/const/let/var X */
    const named = [];
    s = s.replace(/export\s+(async\s+function|function\s*\*|function|class|const|let|var)\s+([a-zA-Z_$][\w$]*)/g, (_, kw, name) => { named.push(name); return `${kw} ${name}`; });
    /* export { a, b as c, ... } */
    s = s.replace(/export\s*\{([^}]+)\}\s*;?/g, (_, body) => {
      body.split(',').map(x => x.trim()).filter(Boolean).forEach(spec => {
        const [orig, alias] = spec.split(/\s+as\s+/).map(x => x.trim());
        named.push(alias || orig);
      });
      return '';
    });
    /* imports: extraer y reemplazar con asignaciones desde __mp__.modules */
    const importStmts = [];
    s = s.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g, (_, names, src) => {
      const items = names.split(',').map(x => x.trim()).filter(Boolean);
      const resolved = resolveRel(m.rel, src);
      importStmts.push({ items, resolved });
      return '';
    });

    const importLines = importStmts.map(({ items, resolved }) =>
      items.map(spec => {
        const [orig, alias] = spec.split(/\s+as\s+/).map(x => x.trim());
        return `const ${alias || orig} = __mp__.modules['${resolved}'].${orig};`;
      }).join('\n')
    ).join('\n');

    const exportObj = named.length
      ? `__mp__.modules['${m.rel}'] = { ${[...new Set(named)].join(', ')} };`
      : `__mp__.modules['${m.rel}'] = {};`;

    return `/* ===== ${m.rel} ===== */\n(function(){\n${importLines}\n${s}\n${exportObj}\n})();`;
  };

  /* Orden topológico simple */
  const byName = new Map(modules.map(m => [m.rel, m]));
  const order = [];
  const seen = new Set();
  function visit(m, stack = []) {
    if (seen.has(m.rel)) return;
    if (stack.includes(m.rel)) return; /* ciclo: igual lo agregamos al final */
    stack.push(m.rel);
    const deps = [...m.src.matchAll(/import\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"]/g)].map(x => resolveRel(m.rel, x[1]));
    deps.forEach(d => { if (byName.has(d)) visit(byName.get(d), stack); });
    seen.add(m.rel);
    order.push(m);
  }
  modules.forEach(m => visit(m));

  return `var __mp__ = { modules: {} };\n` + order.map(transform).join('\n\n');
}

function resolveRel(from, spec) {
  const base = path.posix.dirname(from.split(path.sep).join('/'));
  const joined = path.posix.normalize(path.posix.join(base, spec));
  return joined.replace(/^\.\//, '');
}
