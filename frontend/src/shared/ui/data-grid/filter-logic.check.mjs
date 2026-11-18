/**
 * Runnable check for the row maths behind every table:
 *   node filter-logic.check.mjs
 * If filtering or sorting silently starts hiding or misordering rows, this
 * fails instead of the user noticing "some leads are missing".
 */
import assert from "node:assert/strict";
import {
  applyFilters,
  applySearch,
  dateRangeForRule,
  matchesRule,
  OPERATOR_LABEL,
  OPERATORS_BY_TYPE,
  operatorChoices,
  PAGE_SIZES,
  pageNumbers,
  pageSizeChoices,
  sortRows,
} from "./filter-logic.js";
const rows = [
  { name: "Ada", status: "qualified", value: 1000, due: "2026-01-10", hot: true },
  { name: "Brij", status: "new", value: 50, due: "2026-03-02", hot: false },
  { name: "Chen", status: "lost", value: null, due: null, hot: false },
];

const columns = [
  { key: "name", label: "Name", type: "text", value: (r) => r.name },
  { key: "status", label: "Status", type: "status", value: (r) => r.status },
  { key: "value", label: "Value", type: "number", value: (r) => r.value },
  { key: "due", label: "Due", type: "date", value: (r) => r.due },
  { key: "hot", label: "Hot", type: "boolean", value: (r) => r.hot },
];
const col = (id) => columns.find((c) => c.key === id);
const names = (list) => list.map((r) => r.name);

// text
assert.equal(matchesRule(col("name"), rows[0], { id: "1", columnId: "name", operator: "contains", value: "AD" }), true, "contains is case-insensitive");
assert.equal(matchesRule(col("name"), rows[1], { id: "1", columnId: "name", operator: "starts_with", value: "Br" }), true);
assert.equal(matchesRule(col("name"), rows[1], { id: "1", columnId: "name", operator: "not_contains", value: "ada" }), true);

// choice
assert.deepEqual(names(applyFilters(rows, columns, [{ id: "1", columnId: "status", operator: "is", value: "lost" }])), ["Chen"]);
assert.deepEqual(names(applyFilters(rows, columns, [{ id: "1", columnId: "status", operator: "is_not", value: "lost" }])), ["Ada", "Brij"]);

// numeric — a blank must not read as zero
assert.deepEqual(names(applyFilters(rows, columns, [{ id: "1", columnId: "value", operator: "gt", value: 100 }])), ["Ada"]);
assert.deepEqual(names(applyFilters(rows, columns, [{ id: "1", columnId: "value", operator: "lt", value: 100 }])), ["Brij"], "null value is not < 100");
assert.deepEqual(names(applyFilters(rows, columns, [{ id: "1", columnId: "value", operator: "is_empty" }])), ["Chen"]);

// date — day granularity, not timestamp
assert.deepEqual(names(applyFilters(rows, columns, [{ id: "1", columnId: "due", operator: "before", value: "2026-02-01" }])), ["Ada"]);
assert.deepEqual(names(applyFilters(rows, columns, [{ id: "1", columnId: "due", operator: "is", value: "2026-01-10" }])), ["Ada"]);

// boolean
assert.deepEqual(names(applyFilters(rows, columns, [{ id: "1", columnId: "hot", operator: "is_true" }])), ["Ada"]);

// a half-written rule must never hide rows
assert.equal(applyFilters(rows, columns, [{ id: "1", columnId: "name", operator: "contains", value: "" }]).length, 3);
// rules combine with AND
assert.deepEqual(names(applyFilters(rows, columns, [
  { id: "1", columnId: "status", operator: "is_not", value: "lost" },
  { id: "2", columnId: "value", operator: "gte", value: 1000 },
])), ["Ada"]);
// an unknown column must not silently empty the table
assert.equal(applyFilters(rows, columns, [{ id: "1", columnId: "ghost", operator: "is", value: "x" }]).length, 3);

// search spans every column, not just the name
assert.deepEqual(names(applySearch(rows, columns, "qualified")), ["Ada"]);
assert.deepEqual(names(applySearch(rows, columns, "  ")), ["Ada", "Brij", "Chen"]);

// sort: numeric, not lexicographic — and blanks sink in BOTH directions
assert.deepEqual(names(sortRows(rows, col("value"), "asc")), ["Brij", "Ada", "Chen"]);
assert.deepEqual(names(sortRows(rows, col("value"), "desc")), ["Ada", "Brij", "Chen"]);
assert.deepEqual(names(sortRows(rows, col("due"), "asc")), ["Ada", "Brij", "Chen"]);
assert.deepEqual(names(sortRows(rows, col("name"), "desc")), ["Chen", "Brij", "Ada"]);

