"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const source = fs.readFileSync(path.join(__dirname, "contracted-services-door.js"), "utf8");
const shell = fs.readFileSync(path.join(__dirname, "asset-management-door.js"), "utf8");
const index = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

const context = {
  window: {},
  document: {
    getElementById() { return null; },
    createElement() { return {}; },
    head: { appendChild() {} },
  },
  console,
  Map,
  Set,
};
vm.runInNewContext(source, context);
const rendered = context.window.__psContractedServicesDoor.render({
  standing: { governed_engagement_count: 0, attention_count: 1,
    unmatched_financial_observation_count: 1, unresolved_count: 1 },
  detail: {
    engagements: [{ service_class: "elevator_maintenance", label: "Elevator maintenance",
      provider: { name: "Provider" }, execution_standing: "EXECUTED_GOVERNING",
      term_standing: { state: "ATTENTION", reason: "Decision due",
        accountable_owner: { state: "UNASSIGNED", label: "UNASSIGNED" },
        milestone: { kind: "notice_decision", date: "2026-10-01" }, current: { prices: [] } },
      documents: [], financial_observations: [{ line_label: "Elevator Contract - June 2026",
        provider_name: "Provider", period_start: "2026-06-01", period_end: "2026-06-30",
        amount_cents: 17010, currency_code: "USD" }] }],
    unmatched_documents: [{ filename: "Generator proposal.pdf", document_kind: "proposal",
      execution_state: "unsigned", evidence: { source_artifact_id: "artifact-generator" } }],
    unmatched_financial_observations: [{ line_label: "Elevator", amount_cents: 100 }],
  },
});

const evidenceOnly = context.window.__psContractedServicesDoor.render({
  standing: { governed_engagement_count: 0, attention_count: 0, unresolved_count: 2 },
  detail: {
    engagements: [],
    unmatched_documents: [{ filename: "4125 Chestnut - Otis - unexecuted.pdf",
      document_kind: "proposal", execution_state: "unsigned",
      evidence: { source_artifact_id: "solo-otis-2020" } }],
    unmatched_financial_observations: [{ label: "Waste removal",
      provider_name: "Philly-wide Disposal Co", amount_cents: 151000, currency_code: "USD" }],
  },
});

const eventDated = context.window.__psContractedServicesDoor.render({
  standing: { governed_engagement_count: 1, attention_count: 1, unresolved_count: 1 },
  detail: { engagements: [{ service_class: "other", label: "Amazon package locker",
    provider: { name: "Amazon.com Services LLC" }, execution_standing: "EXECUTED_GOVERNING",
    term_standing: { state: "OUTCOME_NOT_ESTABLISHED",
      reason: "The governing document is executed, but the current term dates are not established.",
      milestone: { kind: "term_dates_not_established", date: null },
      accountable_owner: { state: "UNASSIGNED", label: "UNASSIGNED" },
      current: { commencement_trigger: "Installation and activation of the Amazon Hub",
        initial_term_months: 60,
        prices: [{ amount_cents: 790000, currency_code: "USD", basis: "flat" }] } },
    scope: { summary: "Apartment package locker service.", frequency: "Continuous amenity service" },
    documents: [], financial_observations: [{ line_label: "Amazon prepaid schedule",
      provider_name: "Amazon.com Services LLC", period_start: "2024-06-01",
      period_end: "2029-05-31", amount_cents: 837400, currency_code: "USD" }] }],
    unmatched_documents: [], unmatched_financial_observations: [] },
});

let passed = 0;
let failed = 0;
const failures = [];
function ok(label, condition) {
  if (condition) passed += 1;
  else { failed += 1; failures.push(label); }
}

ok("the first view is the working door, not a landing page",
  /data-am-compartment-open="contracted_services"/.test(source)
  && /data-cs-section="register"/.test(source));
ok("Contracted Services is an enabled Property Expenses compartment",
  /COMPARTMENT_SURFACES\s*=\s*\{[^}]*contracted_services:\s*true/.test(shell));
ok("the shell loads and delegates the governed Contracted Services resource",
  /assetManagementContractedServices\(\{\}\)/.test(shell)
  && /__psContractedServicesDoor\.render\(state\.compartmentData\)/.test(shell));
ok("the domain door loads before the Asset Management shell",
  index.indexOf('<script src="contracted-services-door.js">')
    < index.indexOf('<script src="asset-management-door.js">'));
ok("the read and write routes are fixed under the operator namespace",
  /'\/operator\/asset-management\/contracted-services'/.test(index)
  && /'\/operator\/asset-management\/contracted-services\/evidence'/.test(index)
  && /'\/operator\/asset-management\/contracted-services\/confirm'/.test(index)
  && /'\/operator\/asset-management\/contracted-services\/coverage-reviews'/.test(index));
