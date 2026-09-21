// Schema engine. Forms are data (JSON). This module merges layers, evaluates showIf conditions,
// interpolates investor hints, and computes required/verified completeness.
//
// Field shape:
// { key, label, type, required, owner ('LO'|'MLP'|'PROCESSOR'), verify (bool, default true for LO fields),
//   options (array | {fromInvestor, default}), hint ({fromInvestor, template} | string),
//   showIf (condition), placeholder, step, callouts: [{type, title, body|list|items, when}] }
//
// Condition shape (any of):
// { field, eq|ne|in|nin|lt|gt|lte|gte|truthy|falsy }      value from form data
// { investor, eq|ne|truthy|falsy|lt|gt }                  value from selected investor config
// { field, ltInvestor|gtInvestor }                        compare a field to an investor config key
// { product }  { all: [] }  { any: [] }  { not: {} }

export function mergeSchema(base, product) {
  const sections = [...(base.sections || [])];
  for (const ps of product.sections || []) {
    const idx = sections.findIndex((s) => s.id === ps.id);
    if (idx === -1) {
      sections.push(ps);
      continue;
    }
    // Product section extends a base section: merge fields at anchor positions.
    const merged = { ...sections[idx], fields: [...sections[idx].fields] };
    for (const f of ps.fields || []) {
      if (f.after) {
        const at = merged.fields.findIndex((x) => x.key === f.after);
        merged.fields.splice(at === -1 ? merged.fields.length : at + 1, 0, f);
      } else merged.fields.push(f);
    }
    sections[idx] = merged;
  }
  sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return {
    ...base,
    ...product,
    sections,
    base_version: base.version,
    product_version: product.version,
  };
}

const num = (v) => (v === "" || v == null ? NaN : parseFloat(v));

export function evalCond(cond, ctx) {
  if (cond == null) return true;
  if (cond.all) return cond.all.every((c) => evalCond(c, ctx));
  if (cond.any) return cond.any.some((c) => evalCond(c, ctx));
  if (cond.not) return !evalCond(cond.not, ctx);
  if (cond.product)
    return Array.isArray(cond.product)
      ? cond.product.includes(ctx.product)
      : ctx.product === cond.product;

  let v;
  if (cond.field !== undefined) v = ctx.data[cond.field];
  else if (cond.investor !== undefined)
    v = ctx.investor ? ctx.investor[cond.investor] : undefined;

  if ("eq" in cond) return v === cond.eq;
  if ("ne" in cond) return v !== cond.ne;
  if ("in" in cond) return cond.in.includes(v);
  if ("nin" in cond) return !cond.nin.includes(v);
  if ("truthy" in cond) return cond.truthy ? !!v : !v;
  if ("falsy" in cond) return cond.falsy ? !v : !!v;
  if ("lt" in cond) return !isNaN(num(v)) && num(v) < cond.lt;
  if ("gt" in cond) return !isNaN(num(v)) && num(v) > cond.gt;
  if ("lte" in cond) return !isNaN(num(v)) && num(v) <= cond.lte;
  if ("gte" in cond) return !isNaN(num(v)) && num(v) >= cond.gte;
  if ("ltInvestor" in cond) {
    const t = ctx.investor ? num(ctx.investor[cond.ltInvestor]) : NaN;
    return !isNaN(num(v)) && !isNaN(t) && num(v) > 0 && num(v) < t;
  }
  if ("gtInvestor" in cond) {
    const t = ctx.investor ? num(ctx.investor[cond.gtInvestor]) : NaN;
    return !isNaN(num(v)) && !isNaN(t) && num(v) > t;
  }
  return true;
}

export function interpolate(tpl, ctx) {
  if (!tpl) return "";
  return String(tpl).replace(/\{(investor|field)\.(\w+)\}/g, (_, src, key) => {
    const v = src === "investor" ? ctx.investor?.[key] : ctx.data[key];
    return v == null ? "" : String(v);
  });
}

export function resolveOptions(field, ctx) {
  const o = field.options;
  if (Array.isArray(o)) return o;
  if (o && o.fromInvestor) {
    const v = ctx.investor?.[o.fromInvestor];
    return Array.isArray(v) && v.length ? v : o.default || [];
  }
  return [];
}