// pager: every list stays reachable and never renders a wall of buttons
assert.deepEqual(pageNumbers(1, 1), [1]);
assert.deepEqual(pageNumbers(3, 5), [1, 2, 3, 4, 5], "small lists show every page");
assert.deepEqual(pageNumbers(1, 20), [1, 2, 3, 4, "gap", 20]);
assert.deepEqual(pageNumbers(10, 20), [1, "gap", 9, 10, 11, "gap", 20]);
assert.deepEqual(pageNumbers(20, 20), [1, "gap", 17, 18, 19, 20]);
for (const total of [8, 9, 15, 40, 137]) {
  for (let p = 1; p <= total; p += 1) {
    const out = pageNumbers(p, total);
    assert.ok(out.includes(1) && out.includes(total), `page ${p}/${total} must reach both ends`);
    assert.ok(out.includes(p), `page ${p}/${total} must include the current page`);
    assert.ok(out.length <= 9, `page ${p}/${total} rendered ${out.length} slots`);
    const nums = out.filter((e) => e !== "gap");
    assert.deepEqual(nums, [...nums].sort((a, b) => a - b), "pages must be ascending");
    assert.equal(new Set(nums).size, nums.length, "no duplicate page numbers");
  }
}

// dates: ranges are inclusive at both ends, and relative windows include today
{
  const col = { key: "d", label: "Date", type: "date", value: (r) => r.d };
  const NOW = new Date(2026, 7, 25); // 25 Aug 2026, fixed so "today" cannot drift
  const on = (iso, op, value, value2) =>
    matchesRule(col, { d: iso }, { id: "r", columnId: "d", operator: op, value, value2 }, NOW);

  assert.ok(on("2026-08-10", "between", "2026-08-01", "2026-08-31"), "inside the range");
  assert.ok(on("2026-08-01", "between", "2026-08-01", "2026-08-31"), "lower bound is inclusive");
  assert.ok(on("2026-08-31", "between", "2026-08-01", "2026-08-31"), "upper bound is inclusive");
  assert.ok(!on("2026-07-31", "between", "2026-08-01", "2026-08-31"), "a day before is out");
  assert.ok(!on("2026-09-01", "between", "2026-08-01", "2026-08-31"), "a day after is out");
  assert.ok(
    on("2026-08-10", "between", "2026-08-31", "2026-08-01"),
    "bounds entered backwards still describe the same range",
  );
  assert.ok(on("2026-09-09", "between", "2026-08-01"), "one bound set filters open-ended");

  assert.ok(on("2026-08-25", "is_today"), "today is today");
  assert.ok(!on("2026-08-24", "is_today"), "yesterday is not today");
  assert.ok(on("2026-08-19", "last_7_days"), "7-day window spans today and the six before");
  assert.ok(!on("2026-08-18", "last_7_days"), "the eighth day back is outside");
  assert.ok(on("2026-08-25", "last_7_days"), "the window includes today");
  assert.ok(on("2026-07-27", "last_30_days"), "30-day window reaches back 29 days");
  assert.ok(!on("2026-07-26", "last_30_days"), "the thirty-first day back is outside");
  assert.ok(on("2026-08-01", "is_this_month") && on("2026-08-31", "is_this_month"), "month ends");
  assert.ok(!on("2026-07-31", "is_this_month") && !on("2026-09-01", "is_this_month"), "not it");

  // A relative rule carries no value; it must not be mistaken for unfinished
  // and pass every row through.
  assert.ok(!on("2020-01-01", "last_30_days"), "an old row is excluded, not waved through");
}

// numbers: between is inclusive and order-independent too
{
  const col = { key: "n", label: "Amount", type: "number", value: (r) => r.n };
  const on = (n, value, value2) =>
    matchesRule(col, { n }, { id: "r", columnId: "n", operator: "between", value, value2 });
  assert.ok(on(50, 10, 100) && on(10, 10, 100) && on(100, 10, 100), "inclusive both ends");
  assert.ok(!on(9, 10, 100) && !on(101, 10, 100), "outside the range");
  assert.ok(on(50, 100, 10), "backwards bounds describe the same range");
  assert.ok(on(500, 10), "one bound set filters open-ended");
}

