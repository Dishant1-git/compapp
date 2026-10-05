/**
 * Adds the frontend/backend guard to every exported async function in the
 * server library files listed below (see src/lib/remote.ts):
 *
 *     if (isFrontend()) return remoteCall("trips/queries.getTrip", [slug, viewer]);
 *
 * Run it again after adding a new data function or Server Action:
 *     node scripts/add-remote-guards.mjs
 * It skips functions that already have the guard. A new FILE must also be added
 * to the list here and to the registry in src/app/api/internal/rpc/route.ts.
 */
import fs from "node:fs";
import ts from "typescript";

// Reads, called while rendering pages.
const QUERIES = [
  "auth/account",
  "trips/queries",
  "trips/chat",
  "agency/queries",
  "admin/queries",
  "companion/queries",
  "payments/credits",
  "notifications",
];
// "use server" files: actions called from the browser.
const ACTIONS = [
  "auth/actions",
  "trips/actions",
  "agency/actions",
  "admin/actions",
  "companion/actions",
  "payments/actions",
  "notification-actions",
];

let added = 0;
for (const [keys, helper] of [[QUERIES, "remoteCall"], [ACTIONS, "remoteAction"]]) {
  for (const key of keys) {
    const file = `src/lib/${key}.ts`;
    let text = fs.readFileSync(file, "utf8");
    const nl = text.includes("\r\n") ? "\r\n" : "\n";
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

    const inserts = [];
    for (const node of source.statements) {
      if (!ts.isFunctionDeclaration(node) || !node.body || !node.name) continue;
      const mods = (node.modifiers ?? []).map((m) => m.kind);
      if (!mods.includes(ts.SyntaxKind.ExportKeyword) || !mods.includes(ts.SyntaxKind.AsyncKeyword)) continue;
      if (node.body.getText().includes("if (isFrontend()) return remote")) continue;

      const params = node.parameters.map((p) => {
        if (!ts.isIdentifier(p.name) || p.dotDotDotToken) {
          throw new Error(`${file}: ${node.name.text} has a parameter this script can't forward.`);
        }
        return p.name.text;
      });
      const guard = `${nl}  if (isFrontend()) return ${helper}("${key}.${node.name.text}", [${params.join(", ")}]);`;
      inserts.push({ at: node.body.getStart() + 1, guard });
    }

    for (const { at, guard } of inserts.reverse()) text = text.slice(0, at) + guard + text.slice(at);
    added += inserts.length;

    const importLine = `import { isFrontend, ${helper} } from "@/lib/remote";`;
    if (inserts.length && !text.includes(importLine)) {
      const imports = source.statements.filter(ts.isImportDeclaration);
      const end = imports[imports.length - 1].getEnd();
      text = text.slice(0, end) + nl + importLine + text.slice(end);
    }
    // Actions report their page refreshes back to the frontend through this wrapper.
    text = text.replace('import { revalidatePath } from "next/cache";', 'import { revalidatePath } from "@/lib/revalidate";');
    fs.writeFileSync(file, text);
    console.log(`${file}: ${inserts.length} guard${inserts.length === 1 ? "" : "s"} added`);
  }
}
console.log(`${added} added in total`);
