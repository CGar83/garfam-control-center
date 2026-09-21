import { Fragment } from "react";
import {
  Label,
  Hint,
  Input,
  TextArea,
  Select,
  Pills,
  YesNo,
  Check,
  Callout,
  Surface,
  Badge,
} from "./ui.jsx";
import {
  evalCond,
  interpolate,
  resolveOptions,
  resolveHint,
  visibleSections,
  expandField,
  isFilled,
} from "../lib/schema.js";
import { canEditField, canVerifyField } from "../lib/stages.js";
import { ST, PT, CZ, CE } from "../data/investors.js";

const REFS = { ST, PT, CZ, CE };
const REFERENCE_NOTE =
  "Imported reference. Not verified as current. Human underwriter review required.";
const inputId = (key) => `field-${key}`;

function Verify({
  field,
  leafKey,
  ctx,
  verified,
  onVerify,
  role,
  stage,
  label,
  disabled,
}) {
  const can = canVerifyField(field, role, stage);
  const v = verified?.[leafKey];
  if (!can && !v) return null;
  const who = v ? ctx.names?.[v.by] || "MLP" : null;
  const leaf = expandField(field).find((item) => item.key === leafKey) || field;
  const filled = isFilled(leaf, ctx.data);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!v}
      aria-label={`${v ? "Unverify" : "Verify"} ${leaf.label || field.label}`}
      className={"verify" + (v ? " on" : "") + (can ? "" : " ro")}
      disabled={!can || disabled || (!v && !filled)}
      onClick={() => onVerify(leafKey, !v)}
      title={
        v
          ? `Verified ${new Date(v.at).toLocaleString()}`
          : filled
            ? "Record human review of this field"
            : "Complete this field before verification"
      }
    >
      <span className="vbox" aria-hidden="true">
        {v ? "✓" : ""}
      </span>
      {v ? `Verified by ${who}` : label || "Verify"}
    </button>
  );
}

