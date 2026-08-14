"use strict";

(function () {
  if (window.__psUtilitiesDoor) return;

  var state = { data: null, mode: null, busy: false, error: null, receipt: null,
                artifact: null, proposal: null, serviceClass: null,
                setupDraft: null, statementAccountId: null, statementDraft: null };

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
      ".ut-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:22px 0 22px}",
      ".ut-title h2{margin:0 0 7px;font-size:30px;line-height:1.05;letter-spacing:0}",
      ".ut-title p{margin:0;color:var(--muted,#68726f);font-size:14px}",
      ".ut-actions{display:flex;gap:8px;flex-wrap:wrap}",
      ".ut-btn{min-height:38px;border:1px solid #c9d1ce;border-radius:6px;background:#fff;color:#17211f;padding:8px 13px;font:600 13px/1.2 inherit;cursor:pointer}",
      ".ut-btn:hover{border-color:#73817c;background:#f7f9f8}",
      ".ut-btn.is-primary{background:#173f38;border-color:#173f38;color:#fff}",
      ".ut-btn.is-quiet{min-height:30px;padding:5px 9px;font-size:12px}",
      ".ut-btn:disabled{cursor:not-allowed;background:#f4f6f5;border-color:#e0e5e3;color:#99a19e}",
      ".ut-btn.is-primary:disabled{background:#dfe5e3;border-color:#dfe5e3;color:#7e8985}",
      ".ut-section{margin-top:24px;border-top:1px solid #dfe4e2;padding-top:16px}",
      ".ut-section-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:10px}",
      ".ut-section h3{margin:0;font-size:15px;letter-spacing:0;text-transform:none}",
      ".ut-section-note{font-size:12px;color:var(--muted,#68726f)}",
      ".ut-setup-list{display:grid;grid-template-columns:1fr 1fr;column-gap:28px;border-top:1px solid #e3e7e5}",
      ".ut-setup-item{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;min-height:48px;border-bottom:1px solid #e3e7e5}",
      ".ut-setup-name{min-width:0;font-size:13px;font-weight:600;color:#27312e}",
      ".ut-service-list{border-bottom:1px solid #dfe4e2}",
      ".ut-service{border-top:1px solid #dfe4e2}",
      ".ut-service>summary{display:grid;grid-template-columns:minmax(130px,.85fr) minmax(170px,1.25fr) minmax(180px,1.25fr) minmax(96px,auto) 18px;gap:18px;align-items:center;padding:14px 0;cursor:pointer;list-style:none}",
      ".ut-service>summary::-webkit-details-marker{display:none}",
      ".ut-service>summary:after{content:'+';font:500 18px/1 inherit;color:#60706a;text-align:right}",
      ".ut-service[open]>summary:after{content:'-'}",
      ".ut-service[open]>summary{border-bottom:1px solid #e8ecea}",
      ".ut-service-summary-copy{min-width:0}",
      ".ut-service-summary-copy .ut-value{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".ut-service-status{font-size:12px;color:#68726f;text-align:right;white-space:nowrap}",
      ".ut-service-status.is-attention{color:#8b3f38;font-weight:600}",
      ".ut-service-body{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;padding:16px 0 18px}",
      ".ut-service h4{margin:0 0 5px;font-size:16px;letter-spacing:0}",
      ".ut-kicker{font:600 10px/1.2 'IBM Plex Mono',monospace;text-transform:uppercase;color:#6b7471;margin-bottom:5px}",
      ".ut-value{font-size:13px;line-height:1.45;color:#27312e}",
      ".ut-muted{color:#7a8380}",
      ".ut-state{display:inline-flex;align-items:center;min-height:24px;border-radius:4px;padding:3px 7px;background:#edf5f2;color:#245f52;font:600 10px/1.2 'IBM Plex Mono',monospace;text-transform:uppercase}",
      ".ut-state.is-unknown{background:#f3f0e8;color:#765f24}",
      ".ut-state.is-attention{background:#fbefed;color:#8b3f38}",
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
      ".ut-disclosure{border-bottom:1px solid #e4e8e6}",
      ".ut-disclosure summary{cursor:pointer;padding:17px 0;font-size:13px;font-weight:600;list-style-position:inside}",
      ".ut-disclosure .ut-form-grid{padding:0 0 18px}",
      ".ut-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}",
      ".ut-field{display:flex;flex-direction:column;gap:5px;min-width:0}",
      ".ut-field.is-wide{grid-column:1/-1}",
      ".ut-field label{font-size:11px;font-weight:600;color:#53605c}",
      ".ut-field input,.ut-field select,.ut-field textarea{width:100%;min-height:38px;border:1px solid #cbd3d0;border-radius:5px;background:#fff;color:#17211f;padding:8px 9px;font:13px/1.3 inherit;box-sizing:border-box}",
      ".ut-field textarea{min-height:68px;resize:vertical}",
      ".ut-sheet-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:18px}",
      ".ut-proposal{margin:14px 0 0;padding:10px 12px;background:#f5f7f6;border-left:3px solid #72827c;font-size:12px;color:#56615d}",
      "@media(max-width:760px){.ut-head{align-items:flex-start;flex-direction:column}.ut-setup-list{grid-template-columns:1fr}.ut-service>summary{grid-template-columns:minmax(120px,1fr) minmax(150px,1fr) auto 18px}.ut-service>summary .ut-service-arrangement{display:none}.ut-service-body{grid-template-columns:1fr 1fr}.ut-account{grid-template-columns:1fr 1fr}.ut-sheet{padding:20px 18px}.ut-form-grid{grid-template-columns:1fr}.ut-field.is-wide{grid-column:auto}}",
      "@media(max-width:470px){.ut-service>summary{grid-template-columns:minmax(0,1fr) auto 18px;gap:10px}.ut-service>summary .ut-service-provider{display:none}.ut-service-body,.ut-account{grid-template-columns:1fr}.ut-actions{width:100%}.ut-actions .ut-btn{flex:1}.ut-title h2{font-size:26px}}"
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

  function serviceRow(service, gaps) {
    var applicability = service.applicability || {};
    var unknown = applicability.truth_state === "NOT_ESTABLISHED";
    var notApplicable = applicability.value === "not_applicable";
    var providers = (service.providers || []).map(function (provider) { return provider.name; });
    var arrangement = service.arrangement || {};
    var latest = service.latest_statement;
    var serviceGaps = (gaps || []).filter(function (gap) {
      return gap.service === service.service_class;
    });
    var statement = latest
      ? formatMoney(latest.current_amount_due_cents, latest.currency_code)
        + (latest.due_date ? " due " + latest.due_date : "")
      : "No provider statement established";
    return '<details class="ut-service" data-ut-service="' + esc(service.service_class) + '"'
      + (serviceGaps.length ? ' open' : '') + '><summary>'
      + '<div><h4>' + esc(service.label) + '</h4>'
      + (unknown
          ? '<span class="ut-state is-unknown">Not established</span>'
          : notApplicable
            ? '<span class="ut-state is-na">Not applicable</span>'
            : '<span class="ut-state">Present</span>') + '</div>'
      + '<div class="ut-service-summary-copy ut-service-provider"><div class="ut-kicker">Provider</div>'
      + '<div class="ut-value">' + esc(notApplicable ? "Not applicable"
          : providers.length ? providers.join(", ") : "Provider not established") + '</div></div>'
      + '<div class="ut-service-summary-copy ut-service-arrangement"><div class="ut-kicker">Service setup</div>'
      + '<div class="ut-value">' + esc(notApplicable ? "Not applicable" : arrangement.physical_arrangement
          ? words(arrangement.physical_arrangement) : "Arrangement not established") + '</div></div>'
      + '<div class="ut-service-status' + (serviceGaps.length ? ' is-attention' : '') + '">'
      + esc(serviceGaps.length
          ? serviceGaps.length + " question" + (serviceGaps.length === 1 ? "" : "s")
          : "Current") + '</div></summary>'
      + '<div class="ut-service-body"><div><div class="ut-kicker">Provider responsibility</div>'
      + '<div class="ut-value">'
      + esc(notApplicable ? "Not applicable" : partyPhrase(arrangement.provider_bill_recipient,
          "receives the provider bill", "Provider bill recipient not established")) + '</div>'
      + '<div class="ut-value ut-muted">'
      + esc(notApplicable ? "Not applicable" : partyPhrase(arrangement.provider_responsible_party,
          "responsible to provider", "Provider responsibility not established")) + '</div></div>'
      + '<div><div class="ut-kicker">Responsibility and resident billing</div>'
      + '<div class="ut-value">' + esc(notApplicable ? "Not applicable"
          : partyPhrase(arrangement.economic_responsibility,
            "economic responsibility", "Economic responsibility not established")) + '</div>'
      + '<div class="ut-value ut-muted">' + esc(notApplicable ? "Not applicable" : arrangement.resident_recovery_method
          ? words(arrangement.resident_recovery_method) : "Resident recovery not established") + '</div>'
      + (notApplicable ? '' : arrangement.billing_administrator_name
          ? '<div class="ut-value ut-muted">Administered by ' + esc(arrangement.billing_administrator_name) + '</div>' : '')
      + '<div class="ut-value ut-muted">' + esc(notApplicable ? "Not applicable"
          : partyPhrase(arrangement.resident_payment_recipient,
            "receives resident payments", "Resident payment recipient not established")) + '</div></div>'
      + '<div><div class="ut-kicker">Topology and latest provider bill</div>'
      + '<div class="ut-value">' + esc(notApplicable ? "Not applicable" : arrangement.physical_arrangement
          ? words(arrangement.physical_arrangement) : "Physical arrangement not established") + '</div>'
      + '<div class="ut-value ut-muted">'
      + esc(notApplicable ? "Not applicable" : (service.accounts || []).length
          ? (service.accounts || []).length + " mapped provider account" + ((service.accounts || []).length === 1 ? "" : "s")
          : "Provider account map not established")
      + (notApplicable ? '' : ' &middot; ' + esc((service.service_points || []).length
          ? (service.service_points || []).length + " service point" + ((service.service_points || []).length === 1 ? "" : "s")
          : "Service point map not established")) + '</div>'
      + '<div class="ut-value ut-muted">' + esc(notApplicable ? "Not applicable" : statement) + '</div></div>'
      + '</div></details>';
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
          + '<div>' + evidenceButton((statement && statement.evidence) || account.evidence, "View source") + '</div>'
          + '</div>';
      }).join("") + '</div>';
  }

  function setupRows(services, gaps) {
    var gapsByService = {};
    gaps.forEach(function (gap) {
      if (!gapsByService[gap.service]) gapsByService[gap.service] = [];
      gapsByService[gap.service].push(gap);
    });
    return '<div class="ut-setup-list">' + services.map(function (service) {
      var applicability = service.applicability || {};
      var unknown = applicability.truth_state === "NOT_ESTABLISHED";
      var notApplicable = applicability.value === "not_applicable";
      var serviceGaps = gapsByService[service.service_class] || [];
      var needsCompletion = !unknown && !notApplicable && serviceGaps.length > 0;
      var stateLabel = unknown ? "Not established" : notApplicable ? "Not applicable"
        : needsCompletion ? serviceGaps.length + " gap" + (serviceGaps.length === 1 ? "" : "s") : "Present";
      var stateClass = unknown ? " is-unknown" : notApplicable ? " is-na"
        : needsCompletion ? " is-attention" : "";
      var action = unknown ? "Establish" : needsCompletion ? "Complete" : "Review";
      var actionButton = notApplicable ? '<span aria-hidden="true"></span>'
        : '<button class="ut-btn is-quiet" type="button"'
          + (serviceGaps.length ? ' title="' + esc(serviceGaps.map(function (gap) {
              return gap.reason || gap.question;
            }).join(" ")) + '"' : '')
          + ' aria-label="' + esc(action + " " + service.label + " utility setup") + '"'
          + ' onclick="psUtilitiesStartSetup(\'' + esc(service.service_class) + '\')">'
          + action + '</button>';
      return '<div class="ut-setup-item" data-ut-setup="' + esc(service.service_class) + '">'
        + '<div class="ut-setup-name">' + esc(service.label) + '</div>'
        + '<span class="ut-state' + stateClass + '">' + stateLabel + '</span>'
        + actionButton + '</div>';
    }).join("") + '</div>';
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

  function select(name, choices, selected, attributes) {
    return '<select id="' + esc(name) + '" data-ut-input="' + esc(name) + '"'
      + (attributes || "") + '>'
      + choices.map(function (choice) { return option(choice[0], choice[1], choice[0] === selected); }).join("")
      + '</select>';
  }

  function setupSheet() {
    var services = (((state.data || {}).detail || {}).services || []);
    var selected = serviceByClass(state.serviceClass) || services.filter(function (service) {
      return service.applicability && service.applicability.truth_state === "NOT_ESTABLISHED";
    })[0] || services[0] || {};
    var current = selected.applicability || {};
    var currentArrangement = selected.arrangement || {};
    var selectedGaps = ((((state.data || {}).detail || {}).unresolved) || []).filter(function (gap) {
      return gap.service === selected.service_class;
    });
    var arrangementGap = selectedGaps.some(function (gap) {
      return ["physical_arrangement", "provider_bill_recipient", "provider_responsibility",
        "economic_responsibility", "resident_recovery", "billing_administrator"].includes(gap.concept);
    });
    var mapGap = selectedGaps.some(function (gap) {
      return ["provider_account", "service_point_map", "meter_map", "account_meter_mapping"].includes(gap.concept);
    });
    var providers = [];
    services.forEach(function (service) {
      (service.providers || []).forEach(function (provider) {
        if (!providers.some(function (item) { return item.id === provider.id; })) providers.push(provider);
      });
    });
    var established = current.truth_state !== "NOT_ESTABLISHED";
    var applicability = established ? "unchanged" : "";
    var applicabilityChoices = established
      ? [["unchanged", current.value === "not_applicable"
          ? "Not applicable (established)" : "Present (established)"]]
      : [["", "Choose"], ["present", "Present"], ["not_applicable", "Not applicable"]];
    var today = new Date().toISOString().slice(0, 10);
    return '<div class="ut-sheet-backdrop" onclick="if(event.target===this)psUtilitiesClose()">'
      + '<section class="ut-sheet" role="dialog" aria-modal="true" aria-labelledby="utSetupTitle">'
      + '<div class="ut-sheet-head"><div><h3 id="utSetupTitle">'
      + esc((established ? "Review " : "Set up ") + (selected.label || "utility service")) + '</h3>'
      + '<p>Confirmed service, responsibility, account, and meter facts</p></div>'
      + '<button class="ut-close" type="button" title="Close" onclick="psUtilitiesClose()">&times;</button></div>'
      + (state.error ? '<div class="ut-error">' + esc(state.error) + '</div>' : '')
      + '<div class="ut-form-section"><h4>Service</h4><div class="ut-form-grid">'
      + field("ut_service", "Utility service", select("ut_service", services.map(function (service) {
          return [service.service_class, service.label];
        }), selected.service_class, ' onchange="psUtilitiesChooseService(this.value)"'))
      + field("ut_applicability", "Applicability", select("ut_applicability",
          applicabilityChoices, applicability, established ? " disabled" : ""))
      + field("ut_effective", "Effective from", input("ut_effective", "date", today))
      + field("ut_provider_existing", "Use known provider", select("ut_provider_existing",
          [["", "None selected"]].concat(providers.map(function (provider) {
            return [provider.id, provider.name];
          })), (selected.providers || []).length === 1 ? selected.providers[0].id : ""))
      + field("ut_provider_name", "Or add provider", input("ut_provider_name", "text", "", "Provider name"))
      + field("ut_provenance", "Confirmation basis", '<textarea id="ut_provenance" data-ut-input="ut_provenance" placeholder="Who confirmed this, and from what source?"></textarea>', true)
      + '</div></div>'
      + '<details class="ut-disclosure"' + (arrangementGap ? ' open' : '')
      + '><summary>Responsibility and resident billing</summary><div class="ut-form-grid">'
      + field("ut_topology", "Physical arrangement", select("ut_topology", [
          ["", "Not being established"], ["whole_building_master_meter", "Whole-building master meter"],
          ["common_house_meter", "Common / house meter"], ["individual_provider_meters", "Individual provider meters"],
          ["internal_submeters", "Internal submeters"], ["shared_plant", "Shared plant"],
          ["non_metered", "Non-metered"], ["mixed", "Mixed"], ["unknown", "Established as unknown"],
        ], currentArrangement.physical_arrangement || ""))
      + field("ut_bill_recipient", "Provider bill recipient", select("ut_bill_recipient", [
          ["", "Not being established"], ["property", "Property"], ["resident", "Resident"],
          ["billing_administrator", "Billing administrator"], ["other_third_party", "Other third party"], ["mixed", "Mixed"],
        ], currentArrangement.provider_bill_recipient || ""))
      + field("ut_provider_responsible", "Responsible to provider", select("ut_provider_responsible", [
          ["", "Not being established"], ["property", "Property"], ["resident", "Resident"],
          ["other_third_party", "Other third party"], ["mixed", "Mixed"],
        ], currentArrangement.provider_responsible_party || ""))
      + field("ut_economic", "Economic responsibility", select("ut_economic", [
          ["", "Not being established"], ["property", "Property"], ["resident", "Resident"],
          ["shared", "Shared"], ["mixed", "Mixed"],
        ], currentArrangement.economic_responsibility || ""))
      + field("ut_recovery", "Resident recovery", select("ut_recovery", [
          ["", "Not being established"], ["none_property_absorbs", "Property absorbs"],
          ["included_in_rent", "Included in rent"], ["resident_direct_to_provider", "Resident pays provider directly"],
          ["fixed_fee", "Fixed fee"], ["rubs_allocation", "RUBS allocation"],
          ["actual_submeter_usage", "Actual submeter usage"], ["passthrough", "Pass-through"],
          ["mixed", "Mixed"], ["other", "Other"],
        ], currentArrangement.resident_recovery_method || ""))
      + field("ut_payment_recipient", "Resident payment recipient", select("ut_payment_recipient", [
          ["", "Not being established"], ["property", "Property"], ["provider", "Provider"],
          ["billing_administrator", "Billing administrator"], ["other_third_party", "Other third party"],
          ["mixed", "Mixed"], ["not_applicable", "Not applicable"],
        ], currentArrangement.resident_payment_recipient || ""))
      + field("ut_billing_admin", "Billing administrator", input("ut_billing_admin", "text",
          currentArrangement.billing_administrator_name || "", "Name"))
      + (currentArrangement.revision_id
          ? field("ut_revision_reason", "Why is this changing?",
              '<textarea id="ut_revision_reason" data-ut-input="ut_revision_reason" placeholder="What was incorrect in the earlier setup?"></textarea>', true)
          : '')
      + '</div></details>'
      + '<details class="ut-disclosure"' + (mapGap ? ' open' : '')
      + '><summary>Account, service point, and meter</summary><div class="ut-form-grid">'
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
      + '</div></details>'
      + '<div class="ut-sheet-actions"><button class="ut-btn" type="button" onclick="psUtilitiesClose()">Cancel</button>'
      + '<button class="ut-btn is-primary" type="button" onclick="psUtilitiesConfirmSetup()"'
      + (state.busy ? ' disabled' : '') + '>' + (state.busy ? "Saving..." : established ? "Save setup" : "Record setup") + '</button></div>'
      + '</section></div>';
  }

  function proposalValue(key) {
    var fields = (state.proposal && state.proposal.fields) || {};
    var value = fields[key];
    if (value && typeof value === "object") return "";
    return value || "";
  }

  function statementValue(name, fallback) {
    if (state.statementDraft
        && Object.prototype.hasOwnProperty.call(state.statementDraft, name)) {
      return state.statementDraft[name];
    }
    return fallback || "";
  }

  function statementMappings(accountId) {
    var services = ((((state.data || {}).detail || {}).services) || []).filter(function (service) {
      return service.applicability && service.applicability.value === "present"
        && (service.accounts || []).some(function (account) { return account.id === accountId; });
    });
    var meters = [];
    services.forEach(function (service) {
      var account = (service.accounts || []).find(function (item) { return item.id === accountId; });
      (account && account.meters || []).forEach(function (meter) {
        if (!meters.some(function (item) { return item.id === meter.id; })) meters.push(meter);
      });
    });
    return { services: services, meters: meters };
  }

  function statementDraftFromForm() {
    if (!state.artifact) return;
    var draft = {};
    ["ut_bill_account", "ut_statement_id", "ut_bill_date", "ut_due_date",
      "ut_period_start", "ut_period_end", "ut_currency", "ut_amount_billed",
      "ut_current_due", "ut_late_fee", "ut_usage_service", "ut_usage_meter",
      "ut_usage_quantity", "ut_usage_unit", "ut_usage_basis"].forEach(function (name) {
      draft[name] = read(name);
    });
    state.statementDraft = draft;
    state.statementAccountId = draft.ut_bill_account || null;
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
    var usage = ((state.proposal || {}).fields || {}).usage || {};
    var proposedAssociation = ((state.proposal || {}).associations || {}).account_id || "";
    var selectedAccount = state.statementAccountId
      || statementValue("ut_bill_account", proposedAssociation);
    if (!accounts.some(function (account) { return account.id === selectedAccount; })) selectedAccount = "";
    var mappings = statementMappings(selectedAccount);
    var proposedServiceClass = proposalValue("service_class");
    var proposedService = mappings.services.find(function (service) {
      return service.service_class === proposedServiceClass;
    });
    var selectedService = statementValue("ut_usage_service",
      proposedService ? proposedService.id : mappings.services.length === 1 ? mappings.services[0].id : "");
    var proposedMeter = ((state.proposal || {}).associations || {}).meter_id || "";
    var selectedMeter = statementValue("ut_usage_meter",
      mappings.meters.some(function (meter) { return meter.id === proposedMeter; }) ? proposedMeter : "");
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
          })), selectedAccount, ' onchange="psUtilitiesChooseStatementAccount(this.value)"'))
      + field("ut_statement_id", "Statement number", input("ut_statement_id", "text",
          statementValue("ut_statement_id", proposalValue("statement_identifier"))))
      + field("ut_bill_date", "Bill date", input("ut_bill_date", "date",
          statementValue("ut_bill_date", proposalValue("bill_date"))))
      + field("ut_due_date", "Due date", input("ut_due_date", "date",
          statementValue("ut_due_date", proposalValue("due_date"))))
      + field("ut_period_start", "Service period start", input("ut_period_start", "date",
          statementValue("ut_period_start", proposalValue("service_period_start"))))
      + field("ut_period_end", "Service period end", input("ut_period_end", "date",
          statementValue("ut_period_end", proposalValue("service_period_end"))))
      + field("ut_currency", "Currency", select("ut_currency", [["", "Choose"], ["USD", "USD"]],
          statementValue("ut_currency", "")))
      + field("ut_amount_billed", "Amount billed", input("ut_amount_billed", "text",
          statementValue("ut_amount_billed", proposalValue("amount_billed")), "0.00"))
      + field("ut_current_due", "Current amount due", input("ut_current_due", "text",
          statementValue("ut_current_due", proposalValue("current_amount_due")), "0.00"))
      + field("ut_late_fee", "Late fee", input("ut_late_fee", "text",
          statementValue("ut_late_fee", proposalValue("late_fee")), "0.00"))
      + '</div></div>'
      + '<div class="ut-form-section"><h4>Usage, when stated</h4><div class="ut-form-grid">'
      + field("ut_usage_service", "Service", select("ut_usage_service",
          [["", selectedAccount ? "No usage row" : "Choose account first"]].concat(mappings.services.map(function (service) {
          return [service.id, service.label];
        })), selectedService, selectedAccount ? "" : " disabled"))
      + field("ut_usage_meter", "Meter", select("ut_usage_meter",
          [["", selectedAccount ? "No meter selected" : "Choose account first"]].concat(mappings.meters.map(function (meter) {
          return [meter.id, (meter.identifier_masked || "Meter") + " / " + words(meter.kind)];
        })), selectedMeter, selectedAccount ? "" : " disabled"))
      + field("ut_usage_quantity", "Usage quantity", input("ut_usage_quantity", "text",
          statementValue("ut_usage_quantity", usage.quantity || "")))
      + field("ut_usage_unit", "Usage unit", input("ut_usage_unit", "text",
          statementValue("ut_usage_unit", usage.usage_unit || ""), "kWh, therms, gallons"))
      + field("ut_usage_basis", "Reading basis", select("ut_usage_basis", [
          ["", "Choose"], ["observed", "Observed / actual"], ["estimated", "Estimated"], ["stated_unknown", "Statement does not say"],
        ], statementValue("ut_usage_basis", proposalValue("usage_basis"))))
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
    var services = detail.services || [];
    var presentServices = services.filter(function (service) {
      return service.applicability && service.applicability.value === "present";
    });
    var accountHtml = services.map(accountRows).join("");
    var hasAccounts = !!accountHtml || (detail.accounts || []).length > 0;
    var establishedCount = Number.isSafeInteger(standing.established_services)
      ? standing.established_services : presentServices.length;
    var anySetup = services.some(function (service) {
      return service.applicability && service.applicability.truth_state !== "NOT_ESTABLISHED";
    });
    var setupAction = !anySetup ? "Start setup" : gaps.length ? "Continue setup" : "Review setup";
    var headline = establishedCount + " service" + (establishedCount === 1 ? "" : "s") + " established"
      + " &middot; " + (gaps.length
        ? gaps.length + " question" + (gaps.length === 1 ? "" : "s") + " to resolve"
        : "setup current");
    var setupSection = '<section class="ut-section" data-ut-section="gaps"><div class="ut-section-head"><h3>Service map</h3>'
      + '<span class="ut-section-note">' + (gaps.length
        ? gaps.length + " question" + (gaps.length === 1 ? "" : "s") : "All classified") + '</span></div>'
      + setupRows(services, gaps) + '</section>';
    var serviceSection = presentServices.length
      ? '<section class="ut-section" data-ut-section="service-map"><div class="ut-section-head"><h3>Active services</h3>'
        + '<span class="ut-section-note">Provider, responsibility, topology, and recovery</span></div>'
        + '<div class="ut-service-list">' + presentServices.map(function (service) {
          return serviceRow(service, gaps);
        }).join("") + '</div></section>'
      : "";
    var accountSection = hasAccounts
      ? '<section class="ut-section" data-ut-section="accounts"><div class="ut-section-head"><h3>Accounts &amp; meters</h3>'
        + '<span class="ut-section-note">Organized by service</span></div>' + accountHtml + '</section>'
      : "";
    return '<div class="am-room-view ut-shell" data-am-view="compartment" data-am-compartment-open="utilities">'
      + '<button class="am-back" type="button" onclick="amOpenRoom(\'property_expenses\')">&larr; Property Expenses</button>'
      + '<div class="ut-head"><div class="ut-title"><h2>Utilities</h2><p>' + headline + '</p></div>'
      + '<div class="ut-actions"><button class="ut-btn' + (!hasAccounts ? ' is-primary' : '')
      + '" type="button" onclick="psUtilitiesStartSetup()">' + setupAction + '</button>'
      + '<button class="ut-btn' + (hasAccounts ? ' is-primary' : '') + '" type="button" onclick="psUtilitiesStartStatement()"'
      + (hasAccounts ? '' : ' disabled title="Establish a provider account before adding a statement"')
      + '>Add statement</button></div></div>'
      + (state.receipt ? '<div class="ut-receipt">' + esc(state.receipt) + '</div>' : '')
      + setupSection + serviceSection + accountSection
      + (state.mode === "setup" ? setupSheet() : state.mode === "statement" ? statementSheet() : "")
      + '</div>';
  }

  function rerender() {
    var root = document.querySelector('[data-am-compartment-open="utilities"]');
    if (root && root.parentNode && state.data) {
      root.parentNode.innerHTML = html(state.data);
      if (state.mode === "setup" && state.setupDraft) {
        Object.keys(state.setupDraft.values).forEach(function (name) {
          var inputElement = document.querySelector('[data-am-compartment-open="utilities"]'
            + ' [data-ut-input="' + name + '"]');
          if (inputElement) inputElement.value = state.setupDraft.values[name];
        });
        document.querySelectorAll('[data-am-compartment-open="utilities"] .ut-disclosure')
          .forEach(function (disclosure, index) {
            disclosure.open = !!state.setupDraft.openDisclosures[index];
          });
      }
    }
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

  function setupDraftFromForm() {
    var root = document.querySelector('[data-am-compartment-open="utilities"]');
    if (!root) return;
    var values = {};
    root.querySelectorAll('.ut-sheet [data-ut-input]').forEach(function (inputElement) {
      values[inputElement.dataset.utInput] = inputElement.value;
    });
    state.setupDraft = { values: values,
      openDisclosures: Array.from(root.querySelectorAll('.ut-disclosure')).map(function (item) {
        return item.open;
      }) };
  }

  function startSetup(serviceClass) {
    state.mode = "setup"; state.serviceClass = serviceClass || null;
    state.error = null; state.receipt = null; state.artifact = null; state.proposal = null;
    state.setupDraft = null;
    rerender();
  }

  function chooseService(serviceClass) {
    state.serviceClass = serviceClass || null;
    state.error = null; state.setupDraft = null;
    rerender();
  }

  function startStatement() {
    state.mode = "statement"; state.error = null; state.receipt = null;
    state.artifact = null; state.proposal = null; state.statementAccountId = null;
    state.statementDraft = null; rerender();
  }

  function close() {
    state.mode = null; state.error = null; state.busy = false;
    state.artifact = null; state.proposal = null; state.setupDraft = null; state.statementAccountId = null;
    state.statementDraft = null; rerender();
  }

  function chooseStatementAccount(accountId) {
    state.statementAccountId = accountId || null;
    if (state.statementDraft) state.statementDraft.ut_bill_account = accountId || "";
    var root = document.querySelector('[data-am-compartment-open="utilities"]');
    var serviceSelect = root && root.querySelector('[data-ut-input="ut_usage_service"]');
    var meterSelect = root && root.querySelector('[data-ut-input="ut_usage_meter"]');
    if (!serviceSelect || !meterSelect) return;
    var mappings = statementMappings(accountId);
    var currentService = serviceSelect.value;
    var proposedServiceClass = proposalValue("service_class");
    var proposedService = mappings.services.find(function (service) {
      return service.service_class === proposedServiceClass;
    });
    var selectedService = mappings.services.some(function (service) { return service.id === currentService; })
      ? currentService : proposedService ? proposedService.id
        : mappings.services.length === 1 ? mappings.services[0].id : "";
    serviceSelect.innerHTML = [["", accountId ? "No usage row" : "Choose account first"]]
      .concat(mappings.services.map(function (service) { return [service.id, service.label]; }))
      .map(function (choice) { return option(choice[0], choice[1], choice[0] === selectedService); }).join("");
    serviceSelect.disabled = !accountId;

    var currentMeter = meterSelect.value;
    var proposedMeter = ((state.proposal || {}).associations || {}).meter_id || "";
    var selectedMeter = mappings.meters.some(function (meter) { return meter.id === currentMeter; })
      ? currentMeter : mappings.meters.some(function (meter) { return meter.id === proposedMeter; })
        ? proposedMeter : "";
    meterSelect.innerHTML = [["", accountId ? "No meter selected" : "Choose account first"]]
      .concat(mappings.meters.map(function (meter) {
        return [meter.id, (meter.identifier_masked || "Meter") + " / " + words(meter.kind)];
      })).map(function (choice) { return option(choice[0], choice[1], choice[0] === selectedMeter); }).join("");
    meterSelect.disabled = !accountId;
  }

  async function confirmSetup() {
    if (state.busy) return;
    setupDraftFromForm();
    var serviceClass = read("ut_service");
    var existing = serviceByClass(serviceClass) || {};
    var applicability = read("ut_applicability");
    var resultingApplicability = applicability === "unchanged"
      ? ((existing.applicability || {}).value || null) : applicability;
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
    if (resultingApplicability !== "not_applicable") {
      var selectedProviderId = read("ut_provider_existing");
      var newProviderName = read("ut_provider_name");
      if (newProviderName) body.provider = { provider_name: newProviderName };
      else if (selectedProviderId && !(existing.providers || []).some(function (provider) {
        return provider.id === selectedProviderId;
      })) body.provider_id = selectedProviderId;

      var arrangement = {
        physical_arrangement: read("ut_topology") || null,
        provider_bill_recipient: read("ut_bill_recipient") || null,
        provider_responsible_party: read("ut_provider_responsible") || null,
        economic_responsibility: read("ut_economic") || null,
        resident_recovery_method: read("ut_recovery") || null,
        resident_payment_recipient: read("ut_payment_recipient") || null,
        billing_administrator_name: read("ut_billing_admin") || null,
      };
      var existingArrangement = existing.arrangement || {};
      var arrangementChanged = Object.keys(arrangement).some(function (key) {
        return arrangement[key] !== (existingArrangement[key] || null);
      });
      if (arrangementChanged) {
        if (existingArrangement.revision_id) {
          var revisionReason = read("ut_revision_reason");
          if (!revisionReason) {
            state.error = "Say what was incorrect in the earlier setup."; rerender(); return;
          }
          body.supersedes_id = existingArrangement.revision_id;
          body.revision_reason = revisionReason;
          body.effective_from = existingArrangement.effective_from || body.effective_from;
        } else if (Object.keys(existingArrangement).length) {
          state.error = "This setup cannot be corrected safely yet. Refresh Utilities and try again.";
          rerender(); return;
        }
        body.arrangement = arrangement;
      }

      if (read("ut_account")) {
        body.account = { external_account_identifier: read("ut_account"),
          service_address: read("ut_service_address") || null };
        if (selectedProviderId && !newProviderName) body.account.provider_id = selectedProviderId;
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
        if (selectedProviderId && !newProviderName && body.meter.meter_kind === "provider_meter") {
          body.meter.provider_id = selectedProviderId;
        }
      }
      if (body.account && !(body.provider || body.provider_id || body.account.provider_id)) {
        state.error = "Select or name the provider before recording its account."; rerender(); return;
      }
      if (body.meter && body.meter.meter_kind === "provider_meter"
          && !(body.provider || body.provider_id || body.meter.provider_id)) {
        state.error = "Select or name the provider for a provider meter."; rerender(); return;
      }
      if (arrangementChanged && (body.provider || body.provider_id || body.account
          || body.service_point || body.meter)) {
        state.error = "Save the arrangement correction before adding provider, account, or meter facts.";
        rerender(); return;
      }
    }
    if (Object.keys(body).every(function (key) {
      return ["service_class", "effective_from", "provenance_note"].includes(key);
    })) {
      state.error = "Change at least one Utility setup fact before recording."; rerender(); return;
    }

    state.busy = true; state.error = null; rerender();
    try {
      var response = await window.__psLive.assetManagementUtilitySetup(body);
      var result = (response && response.data) || response || {};
      state.mode = null; state.busy = false; state.setupDraft = null;
      state.receipt = result.receipt || "Utility setup recorded.";
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
      state.statementAccountId = null; state.statementDraft = null;
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
    statementDraftFromForm();
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
      var mappings = statementMappings(read("ut_bill_account"));
      if (!mappings.services.some(function (service) { return service.id === read("ut_usage_service"); })
          || (read("ut_usage_meter") && !mappings.meters.some(function (meter) {
            return meter.id === read("ut_usage_meter");
          }))) {
        state.error = "Choose a service and meter mapped to this provider account."; rerender(); return;
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
  window.psUtilitiesChooseService = chooseService;
  window.psUtilitiesStartStatement = startStatement;
  window.psUtilitiesChooseStatementAccount = chooseStatementAccount;
  window.psUtilitiesClose = close;
  window.psUtilitiesConfirmSetup = confirmSetup;
  window.psUtilitiesUploadStatement = uploadStatement;
  window.psUtilitiesConfirmStatement = confirmStatement;
  window.psUtilityOpenEvidence = openEvidence;
  window.__psUtilitiesDoor = { render: html, startSetup: startSetup, startStatement: startStatement };
})();
