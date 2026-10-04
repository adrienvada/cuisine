/* L'échappement HTML et l'étiquette html`…`. */

import test from "node:test";
import assert from "node:assert/strict";
import { esc, html, raw } from "../../js/core/html.js";

test("esc : & < > \" ' sont échappés", () => {
  assert.equal(esc(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  assert.equal(esc("rien à échapper"), "rien à échapper");
});

test("esc : null, undefined et nombres", () => {
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
  assert.equal(esc(0), "0");
  assert.equal(esc(12.5), "12.5");
});

test("html : chaque valeur interpolée est échappée", () => {
  const titre = `Tarte "aux" <pommes> & cie`;
  assert.equal(html`<h1 title="${titre}">${titre}</h1>`,
    `<h1 title="Tarte &quot;aux&quot; &lt;pommes&gt; &amp; cie">Tarte &quot;aux&quot; &lt;pommes&gt; &amp; cie</h1>`);
});

test("html : raw laisse passer le balisage déjà sûr", () => {
  assert.equal(html`<p>${raw("<b>gras</b>")} et ${"<i>"}</p>`, "<p><b>gras</b> et &lt;i&gt;</p>");
});

test("html : un tableau se déroule sans séparateur, chaque élément suivant la même règle", () => {
  const items = ["a<b", raw("<u>c</u>"), 3];
  assert.equal(html`<ul>${items}</ul>`, "<ul>a&lt;b<u>c</u>3</ul>");
});

test("html : un gabarit imbriqué se passe par raw, sans quoi il est échappé une seconde fois", () => {
  const li = x => html`<li>${x}</li>`;
  assert.equal(html`<ul>${["<", "&"].map(x => raw(li(x)))}</ul>`, "<ul><li>&lt;</li><li>&amp;</li></ul>");
  assert.equal(html`<ul>${["<"].map(li)}</ul>`, "<ul>&lt;li&gt;&amp;lt;&lt;/li&gt;</ul>");
});

test("html : null, undefined et false n'écrivent rien, 0 s'écrit", () => {
  assert.equal(html`[${null}][${undefined}][${false}][${0}]`, "[][][][0]");
  assert.equal(html`${1 > 2 && html`<b>non</b>`}`, "");
});