function Field({
  field,
  ctx,
  role,
  stage,
  verified,
  onChange,
  onVerify,
  disabled,
  verifyBusy,
  highlightMissing,
}) {
  const editable = !disabled && canEditField(field, role, stage);
  const data = ctx.data;
  const set = (key) => (value) => onChange(key, value);
  const rawHint = resolveHint(field, ctx);
  const investorHint =
    field.hint?.fromInvestor ||
    (typeof field.hint === "string" && field.hint.includes("{investor."));
  const hint = rawHint ? (
    <>
      {rawHint}
      {investorHint && (
        <span className="reference-label"> {REFERENCE_NOTE}</span>
      )}
    </>
  ) : null;
  const leaves = expandField(field);
  const missing =
    highlightMissing &&
    leaves.some((leaf) => leaf.required && !isFilled(leaf, data));
  const wrapCls =
    "fld" +
    (field.span === 2 ? " span2" : "") +
    (verified?.[field.key] ? " verified" : "") +
    (missing ? " field-missing" : "");
  const verifyProps = {
    field,
    ctx,
    verified,
    onVerify,
    role,
    stage,
    disabled: disabled || verifyBusy,
  };
  const verifyEl = <Verify {...verifyProps} leafKey={field.key} />;
  const controlProps = {
    id: inputId(field.key),
    "aria-label": field.label,
    "aria-required": !!field.required,
    "aria-describedby": rawHint ? `${inputId(field.key)}-hint` : undefined,
  };
  const label = (
    <Label htmlFor={inputId(field.key)} required={field.required}>
      {field.label}
    </Label>
  );
  const help = (
    <div id={`${inputId(field.key)}-hint`}>
      <Hint>{hint}</Hint>
    </div>
  );
  const wrap = (contents) => (
    <div id={`field-group-${field.key}`} className={wrapCls}>
      {label}
      {contents}
      {help}
      {verifyEl}
    </div>
  );

  switch (field.type) {
    case "callout": {
      if (!evalCond(field.when, ctx)) return null;
      const investor = ctx.investor || {};
      const title = field.titleFromInvestor
        ? investor[field.titleFromInvestor]
        : interpolate(field.title, ctx);
      let body = null;
      if (
        field.listFromInvestor &&
        (!Array.isArray(investor[field.listFromInvestor]) ||
          investor[field.listFromInvestor].length === 0)
      )
        return null;
      if (field.listFromInvestor)
        body = (
          <ul>
            {investor[field.listFromInvestor].map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        );
      else if (field.items)
        body = (
          <ul>
            {field.items
              .filter((item) => evalCond(item.when, ctx))
              .map((item, index) => (
                <li key={index}>{interpolate(item.text, ctx)}</li>
              ))}
          </ul>
        );
      else if (field.bodyFromInvestor) body = investor[field.bodyFromInvestor];
      else body = interpolate(field.body, ctx);
      return (
        <div className="span2">
          <Callout
            type={field.calloutType}
            title={<>Reference flag: {title}</>}
          >
            {body}
            <div className="reference-label">{REFERENCE_NOTE}</div>
          </Callout>
        </div>
      );
    }
    case "note":
      return (
        <div className="note span2">
          {field.text}
          <div className="reference-label">{REFERENCE_NOTE}</div>
        </div>
      );
    case "scoreSummary": {
      const answered = field.ynKeys.filter((key) =>
        ["Yes", "No"].includes(data[key]),
      ).length;
      const strong = field.ynKeys.filter((key) => data[key] === "Yes").length;
      return (
        <div className="score span2">
          <div className="big">
            {strong} <span className="faint">/ {field.ynKeys.length}</span>
          </div>
          <div>
            <Badge
              variant={answered === field.ynKeys.length ? "outline" : "muted"}
            >
              {answered === field.ynKeys.length
                ? "Human-entered assessment"
                : `${answered} of ${field.ynKeys.length} assessed`}
            </Badge>
            <div className="msg">
              Buckets marked strong by the reviewer. This count is a workflow
              summary, not a credit decision.
            </div>
          </div>
        </div>
      );
    }
    case "bucket":
      return (
        <div
          id={`field-group-${field.key}`}
          className={
            "bucket" +
            (data[field.ynKey] === "Yes" ? " on" : "") +
            (missing ? " field-missing" : "")
          }
        >
          <div className="bt">
            <span>{field.label}</span>
            {data[field.ynKey] === "Yes" && (
              <Badge variant="outline">Reviewer marked strong</Badge>
            )}
          </div>
          <Label htmlFor={inputId(field.valueKey)} required={field.required}>
            {field.valueLabel}
          </Label>
          <Input
            id={inputId(field.valueKey)}
            aria-label={field.valueLabel}
            aria-required={!!field.required}
            type={field.valueLabel.includes("DTI") ? "text" : "number"}
            value={data[field.valueKey]}
            onChange={set(field.valueKey)}
            disabled={!editable}
          />
          <div style={{ marginTop: 10 }}>
            <Label required={field.required}>Bucket strong?</Label>
            <YesNo
              id={inputId(field.ynKey)}
              aria-label={`${field.label}: bucket strong?`}
              value={data[field.ynKey]}
              onChange={set(field.ynKey)}
              disabled={!editable}
            />
          </div>
          <div className="foot">
            {field.footnote}
            <div className="reference-label">{REFERENCE_NOTE}</div>
          </div>
        </div>
      );
    case "address": {
      const keys = field.keys;
      const addressInput = (key, placeholder) => (
        <Input
          id={inputId(key)}
          aria-label={`${field.label}: ${placeholder}`}
          aria-required={key !== keys.street2 && !!field.required}
          value={data[key]}
          onChange={set(key)}
          placeholder={placeholder}
          disabled={!editable}
        />
      );
      return (
        <div id={`field-group-${field.key}`} className={wrapCls}>
          <Label required={field.required}>{field.label}</Label>
          <div className="address-fields">
            {addressInput(keys.street, "Street")}
            {addressInput(keys.street2, "Street 2 (optional)")}
            <div className="address-location">
              {addressInput(keys.city, "City")}
              <Select
                id={inputId(keys.state)}
                aria-label={`${field.label}: State`}
                aria-required={!!field.required}
                value={data[keys.state]}
                onChange={set(keys.state)}
                options={ST}
                placeholder="State"
                disabled={!editable}
              />
              {addressInput(keys.zip, "Zip")}
            </div>
          </div>
          <div className="address-verification">
            {leaves
              .filter((leaf) => leaf.verify !== false)
              .map((leaf) => (
                <Verify
                  key={leaf.key}
                  {...verifyProps}
                  leafKey={leaf.key}
                  label={`Verify ${leaf.label.split(": ")[1]}`}
                />
              ))}
          </div>
        </div>
      );
    }
    case "checkgroup":
      return wrap(
        <div
          id={inputId(field.key)}
          role="group"
          aria-label={field.label}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          {field.items
            .filter((item) => evalCond(item.showIf, ctx))
            .map((item) => (
              <Check
                key={item.key}
                on={!!data[item.key]}
                onChange={set(item.key)}
                label={item.label}
                disabled={!editable}
              />
            ))}
        </div>,
      );
    case "investor": {
      const products = ctx.PR?.[ctx.product] || {};
      return wrap(
        <select
          {...controlProps}
          className="sel"
          value={data.pr || ""}
          onChange={(event) => onChange("pr", event.target.value)}
          disabled={!editable}
        >
          <option value="">Select Investor / Product</option>
          {["A", "B", "C"].map(
            (tier) =>
              products[tier]?.length > 0 && (
                <optgroup key={tier} label={`Class ${tier}`}>
                  {products[tier].map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.n}
                    </option>
                  ))}
                </optgroup>
              ),
          )}
        </select>,
      );
    }
    case "pill":
      return wrap(
        <Pills
          {...controlProps}
          value={data[field.key]}
          onChange={set(field.key)}
          options={resolveOptions(field, ctx)}
          disabled={!editable}
        />,
      );
    case "yn":
      return wrap(
        <YesNo
          {...controlProps}
          value={data[field.key]}
          onChange={set(field.key)}
          disabled={!editable}
        />,
      );
    case "select":
      return wrap(
        <Select
          {...controlProps}
          value={data[field.key]}
          onChange={set(field.key)}
          options={
            field.optionsRef
              ? REFS[field.optionsRef]
              : resolveOptions(field, ctx)
          }
          disabled={!editable}
        />,
      );
    case "textarea":
      return wrap(
        <TextArea
          {...controlProps}
          value={data[field.key]}
          onChange={set(field.key)}
          placeholder={field.placeholder}
          disabled={!editable}
        />,
      );
    default:
      return wrap(
        <Input
          {...controlProps}
          type={field.type || "text"}
          step={field.step}
          value={data[field.key]}
          onChange={set(field.key)}
          placeholder={field.placeholder}
          disabled={!editable || (field.lockedAfterCreate && !!data[field.key])}
        />,
      );
  }
}

