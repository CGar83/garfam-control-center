import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, Copy, FileText, Search } from "lucide-react";
import references from "../data/processorReferences.json";
import { templateById } from "../lib/operations.js";
import { Button, PageHeader } from "../components/ui.jsx";

function SourceText({ text, checkbox = false }) {
  return String(text)
    .trimStart()
    .replace(/^#{1,6}\s+/, "")
    .replace(checkbox ? /^[-*]\s+\[[ xX]\]\s*/ : /$^/, "")
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );
}

export function referenceText(reference) {
  return [
    reference.title,
    "SOURCE REFERENCE · Unverified training content; human review required.",
    `${reference.source.fileName} · lines ${reference.source.lineStart}–${reference.source.lineEnd}`,
    reference.limitations,
    ...reference.blocks.map((block) =>
      block.type === "table"
        ? [
            block.columns.join(" | "),
            ...block.rows.map((row) => row.join(" | ")),
          ].join("\n")
        : `${block.type === "list-item" && !block.markerPreserved ? `${"  ".repeat(block.depth || 0)}- ` : ""}${block.text}`,
    ),
    ...(reference.omissions || []).map(
      (entry) => `Excluded source lines ${entry.sourceLines}: ${entry.reason}`,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function OperatingReferences() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [copyStatus, setCopyStatus] = useState("");
  const term = query.trim().toLowerCase();
  const visible = references.filter(
    (reference) =>
      (category === "all" || reference.category === category) &&
      (!term ||
        [
          reference.title,
          reference.category,
          ...reference.blocks.map((block) => block.text || ""),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term)),
  );
  const requested = references.find(
    (reference) => reference.id === params.get("id"),
  );
  const selected =
    visible.find((reference) => reference.id === requested?.id) || visible[0];
  const categories = [
    ...new Set(references.map((reference) => reference.category)),
  ];
  const select = (id) => {
    setParams({ id });
    setCopyStatus("");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referenceText(selected));
      setCopyStatus({
        id: selected.id,
        message: "Reference copied with its source and limitations.",
      });
    } catch {
      setCopyStatus({
        id: selected.id,
        message: "Clipboard unavailable. Select the source text to copy it.",
      });
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Operations / Source references"
        title="The procedure. In its original order."
        lede="Consult the supplied training beside your work. Original wording and groupings stay visible; your loan evidence and next action belong in the work item."
      >
        <Button variant="outline" to="/workflows">
          <FileText size={16} /> Workflow library
        </Button>
        <Button variant="outline" to="/journey">
          <BookOpen size={16} /> Loan flow
        </Button>
      </PageHeader>
      <div className="reference-intro">
        <BookOpen size={22} />
        <div>
          <strong>Training reference, subject to owner review</strong>
          <p>
            These excerpts do not establish current investor policy or legal
            timing. Source instructions are reading material; opening or copying
            them performs no external action.
          </p>
        </div>
        <span>{references.length} source excerpts</span>
      </div>
      <div className="reference-layout">
        <aside className="reference-index">
          <label className="reference-search">
            <Search size={16} />
            <input
              aria-label="Search source references"
              placeholder="Find a step or checklist"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCopyStatus("");
              }}
            />
          </label>
          <select
            className="sel"
            aria-label="Filter reference category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setCopyStatus("");
            }}
          >
            <option value="all">All reference areas</option>
            {categories.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
          <span className="eyebrow">{visible.length} REFERENCES</span>
          <nav aria-label="Source reference selection">
            {visible.map((reference, index) => (
              <button
                key={reference.id}
                aria-pressed={reference.id === selected?.id}
                className={reference.id === selected?.id ? "selected" : ""}
                onClick={() => select(reference.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <b>{reference.title}</b>{" "}
                  <small>{reference.category}</small>
                </div>
                <ArrowRight size={14} />
              </button>
            ))}
          </nav>
          <p>
            Source: Processor Master Content. Supplied capture only. Missing
            linked files and unseen pages are not reconstructed.
          </p>
        </aside>
        {selected ? (
          <article className="reference-document" key={selected.id}>
            <header>
              <div>
                <span className="eyebrow">
                  {selected.category} / SOURCE EXCERPT
                </span>
                <h2>{selected.title}</h2>
                <p>
                  {selected.source.fileName} · Lines {selected.source.lineStart}
                  –{selected.source.lineEnd}
                </p>
              </div>
              <Button variant="outline" onClick={copy}>
                <Copy size={15} /> Copy reference
              </Button>
            </header>
            <div className="reference-scope">
              <strong>Scope of this excerpt</strong>
              <p>{selected.limitations}</p>
              {selected.omissions?.length > 0 && (
                <ul>
                  {selected.omissions.map((entry, index) => (
                    <li key={index}>
                      Lines{" "}
                      {Array.isArray(entry.sourceLines)
                        ? entry.sourceLines.join("–")
                        : entry.sourceLines}
                      : {entry.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {copyStatus?.id === selected.id && (
              <p className="reference-copy-status" role="status">
                {copyStatus.message}
              </p>
            )}
            <div className="reference-content">
              {selected.blocks.map((block, index) =>
                block.type === "heading" ? (
                  <h3 key={index}>
                    <SourceText text={block.text} />
                  </h3>
                ) : block.type === "table" ? (
                  <div
                    key={index}
                    className="reference-table"
                    tabIndex={0}
                    role="region"
                    aria-label="Source table"
                  >
                    <table>
                      <thead>
                        <tr>
                          {block.columns.map((column, i) => (
                            <th key={i}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {block.rows.map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j}>
                                <SourceText text={cell} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : block.type === "list-item" ? (
                  <div
                    key={index}
                    className="reference-list-item"
                    style={{ "--source-depth": block.depth || 0 }}
                  >
                    {/^[\s]*[-*]\s+\[[ xX]\]/.test(block.text) ? (
                      <span
                        className="reference-static-check"
                        aria-hidden="true"
                      >
                        {/\[[xX]\]/.test(block.text) ? "✓" : ""}
                      </span>
                    ) : (
                      !block.markerPreserved && (
                        <span aria-hidden="true">•</span>
                      )
                    )}
                    <p>
                      <SourceText
                        text={block.text}
                        checkbox={/^[\s]*[-*]\s+\[[ xX]\]/.test(block.text)}
                      />
                    </p>
                  </div>
                ) : (
                  <p key={index}>
                    <SourceText text={block.text} />
                  </p>
                ),
              )}
            </div>
            <footer>
              <span className="eyebrow">RELATED WORKSPACES</span>
              <div>
                {selected.relatedTemplateIds
                  .map((id) => templateById(id))
                  .filter(Boolean)
                  .map((template) => (
                    <Link
                      key={template.id}
                      to={`/operations?create=1&template=${encodeURIComponent(template.id)}`}
                    >
                      {template.title}
                      <ArrowRight size={14} />
                    </Link>
                  ))}
              </div>
              <p>
                A new work item records your coordination. It does not verify
                this reference, submit a file, issue documents, or change a loan
                milestone.
              </p>
            </footer>
          </article>
        ) : (
          <div className="reference-empty">
            <Search size={28} />
            <h2>No matching references</h2>
            <p>Try a shorter phrase or choose all reference areas.</p>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