// server-side date ranges: the same rule the grid applies must translate to
// query params that select the same days, last day included
{
  const NOW = new Date(2026, 7, 25);
  const range = (operator, value, value2) =>
    dateRangeForRule({ id: "r", columnId: "d", operator, value, value2 }, NOW);
  const day = (d) => (d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : null);

  const between = range("between", "2026-08-01", "2026-08-31");
  assert.equal(day(between.from), "2026-8-1");
  assert.equal(day(between.to), "2026-8-31", "the last day is inside the range");
  assert.ok(between.to.getHours() === 23, "`to` runs to the end of its day, not midnight");

  assert.equal(day(range("is_today").from), "2026-8-25");
  assert.equal(day(range("last_7_days").from), "2026-8-19");
  assert.equal(day(range("is_this_month").to), "2026-8-31");
  assert.equal(range("before", "2026-08-10").from, null, "before is open at the bottom");
  assert.equal(range("after", "2026-08-10").to, null, "after is open at the top");
  assert.deepEqual(range("is_empty"), { from: null, to: null }, "non-date rules select nothing");
}

// retired operators: no longer offered, but a rule already written with one
// must still filter and must still be shown by its own select
{
  const num = { key: "n", label: "Amount", type: "number", value: (r) => r.n };
  const txt = { key: "t", label: "Vendor", type: "text", value: (r) => r.t };
  const rule = (operator, value) => ({ id: "r", columnId: "x", operator, value });

  for (const op of ["gte", "lte", "starts_with"]) {
    assert.ok(OPERATOR_LABEL[op], `retired ${op} keeps a label, or the chip renders blank`);
  }
  assert.ok(!OPERATORS_BY_TYPE.number.includes("gte"), "gte is no longer offered");
  assert.ok(!OPERATORS_BY_TYPE.text.includes("starts_with"), "starts_with is no longer offered");

  // still matches
  assert.ok(matchesRule(num, { n: 10 }, rule("gte", 10)), "gte still means at least");
  assert.ok(!matchesRule(num, { n: 9 }, rule("gte", 10)));
  assert.ok(matchesRule(num, { n: 10 }, rule("lte", 10)), "lte still means at most");
  assert.ok(matchesRule(txt, { t: "Figma" }, rule("starts_with", "fig")), "starts_with still works");
  assert.ok(!matchesRule(txt, { t: "Figma" }, rule("starts_with", "ma")));

  // and is offered back to the rule holding it
  assert.ok(operatorChoices("number", "gte").includes("gte"), "the select can show gte");
  assert.ok(operatorChoices("text", "starts_with").includes("starts_with"));
  assert.deepEqual(
    operatorChoices("number", "is"),
    OPERATORS_BY_TYPE.number,
    "a current operator already offered adds nothing",
  );
  assert.deepEqual(operatorChoices("number"), OPERATORS_BY_TYPE.number, "no rule yet, plain list");
  // Adding a filter picks a real default, not a retired one.
  assert.ok(OPERATORS_BY_TYPE.number.includes(operatorChoices("number")[0]));
}

// page-size select: the size in use is always offered, or the control renders blank
for (const size of [...PAGE_SIZES, 20, 5, 7, 250]) {
  const choices = pageSizeChoices(size);
  assert.ok(choices.includes(size), `size ${size} must be offered`);
  assert.deepEqual(choices, [...choices].sort((a, b) => a - b), "sizes must be ascending");
  assert.equal(new Set(choices).size, choices.length, "no duplicate sizes");
  for (const standard of PAGE_SIZES) {
    assert.ok(choices.includes(standard), `size ${size} must keep the standard ${standard}`);
  }
}
assert.deepEqual(pageSizeChoices(20), [10, 20, 25, 50, 100], "invoices' 20 slots in order");

// money: stored in paise, the filter box takes rupees
{
  const money = { key: "p", label: "Price", type: "money" };
  const on = (p, operator, value, value2) =>
    matchesRule(money, { p }, { id: "r", columnId: "p", operator, value, value2 });
  assert.ok(on(2500000, "gt", 20000), "25,000 rupees is above 20,000");
  assert.ok(!on(1500000, "gt", 20000));
  assert.ok(on(1500000, "between", 10000, 20000), "between scales both bounds");
  assert.ok(on(1500000, "is", 15000));
}

// person: a { name, sub } object searches, sorts and filters by its name
{
  const people = [{ c: { name: "Zed", sub: "Pune" } }, { c: { name: "Amit", sub: "Delhi" } }];
  const col = { key: "c", label: "Customer", type: "person" };
  assert.equal(applySearch(people, [col], "amit").length, 1);
  assert.equal(sortRows(people, col, "asc")[0].c.name, "Amit");
}

console.log("data-grid filter-logic: all checks passed");