function groupFields(fields) {
  const out = [];
  for (const field of fields) {
    const last = out[out.length - 1];
    if (field.group && last?.group === field.group) last.fields.push(field);
    else if (field.group)
      out.push({
        group: field.group,
        title: field.groupTitle,
        fields: [field],
      });
    else out.push({ fields: [field] });
  }
  return out;
}

export default function FormRenderer({
  schema,
  ctx,
  role,
  stage,
  verified,
  onChange,
  onVerify,
  disabled = false,
  verifyBusy = false,
  highlightMissing = false,
}) {
  const sections = visibleSections(schema, ctx);
  const props = {
    ctx,
    role,
    stage,
    verified,
    onChange,
    onVerify,
    disabled,
    verifyBusy,
    highlightMissing,
  };
  return (
    <div className="stack worksheet-sections">
      {sections.map((section, index) => {
        const required = section.fields
          .filter(
            (field) =>
              !["callout", "note", "scoreSummary"].includes(field.type),
          )
          .flatMap(expandField)
          .filter((field) => field.required);
        const filled = required.filter((field) =>
          isFilled(field, ctx.data),
        ).length;
        return (
          <Surface
            key={section.id}
            n={index + 1}
            title={section.title}
            id={"s-" + section.id}
            right={
              <div className="section-completion">
                <Badge variant={filled === required.length ? "ok" : "muted"}>
                  {filled}/{required.length} required
                </Badge>
                {section.fields.some(
                  (field) => (field.owner || "LO") === "MLP",
                ) && <Badge variant="outline">MLP fills</Badge>}
              </div>
            }
          >
            <div className="g2">
              {groupFields(section.fields).map((group, groupIndex) =>
                group.group ? (
                  <div className="grp" key={groupIndex}>
                    {group.title && (
                      <div className="grp-title">{group.title}</div>
                    )}
                    <div className="g2">
                      {group.fields.map((field) => (
                        <Field key={field.key} field={field} {...props} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <Fragment key={groupIndex}>
                    {group.fields.map((field) => (
                      <Field key={field.key} field={field} {...props} />
                    ))}
                  </Fragment>
                ),
              )}
            </div>
          </Surface>
        );
      })}
    </div>
  );
}