ok("the browser bridge sends no property or actor authority",
  !/assetManagementContractedService(?:Evidence|Confirm|CoverageReview)[\s\S]{0,1000}\bproperty_id\b/.test(index)
  && !/assetManagementContractedService(?:Evidence|Confirm|CoverageReview)[\s\S]{0,1000}\buser_id\b/.test(index));
ok("Ask Spine recognizes the minted Contracted Services evidence kind",
  /kind === 'contracted_service_evidence'/.test(index)
  && /assetManagementContractedServiceEvidenceOpen/.test(index));
ok("the hierarchy is decision queue, service register, then financial observations",
  rendered.indexOf('data-cs-section="attention"') < rendered.indexOf('data-cs-section="register"')
  && rendered.indexOf('data-cs-section="register"') < rendered.indexOf('data-cs-section="financial-observations"'));
ok("empty truth asks for one real service without rendering a category census",
  /Start with one real service/.test(source)
  && /Add first service/.test(source)
  && !/SERVICE_CHOICES\.map\(serviceRow/.test(source));
ok("service details remain collapsed until requested", /<details class="cs-service"/.test(source));
ok("the door does not invent completion percentages",
  !/progressbar|completion percentage|percent complete|completionPercent|setupPercent/.test(source));

ok("evidence is retained before the canonical confirmation",
  source.indexOf("assetManagementContractedServiceEvidence({")
    < source.indexOf("assetManagementContractedServiceConfirm(body)"));
ok("the evidence picker offers only the PDF shape accepted by its document types",
  /type="file" accept="\.pdf"/.test(source)
  && !/type="file"[^>]*accept="[^"]*(?:doc|txt|image)/.test(source));
ok("recognized document facts remain human-confirmed proposals",
  /Spine proposed the fields below\. Check them against the complete document/.test(source)
  && /execution_state/.test(source));
ok("governing authority is blocked without an executed eligible document",
  /Governing terms require a complete executed agreement/.test(source));
ok("a fixed term accepts dates or a complete event anchor",
  /A fixed term needs calendar dates or a commencement trigger and initial duration/.test(source)
  && /An event-anchored term needs both its commencement trigger and initial duration/.test(source));
ok("automatic renewal requires its stated period",
  /Record the stated renewal period for an automatic renewal clause/.test(source)
  && /Term and renewal durations must be positive month counts/.test(source));
ok("retaining a document without term facts does not create an empty term",
  /var hasTermFact/.test(source) && /if \(hasTermFact\) \{\s*body\.term/.test(source));
ok("variable pricing cannot silently become zero",
  /Describe the variable or range pricing/.test(source)
  && /amount_cents: amountCents/.test(source));

ok("contract price and financial observations render in separate sections",
  /Scope and price/.test(source) && /Unmatched financial observations/.test(source));
ok("linked financial observations remain visible but separate from contract price",
  /Elevator Contract - June 2026/.test(rendered)
  && /Accounting evidence, not contract price or payment/.test(rendered));
ok("unmatched retained evidence prevents a false empty door",
  /Service evidence found; governing engagements are not established/.test(evidenceOnly)
  && /4125 Chestnut - Otis - unexecuted\.pdf/.test(evidenceOnly)
  && !/Start with one real service/.test(evidenceOnly));
ok("event-anchored executed terms ask for dates without claiming expiry",
  /Term dates need confirmation/.test(eventDated)
  && /Installation and activation of the Amazon Hub \| 60-month initial term/.test(eventDated)
  && /\$7,900\.00 flat/.test(eventDated)
  && /\$8,374\.00/.test(eventDated));
ok("payment and completed work remain explicitly unestablished",
  /Payment and completed work are not established here/.test(source));
ok("coverage review does not invent a required-service list",
  /This does not invent required services/.test(source));
ok("in-house and not-applicable service truth refuses contractor evidence",
  /An in-house or not-applicable service cannot carry a contractor or service document/.test(source));
ok("the door sends no client-selected property or actor authority",
  !/\bproperty_id\b|\buser_id\b/.test(source));
ok("the door creates no tasks or payment records",
  !/createTask|task_id|obligation_id|recordPayment|paid_at|paid_cents/i.test(source));
ok("the door carries no fixture or demo truth",
  !/fixture|demoData|sampleData|mockData/.test(source));
ok("retained evidence has a domain-specific opener",
  /assetManagementContractedServiceEvidenceOpen/.test(source));
ok("mobile layouts collapse without overlapping text",
  /@media\(max-width:500px\)/.test(source)
  && /grid-template-columns:1fr/.test(source)
  && /text-overflow:ellipsis/.test(source));

console.log("\nCONTRACTED SERVICES DOOR\n");
console.log("  assertions passed: " + passed);
console.log("  assertions failed: " + failed);
failures.forEach((label) => console.log("   x " + label));
process.exit(failed ? 1 : 0);
