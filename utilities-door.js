"use strict";

(function () {
  if (window.__psUtilitiesDoor) return;

  var state = { data: null, mode: null, busy: false, error: null, receipt: null,
                artifact: null, proposal: null, serviceClass: null };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function ensureStyle() {
    if (document.getElementById("ps-utilities-style")) return;
    var style = document.createElement("style");
    style.id = "ps-utilities-style";
    style.textContent = [
      ".ut-shell{max-width:1180px;margin:0 auto;padding:0 0 46px;color:var(--ink,#17211f)}",
      ".ut-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:22px 0 28px}",
      ".ut-title h2{margin:0 0 7px;font-size:30px;line-height:1.05;letter-spacing:0}",
      ".ut-title p{margin:0;color:var(--muted,#68726f);font-size:14px}",
      ".ut-actions{display:flex;gap:8px;flex-wrap:wrap}",
      ".ut-btn{min-height:38px;border:1px solid #c9d1ce;border-radius:6px;background:#fff;color:#17211f;padding:8px 13px;font:600 13px/1.2 inherit;cursor:pointer}",
      ".ut-btn:hover{border-color:#73817c;background:#f7f9f8}",
      ".ut-btn.is-primary{background:#173f38;border-color:#173f38;color:#fff}",
      ".ut-btn.is-quiet{min-height:30px;padding:5px 9px;font-size:12px}",
      ".ut-section{margin-top:30px;border-top:1px solid #dfe4e2;padding-top:18px}",
      ".ut-section-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:10px}",
      ".ut-section h3{margin:0;font-size:15px;letter-spacing:0;text-transform:none}",
      ".ut-section-note{font-size:12px;color:var(--muted,#68726f)}",
      ".ut-service-list{border-bottom:1px solid #dfe4e2}",
      ".ut-service{display:grid;grid-template-columns:minmax(150px,1.1fr) minmax(180px,1.35fr) minmax(190px,1.5fr) minmax(150px,1fr);gap:18px;padding:17px 0;border-top:1px solid #dfe4e2;align-items:start}",
      ".ut-service h4{margin:0 0 5px;font-size:16px;letter-spacing:0}",
      ".ut-kicker{font:600 10px/1.2 'IBM Plex Mono',monospace;text-transform:uppercase;color:#6b7471;margin-bottom:5px}",
      ".ut-value{font-size:13px;line-height:1.45;color:#27312e}",
      ".ut-muted{color:#7a8380}",
      ".ut-state{display:inline-flex;align-items:center;min-height:24px;border-radius:4px;padding:3px 7px;background:#edf5f2;color:#245f52;font:600 10px/1.2 'IBM Plex Mono',monospace;text-transform:uppercase}",
      ".ut-state.is-unknown{background:#f3f0e8;color:#765f24}",
      ".ut-state.is-na{background:#eef0ef;color:#65706d}",
      ".ut-account-group{padding:12px 0 4px}",
      ".ut-account-group>h4{margin:0 0 7px;font-size:13px}",
      ".ut-account{display:grid;grid-template-columns:minmax(150px,1fr) minmax(190px,1.4fr) minmax(170px,1.2fr) auto;gap:16px;align-items:center;padding:13px 0;border-top:1px solid #e8ecea}",
      ".ut-account-number{font:600 13px/1.2 'IBM Plex Mono',monospace}",
      ".ut-account p{margin:2px 0;font-size:12px;color:#59635f;line-height:1.4}",
      ".ut-gap-list{list-style:none;margin:0;padding:0;border-bottom:1px solid #dfe4e2}",
      ".ut-gap{display:grid;grid-template-columns:9px minmax(0,1fr) auto;gap:12px;align-items:start;padding:13px 0;border-top:1px solid #dfe4e2}",
      ".ut-gap-dot{width:7px;height:7px;border-radius:50%;background:#b48925;margin-top:6px}",
      ".ut-gap b{display:block;font-size:13px;margin-bottom:3px}",
      ".ut-gap p{margin:0;font-size:12px;color:#68726f;line-height:1.4}",
      ".ut-quiet{padding:18px 0;color:#52605b;font-size:13px}",
      ".ut-receipt,.ut-error{margin:14px 0;padding:11px 13px;border-left:3px solid #2b7564;background:#edf5f2;font-size:13px}",
      ".ut-error{border-left-color:#ad4b45;background:#fbf0ef;color:#7c312d}",
      ".ut-sheet-backdrop{position:fixed;inset:0;z-index:1100;background:rgba(15,24,21,.38);display:flex;justify-content:flex-end}",
      ".ut-sheet{width:min(680px,100%);height:100%;overflow:auto;background:#fff;padding:24px 28px 38px;box-shadow:-8px 0 30px rgba(15,24,21,.12)}",
      ".ut-sheet-head{display:flex;justify-content:space-between;align-items:start;gap:16px;padding-bottom:16px;border-bottom:1px solid #dfe4e2}",
      ".ut-sheet-head h3{margin:0 0 5px;font-size:20px;letter-spacing:0}",
      ".ut-sheet-head p{margin:0;font-size:12px;color:#68726f}",
      ".ut-close{border:0;background:transparent;font-size:24px;line-height:1;cursor:pointer;color:#59635f;padding:1px 5px}",
      ".ut-form-section{padding:18px 0;border-bottom:1px solid #e4e8e6}",
      ".ut-form-section h4{margin:0 0 12px;font-size:13px;letter-spacing:0}",
      ".ut-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}",
      ".ut-field{display:flex;flex-direction:column;gap:5px;min-width:0}",
      ".ut-field.is-wide{grid-column:1/-1}",
      ".ut-field label{font-size:11px;font-weight:600;color:#53605c}",
      ".ut-field input,.ut-field select,.ut-field textarea{width:100%;min-height:38px;border:1px solid #cbd3d0;border-radius:5px;background:#fff;color:#17211f;padding:8px 9px;font:13px/1.3 inherit;box-sizing:border-box}",
      ".ut-field textarea{min-height:68px;resize:vertical}",
      ".ut-sheet-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:18px}",
      ".ut-proposal{margin:14px 0 0;padding:10px 12px;background:#f5f7f6;border-left:3px solid #72827c;font-size:12px;color:#56615d}",
      "@media(max-width:760px){.ut-head{align-items:flex-start;flex-direction:column}.ut-service{grid-template-columns:1fr 1fr}.ut-account{grid-template-columns:1fr 1fr}.ut-sheet{padding:20px 18px}.ut-form-grid{grid-template-columns:1fr}.ut-field.is-wide{grid-column:auto}}",
      "@media(max-width:470px){.ut-service,.ut-account{grid-template-columns:1fr}.ut-actions{width:100%}.ut-actions .ut-btn{flex:1}.ut-title h2{font-size:26px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function formatMoney(cents, currency) {
    if (!Number.isSafeInteger(cents)) return "Amount not established";
    var amount = (cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
    return (currency === "USD" ? "$" : (currency ? currency + " " : "")) + amount;
  }

  function words(value) {
    if (value === "rubs_allocation") return "RUBS allocation";
    return String(value || "").replace(/_/g, " ").replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  function partyPhrase(value, action, unknown) {
    if (!value) return unknown;
    if (value === "not_applicable") return "Not applicable";
    return words(value) + " " + action;
  }

  function serviceByClass(key) {
    return (((state.data || {}).detail || {}).services || []).filter(function (service) {
      return service.service_class === key;
    })[0] || null;
  }

  function evidenceButton(evidence, label) {
    var id = evidence && evidence.source_artifact_id;
    if (!id) return "";
    return '<button class="ut-btn is-quiet" type="button" title="Open retained evidence"'
      + ' onclick="psUtilityOpenEvidence(\'' + esc(id) + '\')">' + esc(label || "Evidence") + '</button>';
  }

  function serviceRow(service) {
    var applicability = service.applicability || {};
    var unknown = applicability.truth_state === "NOT_ESTABLISHED";
    var notApplicable = applicability.value === "not_applicable";
    var providers = (service.providers || []).map(function (provider) { return provider.name; });
    var arrangement = service.arrangement || {};
    var latest = service.latest_statement;
    var statement = latest
      ? formatMoney(latest.current_amount_due_cents, latest.currency_code)
        + (latest.due_date ? " due " + latest.due_date : "")
      : "No provider statement established";
    return '<div class="ut-service" data-ut-service="' + esc(service.service_class) + '">'
      + '<div><h4>' + esc(service.label) + '</h4>'
      + (unknown
          ? '<span class="ut-state is-unknown">Not established</span>'
          : notApplicable
            ? '<span class="ut-state is-na">Not applicable</span>'
            : '<span class="ut-state">Present</span>') + '</div>'
      + '<div><div class="ut-kicker">Provider and responsibility</div>'
      + '<div class="ut-value">' + esc(notApplicable ? "Not applicable"
          : providers.length ? providers.join(", ") : "Provider not established") + '</div>'
      + '<div class="ut-value ut-muted">'
      + esc(notApplicable ? "Not applicable" : partyPhrase(arrangement.provider_bill_recipient,
          "receives the provider bill", "Provider bill recipient not established")) + '</div>'
      + '<div class="ut-value ut-muted">'
      + esc(notApplicable ? "Not applicable" : partyPhrase(arrangement.provider_responsible_party,
          "responsible to provider", "Provider responsibility not established")) + '</div></div>'
      + '<div><div class="ut-kicker">Building arrangement</div>'
      + '<div class="ut-value">' + esc(notApplicable ? "Not applicable" : arrangement.physical_arrangement
          ? words(arrangement.physical_arrangement) : "Physical arrangement not established") + '</div>'
      + '<div class="ut-value ut-muted">'
      + esc(notApplicable ? "Not applicable" : (service.accounts || []).length
          ? (service.accounts || []).length + " mapped provider account" + ((service.accounts || []).length === 1 ? "" : "s")
          : "Provider account map not established")
      + (notApplicable ? '' : ' &middot; ' + esc((service.service_points || []).length
          ? (service.service_points || []).length + " service point" + ((service.service_points || []).length === 1 ? "" : "s")
          : "Service point map not established")) + '</div></div>'
      + '<div><div class="ut-kicker">Economics, recovery, and latest bill</div>'
      + '<div class="ut-value">' + esc(notApplicable ? "Not applicable"
          : partyPhrase(arrangement.economic_responsibility,
            "economic responsibility", "Economic responsibility not established")) + '</div>'
      + '<div class="ut-value ut-muted">' + esc(notApplicable ? "Not applicable" : arrangement.resident_recovery_method
          ? words(arrangement.resident_recovery_method) : "Resident recovery not established") + '</div>'
      + (notApplicable ? '' : arrangement.billing_administrator_name
          ? '<div class="ut-value ut-muted">Administered by ' + esc(arrangement.billing_administrator_name) + '</div>' : '')
      + '<div class="ut-value ut-muted">' + esc(notApplicable ? "Not applicable"
          : partyPhrase(arrangement.resident_payment_recipient,
            "receives resident payments", "Resident payment recipient not established")) + '</div>'
      + '<div class="ut-value ut-muted">' + esc(notApplicable ? "Not applicable" : statement) + '</div></div>'
      + '</div>';
  }

  function accountRows(service) {
    var accounts = service.accounts || [];
    if (!accounts.length) return "";
    return '<div class="ut-account-group" data-ut-account-group="' + esc(service.service_class) + '">'
      + '<h4>' + esc(service.label) + '</h4>'
      + accounts.map(function (account) {
        var serves = (account.serves || []).map(function (point) { return point.label || words(point.kind); });
        var meters = (account.meters || []).map(function (meter) {
          return meter.identifier_masked + " " + words(meter.kind);
        });
        var statement = account.latest_statement;
        return '<div class="ut-account" data-ut-account="' + esc(account.id) + '">'
          + '<div><div class="ut-account-number">' + esc(account.account_identifier_masked) + '</div>'
          + '<p>' + esc(account.provider || "Provider not established") + '</p></div>'
          + '<div><div class="ut-kicker">Serves</div><p>'
          + esc(serves.length ? serves.join(", ") : "Service point assignment not established") + '</p></div>'
          + '<div><div class="ut-kicker">Meter and latest statement</div><p>'
          + esc(meters.length ? meters.join(", ") : "Meter assignment not established") + '</p><p>'
          + esc(statement
              ? statement.bill_date + " / " + formatMoney(statement.amount_billed_cents, statement.currency_code)
              : "No statement established") + '</p></div>'
          + '<div>' + evidenceButton((statement && statement.evidence) || account.evidence, "Open") + '</div>'
          + '</div>';
      }).join("") + '</div>';
  }

  function gapRows(gaps) {
    if (!gaps.length) return '<div class="ut-quiet">No Utility setup questions are open.</div>';
    return '<ul class="ut-gap-list">' + gaps.map(function (gap) {
      var service = serviceByClass(gap.service);
      return '<li class="ut-gap"><span class="ut-gap-dot" aria-hidden="true"></span><div>'
        + '<b>' + esc(gap.question) + '</b><p>' + esc(gap.reason || "This fact is not established.") + '</p></div>'
        + '<button class="ut-btn is-quiet" type="button" onclick="psUtilitiesStartSetup(\''
        + esc(gap.service) + '\')">Establish</button></li>';
    }).join("") + '</ul>';
  }

  function option(value, label, selected) {
    return '<option value="' + esc(value) + '"' + (selected ? ' selected' : '') + '>'
      + esc(label) + '</option>';
  }

  function field(name, label, control, wide) {
    return '<div class="ut-field' + (wide ? ' is-wide' : '') + '"><label for="' + esc(name) + '">'
      + esc(label) + '</label>' + control + '</div>';
  }

  function input(name, type, value, placeholder) {
    return '<input id="' + esc(name) + '" data-ut-input="' + esc(name) + '" type="' + esc(type || "text")
      + '" value="' + esc(value === null || value === undefined ? "" : value) + '"'
      + (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + '>';
  }

  function select(name, choices, selected) {
    return '<select id="' + esc(name) + '" data-ut-input="' + esc(name) + '">'
      + choices.map(function (choice) { return option(choice[0], choice[1], choice[0] === selected); }).join("")
      + '</select>';
  }

  function setupSheet() {
    var services = (((state.data || {}).detail || {}).services || []);
    var selected = serviceByClass(state.serviceClass) || services[0] || {};
    var current = selected.applicability || {};
    var providers = [];
    services.forEach(function (service) {
      (service.providers || []).forEach(function (provider) {
        if (!providers.some(function (item) { return item.id === provider.id; })) providers.push(provider);
      });
    });
    var applicability = current.truth_state === "NOT_ESTABLISHED" ? "" : "unchanged";
    var today = new Date().toISOString().slice(0, 10);
    return '<div class="ut-sheet-backdrop" onclick="if(event.target===this)psUtilitiesClose()">'
      + '<section class="ut-sheet" role="dialog" aria-modal="true" aria-labelledby="utSetupTitle">'
      + '<div class="ut-sheet-head"><div><h3 id="utSetupTitle">Establish Utility setup</h3>'
      + '<p>Provider, responsibility, account, and meter facts</p></div>'
      + '<button class="ut-close" type="button" title="Close" onclick="psUtilitiesClose()">&times;</button></div>'
      + (state.error ? '<div class="ut-error">' + esc(state.error) + '</div>' : '')
      + '<div class="ut-form-section"><h4>Service</h4><div class="ut-form-grid">'
      + field("ut_service", "Utility service", select("ut_service", services.map(function (service) {
          return [service.service_class, service.label];
        }), selected.service_class))
      + field("ut_applicability", "Applicability", select("ut_applicability", [
          ["", "Choose"], ["unchanged", "Keep current applicability"],
          ["present", "Present"], ["not_applicable", "Not applicable"],
        ], applicability))
      + field("ut_effective", "Effective from", input("ut_effective", "date", today))
      + field("ut_provider_existing", "Known provider", select("ut_provider_existing",
          [["", "None selected"]].concat(providers.map(function (provider) {
            return [provider.id, provider.name];
          })), ""))
      + field("ut_provider_name", "New provider name", input("ut_provider_name", "text", "", "Provider name"))
      + field("ut_provenance", "Confirmation basis", '<textarea id="ut_provenance" data-ut-input="ut_provenance" placeholder="Who confirmed this, and from what source?"></textarea>', true)
      + '</div></div>'
      + '<div class="ut-form-section"><h4>Responsibility and resident billing</h4><div class="ut-form-grid">'
      + field("ut_topology", "Physical arrangement", select("ut_topology", [
          ["", "Not being established"], ["whole_building_master_meter", "Whole-building master meter"],
          ["common_house_meter", "Common / house meter"], ["individual_provider_meters", "Individual provider meters"],
          ["internal_submeters", "Internal submeters"], ["shared_plant", "Shared plant"],
          ["non_metered", "Non-metered"], ["mixed", "Mixed"], ["unknown", "Established as unknown"],
        ], ""))
      + field("ut_bill_recipient", "Provider bill recipient", select("ut_bill_recipient", [
          ["", "Not being established"], ["property", "Property"], ["resident", "Resident"],
          ["billing_administrator", "Billing administrator"], ["other_third_party", "Other third party"], ["mixed", "Mixed"],
        ], ""))
      + field("ut_provider_responsible", "Responsible to provider", select("ut_provider_responsible", [
          ["", "Not being established"], ["property", "Property"], ["resident", "Resident"],
          ["other_third_party", "Other third party"], ["mixed", "Mixed"],
        ], ""))
      + field("ut_economic", "Economic responsibility", select("ut_economic", [
          ["", "Not being established"], ["property", "Property"], ["resident", "Resident"],
          ["shared", "Shared"], ["mixed", "Mixed"],
        ], ""))
      + field("ut_recovery", "Resident recovery", select("ut_recovery", [
          ["", "Not being established"], ["none_property_absorbs", "Property absorbs"],
          ["included_in_rent", "Included in rent"], ["resident_direct_to_provider", "Resident pays provider directly"],
          ["fixed_fee", "Fixed fee"], ["rubs_allocation", "RUBS allocation"],
          ["actual_submeter_usage", "Actual submeter usage"], ["passthrough", "Pass-through"],
          ["mixed", "Mixed"], ["other", "Other"],
        ], ""))
      + field("ut_payment_recipient", "Resident payment recipient", select("ut_payment_recipient", [
          ["", "Not being established"], ["property", "Property"], ["provider", "Provider"],
          ["billing_administrator", "Billing administrator"], ["other_third_party", "Other third party"],
          ["mixed", "Mixed"], ["not_applicable", "Not applicable"],
        ], ""))
      + field("ut_billing_admin", "Billing administrator", input("ut_billing_admin", "text", "", "Name"))
      + '</div></div>'
      + '<div class="ut-form-section"><h4>Account, service point, and meter</h4><div class="ut-form-grid">'
      + field("ut_account", "Provider account number", input("ut_account", "text", "", "As issued"))
      + field("ut_service_address", "Service address", input("ut_service_address", "text", "", "Address on account"))
      + field("ut_point_kind", "Service point kind", select("ut_point_kind", [
          ["", "Not being established"], ["whole_building", "Whole building"], ["common_area", "Common area"],
          ["shared_equipment", "Shared equipment"],
          ["service_address", "Service address"], ["other", "Other"], ["unknown", "Unknown"],
        ], ""))
      + field("ut_point_label", "Service point label", input("ut_point_label", "text", "", "Common areas, Unit 506, boiler plant"))
      + field("ut_meter_kind", "Meter kind", select("ut_meter_kind", [
          ["", "Not being established"], ["provider_meter", "Provider meter"], ["internal_submeter", "Internal submeter"],
        ], ""))
      + field("ut_meter", "Meter identifier", input("ut_meter", "text", "", "As shown on statement or schedule"))
      + '</div></div>'
      + '<div class="ut-sheet-actions"><button class="ut-btn" type="button" onclick="psUtilitiesClose()">Cancel</button>'
      + '<button class="ut-btn is-primary" type="button" onclick="psUtilitiesConfirmSetup()"'
      + (state.busy ? ' disabled' : '') + '>' + (state.busy ? "Recording..." : "Record setup") + '</button></div>'
      + '</section></div>';
  }

  function proposalValue(key) {
    var fields = (state.proposal && state.proposal.fields) || {};
    var value = fields[key];
    if (value && typeof value === "object") return "";
    return value || "";
  }

  function statementSheet() {
    if (!state.artifact) {
      return '<div class="ut-sheet-backdrop" onclick="if(event.target===this)psUtilitiesClose()">'
        + '<section class="ut-sheet" role="dialog" aria-modal="true" aria-labelledby="utBillTitle">'
        + '<div class="ut-sheet-head"><div><h3 id="utBillTitle">Add Utility statement</h3>'
        + '<p>Provider statement evidence</p></div>'
        + '<button class="ut-close" type="button" title="Close" onclick="psUtilitiesClose()">&times;</button></div>'
        + (state.error ? '<div class="ut-error">' + esc(state.error) + '</div>' : '')
        + '<div class="ut-form-section"><div class="ut-form-grid">'
        + field("ut_bill_file", "Provider statement", '<input id="ut_bill_file" data-ut-input="ut_bill_file" type="file" accept="application/pdf,.pdf">', true)
        + '</div></div><div class="ut-sheet-actions"><button class="ut-btn" type="button" onclick="psUtilitiesClose()">Cancel</button>'
        + '<button class="ut-btn is-primary" type="button" onclick="psUtilitiesUploadStatement()"'
        + (state.busy ? ' disabled' : '') + '>' + (state.busy ? "Retaining..." : "Retain and read") + '</button></div>'
        + '</section></div>';
    }

    var detail = (state.data || {}).detail || {};
    var accounts = detail.accounts || [];
    var services = (detail.services || []).filter(function (service) {
      return service.applicability && service.applicability.value === "present";
    });
    var meters = detail.meters || [];
    var usage = ((state.proposal || {}).fields || {}).usage || {};
    return '<div class="ut-sheet-backdrop" onclick="if(event.target===this)psUtilitiesClose()">'
      + '<section class="ut-sheet" role="dialog" aria-modal="true" aria-labelledby="utBillTitle">'
      + '<div class="ut-sheet-head"><div><h3 id="utBillTitle">Confirm Utility statement</h3>'
      + '<p>' + esc(state.artifact.filename || "Statement retained") + '</p></div>'
      + '<button class="ut-close" type="button" title="Close" onclick="psUtilitiesClose()">&times;</button></div>'
      + (state.error ? '<div class="ut-error">' + esc(state.error) + '</div>' : '')
      + '<div class="ut-proposal">' + esc((state.proposal && state.proposal.reason)
          || "No fields were proposed. Confirm only what the retained statement states.") + '</div>'
      + '<div class="ut-form-section"><h4>Statement</h4><div class="ut-form-grid">'
      + field("ut_bill_account", "Provider account", select("ut_bill_account",
          [["", "Choose account"]].concat(accounts.map(function (account) {
            return [account.id, (account.account_identifier_masked || "Account") + " / " + (account.provider || "provider unknown")];
          })), ""))
      + field("ut_statement_id", "Statement number", input("ut_statement_id", "text", proposalValue("statement_identifier")))
      + field("ut_bill_date", "Bill date", input("ut_bill_date", "date", proposalValue("bill_date")))
      + field("ut_due_date", "Due date", input("ut_due_date", "date", proposalValue("due_date")))
      + field("ut_period_start", "Service period start", input("ut_period_start", "date", proposalValue("service_period_start")))
      + field("ut_period_end", "Service period end", input("ut_period_end", "date", proposalValue("service_period_end")))
      + field("ut_currency", "Currency", select("ut_currency", [["", "Choose"], ["USD", "USD"]], ""))
      + field("ut_amount_billed", "Amount billed", input("ut_amount_billed", "text", proposalValue("amount_billed"), "0.00"))
      + field("ut_current_due", "Current amount due", input("ut_current_due", "text", proposalValue("current_amount_due"), "0.00"))
      + field("ut_late_fee", "Late fee", input("ut_late_fee", "text", proposalValue("late_fee"), "0.00"))
      + '</div></div>'
      + '<div class="ut-form-section"><h4>Usage, when stated</h4><div class="ut-form-grid">'
      + field("ut_usage_service", "Service", select("ut_usage_service", [["", "No usage row"]].concat(services.map(function (service) {
          return [service.id, service.label];
        })), ""))
      + field("ut_usage_meter", "Meter", select("ut_usage_meter", [["", "No meter selected"]].concat(meters.map(function (meter) {
          return [meter.id, (meter.identifier_masked || "Meter") + " / " + words(meter.kind)];
        })), ""))
      + field("ut_usage_quantity", "Usage quantity", input("ut_usage_quantity", "text", usage.quantity || ""))
      + field("ut_usage_unit", "Usage unit", input("ut_usage_unit", "text", usage.usage_unit || "", "kWh, therms, gallons"))
      + field("ut_usage_basis", "Reading basis", select("ut_usage_basis", [
          ["", "Choose"], ["observed", "Observed / actual"], ["estimated", "Estimated"], ["stated_unknown", "Statement does not say"],
        ], proposalValue("usage_basis")))
      + '</div></div>'
      + '<div class="ut-sheet-actions"><button class="ut-btn" type="button" onclick="psUtilitiesClose()">Cancel</button>'
      + '<button class="ut-btn is-primary" type="button" onclick="psUtilitiesConfirmStatement()"'
      + (state.busy ? ' disabled' : '') + '>' + (state.busy ? "Recording..." : "Confirm statement") + '</button></div>'
      + '</section></div>';
  }

  function html(data) {
    state.data = data;
    ensureStyle();
    var standing = data.standing || {};
    var detail = data.detail || {};
    var gaps = (data.opening && data.opening.unresolved) || detail.unresolved || [];
    var serviceCount = standing.established_services || 0;
    var headline = serviceCount + " service" + (serviceCount === 1 ? "" : "s") + " established"
      + " &middot; " + gaps.length + " setup question" + (gaps.length === 1 ? "" : "s");
    return '<div class="am-room-view ut-shell" data-am-view="compartment" data-am-compartment-open="utilities">'
      + '<button class="am-back" type="button" onclick="amOpenRoom(\'property_expenses\')">&larr; Property Expenses</button>'
      + '<div class="ut-head"><div class="ut-title"><h2>Utilities</h2><p>' + headline + '</p></div>'
      + '<div class="ut-actions"><button class="ut-btn" type="button" onclick="psUtilitiesStartSetup()">Establish setup</button>'
      + '<button class="ut-btn is-primary" type="button" onclick="psUtilitiesStartStatement()">Add statement</button></div></div>'
      + (state.receipt ? '<div class="ut-receipt">' + esc(state.receipt) + '</div>' : '')
      + '<section class="ut-section" data-ut-section="service-map"><div class="ut-section-head"><h3>Service map</h3>'
      + '<span class="ut-section-note">Provider, responsibility, topology, and recovery</span></div>'
      + '<div class="ut-service-list">' + (detail.services || []).map(serviceRow).join("") + '</div></section>'
      + '<section class="ut-section" data-ut-section="accounts"><div class="ut-section-head"><h3>Accounts &amp; meters</h3>'
      + '<span class="ut-section-note">Organized by service</span></div>'
      + ((detail.services || []).map(accountRows).join("")
          || '<div class="ut-quiet">Provider account and meter relationships are not established yet.</div>') + '</section>'
      + '<section class="ut-section" data-ut-section="gaps"><div class="ut-section-head"><h3>Setup gaps</h3>'
      + '<span class="ut-section-note">Questions Spine cannot answer yet</span></div>' + gapRows(gaps) + '</section>'
      + (state.mode === "setup" ? setupSheet() : state.mode === "statement" ? statementSheet() : "")
      + '</div>';
  }

  function rerender() {
    var root = document.querySelector('[data-am-compartment-open="utilities"]');
    if (root && root.parentNode && state.data) root.parentNode.innerHTML = html(state.data);
  }

  function read(name) {
    var root = document.querySelector('[data-am-compartment-open="utilities"]');
    var inputElement = root && root.querySelector('[data-ut-input="' + name + '"]');
    return inputElement ? String(inputElement.value || "").trim() : "";
  }

  function amountCents(value, required) {
    var text = String(value || "").replace(/[$,\s]/g, "");
    if (!text) return required ? NaN : null;
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return NaN;
    return Math.round(Number(text) * 100);
  }

  function startSetup(serviceClass) {
    state.mode = "setup"; state.serviceClass = serviceClass || null;
    state.error = null; state.receipt = null; state.artifact = null; state.proposal = null;
    rerender();
  }

  function startStatement() {
    state.mode = "statement"; state.error = null; state.receipt = null;
    state.artifact = null; state.proposal = null; rerender();
  }

  function close() {
    state.mode = null; state.error = null; state.busy = false;
    state.artifact = null; state.proposal = null; rerender();
  }

  async function confirmSetup() {
    if (state.busy) return;
    var serviceClass = read("ut_service");
    var existing = serviceByClass(serviceClass) || {};
    var applicability = read("ut_applicability");
    if (!serviceClass || !read("ut_effective")) {
      state.error = "Choose the service and effective date."; rerender(); return;
    }
    if (existing.applicability && existing.applicability.truth_state === "NOT_ESTABLISHED"
        && (!applicability || applicability === "unchanged")) {
      state.error = "Establish this service as present or not applicable."; rerender(); return;
    }
    if (!read("ut_provenance")) {
      state.error = "State who confirmed this setup and what they used."; rerender(); return;
    }

    var body = {
      service_class: serviceClass,
      effective_from: read("ut_effective"),
      provenance_note: read("ut_provenance"),
    };
    if (applicability && applicability !== "unchanged") body.applicability = applicability;
    if (applicability !== "not_applicable") {
      if (read("ut_provider_name")) body.provider = { provider_name: read("ut_provider_name") };
      else if (read("ut_provider_existing")) body.provider_id = read("ut_provider_existing");

      var arrangement = {
        physical_arrangement: read("ut_topology") || null,
        provider_bill_recipient: read("ut_bill_recipient") || null,
        provider_responsible_party: read("ut_provider_responsible") || null,
        economic_responsibility: read("ut_economic") || null,
        resident_recovery_method: read("ut_recovery") || null,
        resident_payment_recipient: read("ut_payment_recipient") || null,
        billing_administrator_name: read("ut_billing_admin") || null,
      };
      if (Object.keys(arrangement).some(function (key) { return arrangement[key] !== null; })) body.arrangement = arrangement;

      if (read("ut_account")) {
        body.account = { external_account_identifier: read("ut_account"),
          service_address: read("ut_service_address") || null };
      }
      if (read("ut_point_kind")) {
        body.service_point = { point_kind: read("ut_point_kind"),
          location_label: read("ut_point_label") || null,
          service_address: read("ut_service_address") || null };
      }
      if (read("ut_meter") || read("ut_meter_kind")) {
        if (!read("ut_meter") || !read("ut_meter_kind")) {
          state.error = "A meter needs both its kind and identifier."; rerender(); return;
        }
        body.meter = { meter_kind: read("ut_meter_kind"), meter_identifier: read("ut_meter") };
      }
      if (body.account && !(body.provider || body.provider_id)) {
        state.error = "Select or name the provider before recording its account."; rerender(); return;
      }
      if (body.meter && body.meter.meter_kind === "provider_meter" && !(body.provider || body.provider_id)) {
        state.error = "Select or name the provider for a provider meter."; rerender(); return;
      }
    }

    state.busy = true; state.error = null; rerender();
    try {
      var response = await window.__psLive.assetManagementUtilitySetup(body);
      var result = (response && response.data) || response || {};
      state.mode = null; state.busy = false; state.receipt = result.receipt || "Utility setup recorded.";
      window.amOpenCompartment("utilities");
    } catch (error) {
      state.busy = false;
      state.error = (error && error.body && error.body.receipt) || (error && error.message)
        || "Utility setup was not recorded.";
      rerender();
    }
  }

  async function uploadStatement() {
    if (state.busy) return;
    var root = document.querySelector('[data-am-compartment-open="utilities"]');
    var inputElement = root && root.querySelector('[data-ut-input="ut_bill_file"]');
    var file = inputElement && inputElement.files && inputElement.files[0];
    if (!file) { state.error = "Choose the provider statement PDF."; rerender(); return; }
    state.busy = true; state.error = null;
    try {
      var response = await window.__psLive.assetManagementUtilityEvidence({
        file: file, artifact_kind: "utility_statement",
      });
      var result = (response && response.data) || response || {};
      state.artifact = result.artifact || { filename: file.name };
      state.proposal = result.proposal || null;
      state.busy = false; rerender();
    } catch (error) {
      state.busy = false;
      state.error = (error && error.body && error.body.receipt) || (error && error.message)
        || "The statement was not retained.";
      rerender();
    }
  }

  async function confirmStatement() {
    if (state.busy) return;
    var billed = amountCents(read("ut_amount_billed"), true);
    var due = amountCents(read("ut_current_due"), false);
    var late = amountCents(read("ut_late_fee"), false);
    if (!read("ut_bill_account") || !read("ut_bill_date") || !read("ut_period_start")
        || !read("ut_period_end") || !read("ut_currency")) {
      state.error = "Choose the account, dates, and currency stated on the statement."; rerender(); return;
    }
    if (Number.isNaN(billed) || Number.isNaN(due) || Number.isNaN(late)) {
      state.error = "Enter statement amounts as dollars and cents, such as 18442.17."; rerender(); return;
    }
    var body = {
      account_id: read("ut_bill_account"),
      statement_identifier: read("ut_statement_id") || null,
      bill_date: read("ut_bill_date"),
      service_period_start: read("ut_period_start"),
      service_period_end: read("ut_period_end"),
      due_date: read("ut_due_date") || null,
      currency_code: read("ut_currency"),
      amount_billed_cents: billed,
      current_amount_due_cents: due,
      late_fee_cents: late,
      source_artifact_id: state.artifact && state.artifact.id,
      usage: [],
    };
    if (read("ut_usage_service") || read("ut_usage_quantity") || read("ut_usage_unit")) {
      var quantity = Number(String(read("ut_usage_quantity")).replace(/,/g, ""));
      if (!read("ut_usage_service") || !read("ut_usage_unit") || !read("ut_usage_basis")
          || !Number.isFinite(quantity) || quantity < 0) {
        state.error = "Usage needs a service, non-negative quantity, unit, and reading basis."; rerender(); return;
      }
      body.usage.push({
        service_id: read("ut_usage_service"),
        meter_id: read("ut_usage_meter") || null,
        quantity: quantity,
        usage_unit: read("ut_usage_unit"),
        usage_basis: read("ut_usage_basis"),
      });
    }

    state.busy = true; state.error = null; rerender();
    try {
      var response = await window.__psLive.assetManagementUtilityStatement(body);
      var result = (response && response.data) || response || {};
      state.mode = null; state.busy = false;
      state.receipt = (result.receipt || "Utility statement recorded.")
        + " Provider payment remains not established.";
      window.amOpenCompartment("utilities");
    } catch (error) {
      state.busy = false;
      state.error = (error && error.body && error.body.receipt) || (error && error.message)
        || "The statement was not recorded.";
      rerender();
    }
  }

  function openEvidence(id) {
    if (window.__psLive && typeof window.__psLive.assetManagementUtilityEvidenceOpen === "function") {
      window.__psLive.assetManagementUtilityEvidenceOpen({ artifactId: id }).catch(function (error) {
        state.error = (error && error.message) || "The retained evidence could not be opened.";
        rerender();
      });
    }
  }

  window.psUtilitiesStartSetup = startSetup;
  window.psUtilitiesStartStatement = startStatement;
  window.psUtilitiesClose = close;
  window.psUtilitiesConfirmSetup = confirmSetup;
  window.psUtilitiesUploadStatement = uploadStatement;
  window.psUtilitiesConfirmStatement = confirmStatement;
  window.psUtilityOpenEvidence = openEvidence;
  window.__psUtilitiesDoor = { render: html, startSetup: startSetup, startStatement: startStatement };
})();