export function resolveHint(field, ctx) {
  const h = field.hint;
  if (!h) return "";
  if (typeof h === "string") return interpolate(h, ctx);
  if (h.fromInvestor) {
    const v = ctx.investor?.[h.fromInvestor];
    if (v == null || v === false) return "";
    return interpolate(h.template || "{investor." + h.fromInvestor + "}", {
      ...ctx,
      investor: { ...ctx.investor, value: v },
    }).replace("{value}", String(v));
  }
  return "";
}

// Flatten address composites so completeness and events treat sub-keys as fields.
export function expandField(field) {
  if (field.type === "address") {
    return [
      {
        key: field.keys.street,
        label: `${field.label}: Street`,
        required: field.required,
        owner: field.owner,
        verify: field.verify,
      },
      {
        key: field.keys.street2,
        label: `${field.label}: Street 2`,
        required: false,
        owner: field.owner,
        verify: false,
      },
      {
        key: field.keys.city,
        label: `${field.label}: City`,
        required: field.required,
        owner: field.owner,
        verify: field.verify,
      },
      {
        key: field.keys.state,
        label: `${field.label}: State`,
        required: field.required,
        owner: field.owner,
        verify: field.verify,
      },
      {
        key: field.keys.zip,
        label: `${field.label}: Zip`,
        required: field.required,
        owner: field.owner,
        verify: field.verify,
      },
    ];
  }
  if (field.type === "checkgroup") {
    // A checkgroup counts as one required item; verification also happens at the group level.
    return [
      { ...field, key: field.key || field.items.map((i) => i.key).join("+") },
    ];
  }
  if (field.type === "bucket") {
    return [
      {
        key: field.valueKey,
        label: `${field.label}: value`,
        required: field.required,
        owner: field.owner,
        verify: field.verify,
      },
      {
        key: field.ynKey,
        label: `${field.label}: strong?`,
        required: field.required,
        owner: field.owner,
        verify: field.verify,
      },
    ];
  }
  return [field];
}

export function isFilled(field, data) {
  if (field.type === "checkgroup")
    return (field.items || []).some((i) => !!data[i.key]);
  const v = data[field.key];
  return !(v === undefined || v === null || v === "" || v === false);
}

// Visible fields for the current context, with section grouping preserved.
export function visibleSections(schema, ctx) {
  return schema.sections
    .filter((s) => evalCond(s.showIf, ctx))
    .map((s) => ({
      ...s,
      fields: s.fields.filter((f) => evalCond(f.showIf, ctx)),
    }))
    .filter((s) => s.fields.length > 0);
}

// Completeness by owner role. Returns {required, filled, missing:[{key,label,section}]}
export function completeness(schema, ctx, ownerRole = "LO") {
  const out = { required: 0, filled: 0, missing: [] };
  for (const s of visibleSections(schema, ctx)) {
    for (const f of s.fields) {
      if ((f.owner || "LO") !== ownerRole) continue;
      if (
        f.type === "callout" ||
        f.type === "note" ||
        f.type === "scoreSummary"
      )
        continue;
      for (const leaf of expandField(f)) {
        if (!leaf.required) continue;
        out.required++;
        if (isFilled(leaf, ctx.data)) out.filled++;
        else
          out.missing.push({
            key: leaf.key,
            label: leaf.label,
            section: s.title,
          });
      }
    }
  }
  return out;
}

// Verifiable leaf fields (LO-owned, verify !== false, currently visible) and how many are verified.
export function verification(schema, ctx, verified = {}) {
  const items = [];
  for (const s of visibleSections(schema, ctx)) {
    for (const f of s.fields) {
      if ((f.owner || "LO") !== "LO" || f.verify === false) continue;
      if (["callout", "note", "scoreSummary"].includes(f.type)) continue;
      for (const leaf of expandField(f)) {
        if (leaf.verify === false) continue;
        if (!leaf.required && !isFilled(leaf, ctx.data)) continue;
        items.push({
          key: leaf.key,
          label: leaf.label,
          section: s.title,
          verified: !!verified[leaf.key],
        });
      }
    }
  }
  return {
    total: items.length,
    done: items.filter((i) => i.verified).length,
    items,
  };
}
