"use strict";

(function () {
  if (window.__psContractedServicesDoor) return;

  var state = {
    data: null, mode: null, busy: false, error: null, receipt: null,
    artifact: null, proposal: null, draft: null,
  };

  var SERVICE_CHOICES = [
    ["building_cleaning", "Building cleaning"],
    ["elevator_maintenance", "Elevator maintenance"],
    ["fire_alarm_monitoring", "Fire alarm monitoring"],
    ["fire_sprinkler_service", "Fire sprinkler service"],
    ["security_concierge", "Security / concierge"],
    ["hvac_maintenance", "HVAC maintenance"],
    ["waste_removal", "Waste removal"],
    ["compactor_rental", "Compactor rental / service"],
    ["pest_control", "Pest control"],
    ["snow_removal", "Snow removal"],
    ["landscaping", "Landscaping"],
    ["water_treatment", "Water treatment"],
    ["meter_reading", "Meter reading"],
    ["parking_operations", "Parking operations"],
    ["other", "Other contracted service"],
  ];

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function ensureStyle() {
    if (document.getElementById("ps-contracted-services-style")) return;
    var style = document.createElement("style");
    style.id = "ps-contracted-services-style";
    style.textContent = [
      ".cs-shell{max-width:none;margin:0;padding:0 0 46px;color:#151b24;background:#fff;border:0!important;border-radius:0!important;box-shadow:none!important;font-variant-numeric:tabular-nums}",
      ".cs-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin:18px 0 16px}",
      ".cs-title h2{margin:0 0 4px;font-size:24px;line-height:1.15;letter-spacing:0!important;text-transform:none!important;font-weight:650}",
      ".cs-title p{margin:0;color:#5f6974;font-size:12px;line-height:1.4}",
      ".cs-actions{display:flex;gap:8px;flex-wrap:wrap}",
      ".cs-btn{min-height:34px;border:1px solid #aeb7c0;border-radius:2px;background:#fff;color:#1d2731;padding:7px 12px;font:600 12px/1.2 inherit;cursor:pointer}",
      ".cs-btn:hover{border-color:#4f5d69;background:#f6f7f8}",
      ".cs-btn.is-primary{background:#19324a;border-color:#19324a;color:#fff}",
      ".cs-btn.is-quiet{min-height:28px;padding:4px 8px;font-size:11px}",
      ".cs-btn:disabled{cursor:not-allowed;background:#f1f2f3;border-color:#d5d9dd;color:#8d969e}",
      ".cs-truthline{display:flex;align-items:center;gap:7px 0;flex-wrap:wrap;padding:9px 0;border-top:1px solid #cfd5db;border-bottom:1px solid #cfd5db;font-size:11px;color:#59646f}",
      ".cs-truthline span{display:inline-flex;align-items:center;gap:6px;padding:0 14px;border-right:1px solid #d8dde1}",
      ".cs-truthline span:first-child{padding-left:0}",
      ".cs-truthline span:last-child{border-right:0}",
      ".cs-truthline b{font:650 12px/1.2 'IBM Plex Mono',monospace;color:#151b24}",
      ".cs-section{margin-top:20px;border-top:1px solid #cfd5db;padding-top:12px}",
      ".cs-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:14px;margin-bottom:9px}",
      ".cs-section h3{margin:0;font-size:13px;letter-spacing:0;font-weight:650}",
      ".cs-section-note{font-size:11px;color:#69737d}",
      ".cs-list{border-bottom:1px solid #cfd5db}",
      ".cs-list-head{display:grid;grid-template-columns:minmax(170px,1.1fr) minmax(150px,.9fr) minmax(210px,1.25fr) minmax(130px,.8fr) 62px;gap:18px;padding:0 0 7px;color:#66717b;font-size:10px;font-weight:650;text-transform:uppercase}",
      ".cs-service{border-top:1px solid #d8dde1}",
      ".cs-service>summary{display:grid;grid-template-columns:minmax(170px,1.1fr) minmax(150px,.9fr) minmax(210px,1.25fr) minmax(130px,.8fr) 62px;gap:18px;align-items:center;padding:12px 0;cursor:pointer;list-style:none}",
      ".cs-service>summary::-webkit-details-marker{display:none}",
      ".cs-service[open]>summary{border-bottom:1px solid #d8dde1}",
      ".cs-service-name b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:650}",
      ".cs-service-name span,.cs-cell span{display:block;margin-top:2px;font-size:10px;color:#717b84}",
      ".cs-cell{min-width:0;font-size:12px}",
      ".cs-provider-cell,.cs-term-cell{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".cs-state{display:inline-flex;align-items:center;min-height:18px;border-left:2px solid #2f6a57;border-radius:0;padding:1px 0 1px 7px;background:transparent;color:#295b4d;font:600 9px/1.2 'IBM Plex Mono',monospace;text-transform:uppercase}",
      ".cs-state.is-attention{border-left-color:#9a4037;background:transparent;color:#81362f}",
      ".cs-state.is-unknown{border-left-color:#9a6b0f;background:transparent;color:#72500e}",
      ".cs-state.is-ended{border-left-color:#7b858d;background:transparent;color:#59636c}",
      ".cs-next{line-height:1.35;color:#5e491c!important}",
      ".cs-next.is-clear{color:#6b747d!important}",
      ".cs-disclose{font-size:11px;font-weight:600;color:#455563;text-align:right;white-space:nowrap}",
      ".cs-disclose:after{content:' +';font-size:15px;font-weight:400}",
      ".cs-service[open] .cs-disclose:after{content:' -'}",
      ".cs-mobile-label{display:none!important}",
      ".cs-body{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;padding:15px 12px 17px;background:#f7f8f9;border-bottom:1px solid #cfd5db}",
      ".cs-block h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;color:#65706c;letter-spacing:0}",
      ".cs-block p{margin:3px 0;font-size:13px;line-height:1.45;color:#2e3935}",
      ".cs-block .cs-muted{font-size:12px;color:#737d79}",
      ".cs-evidence-list{margin:8px 0 0;padding:0;list-style:none}",
      ".cs-evidence-list li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid #e9eceb;font-size:12px}",
      ".cs-mini-head{margin:12px 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;color:#65706c}",
      ".cs-inline-observations{margin:0;padding:0;list-style:none}",
      ".cs-inline-observations li{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid #e9eceb;font-size:12px;line-height:1.35}",
      ".cs-inline-observations li span:first-child{min-width:0}",
      ".cs-inline-observations li span:last-child{white-space:nowrap;font-weight:600}",
      ".cs-observations{border-bottom:1px solid #dfe4e2}",
      ".cs-observation{display:grid;grid-template-columns:minmax(170px,1fr) minmax(130px,.8fr) minmax(120px,.6fr);gap:18px;padding:12px 0;border-top:1px solid #e2e7e4;font-size:12px}",
      ".cs-coverage{margin-top:9px;font-size:11px;color:#5f6974}",
      ".cs-action-line{margin-top:8px!important;padding-left:9px;border-left:2px solid #9a6b0f;color:#5f481d!important;font-weight:600}",
      ".cs-empty{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(360px,1.2fr);gap:42px;padding:24px 0 6px;border-top:1px solid #dfe4e2}",
      ".cs-empty-intro{padding-top:4px}",
      ".cs-empty-kicker{display:block;margin-bottom:7px;color:#65706c;font-size:11px;font-weight:600;text-transform:uppercase}",
      ".cs-empty h3{margin:0 0 8px;font-size:18px;line-height:1.3}",
      ".cs-empty p{margin:0;color:#66716d;font-size:13px;line-height:1.5}",
      ".cs-start-list{border-bottom:1px solid #dfe4e2}",
      ".cs-start-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:14px 0;border-top:1px solid #dfe4e2}",
      ".cs-start-row:first-child{border-top:0}",
      ".cs-start-row b{display:block;margin-bottom:3px;font-size:13px}",
      ".cs-start-row span{display:block;color:#6a7470;font-size:12px;line-height:1.4}",
      ".cs-receipt,.cs-error{margin:12px 0;padding:9px 11px;border-left:2px solid #2b7564;background:#f5f7f6;font-size:12px}",
      ".cs-error{border-left-color:#ad4b45;background:#faf6f5;color:#7c312d}",
      ".cs-sheet-backdrop{position:fixed;inset:0;z-index:1100;background:rgba(15,24,21,.38);display:flex;justify-content:flex-end}",
      ".cs-sheet{width:min(660px,100%);height:100%;overflow:auto;background:#fff;padding:24px 28px 38px;border-left:1px solid #aeb7c0;box-shadow:-4px 0 18px rgba(15,24,21,.08);box-sizing:border-box}",
      ".cs-sheet-head{display:flex;justify-content:space-between;align-items:start;gap:16px;padding-bottom:16px;border-bottom:1px solid #dfe4e2}",
      ".cs-sheet-head h3{margin:0 0 5px;font-size:20px;letter-spacing:0}",
      ".cs-sheet-head p{margin:0;font-size:12px;line-height:1.45;color:#68726f}",
      ".cs-close{border:0;background:transparent;font-size:24px;line-height:1;cursor:pointer;color:#59635f;padding:1px 5px}",
      ".cs-form-section{padding:18px 0;border-bottom:1px solid #e4e8e6}",
      ".cs-form-section h4{margin:0 0 12px;font-size:13px;letter-spacing:0}",
      ".cs-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}",
      ".cs-field{display:flex;flex-direction:column;gap:5px;min-width:0}",
      ".cs-field.is-wide{grid-column:1/-1}",
      ".cs-field label{font-size:11px;font-weight:600;color:#53605c}",
      ".cs-field input,.cs-field select,.cs-field textarea{width:100%;min-height:36px;border:1px solid #b9c1c8;border-radius:2px;background:#fff;color:#151b24;padding:7px 8px;font:12px/1.3 inherit;box-sizing:border-box}",
      ".cs-field textarea{min-height:70px;resize:vertical}",
      ".cs-help{font-size:11px;line-height:1.4;color:#737d79}",
      ".cs-proposal{margin-top:12px;padding:10px 12px;background:#f5f7f6;border-left:3px solid #72827c;font-size:12px;line-height:1.45;color:#56615d}",
      ".cs-warning{border-left-color:#b18426;background:#faf6eb;color:#6e581f}",
      ".cs-sheet-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:18px}",
      "@media(max-width:780px){.cs-head{align-items:flex-start;flex-direction:column}.cs-list-head{display:none}.cs-service>summary{grid-template-columns:minmax(170px,1fr) minmax(190px,.9fr) 68px;gap:5px 14px;padding:12px 0}.cs-service-name{grid-column:1;grid-row:1}.cs-provider-cell{grid-column:1;grid-row:2}.cs-term-cell{grid-column:1;grid-row:3}.cs-authority-cell{grid-column:2;grid-row:1/4;align-self:start;padding-top:1px}.cs-disclose{grid-column:3;grid-row:1;text-align:right}.cs-mobile-label{display:inline!important;margin:0 5px 0 0!important;font-size:9px!important;font-weight:600;text-transform:uppercase;color:#7e8891!important}.cs-body{grid-template-columns:1fr 1fr}.cs-empty{grid-template-columns:1fr;gap:16px}.cs-sheet{padding:20px 18px}}",
      "@media(max-width:560px){.cs-service>summary{grid-template-columns:minmax(0,1fr) auto;gap:6px 12px}.cs-service-name{grid-column:1}.cs-provider-cell{grid-column:1}.cs-authority-cell{grid-column:1/-1;grid-row:auto;padding-top:4px}.cs-term-cell{grid-column:1;grid-row:auto}.cs-disclose{grid-column:2;grid-row:1}.cs-body,.cs-form-grid,.cs-observation,.cs-start-row{grid-template-columns:1fr}.cs-start-row{gap:10px}.cs-start-row .cs-btn{width:100%}.cs-actions{width:100%}.cs-actions .cs-btn{flex:1}.cs-title h2{font-size:22px}.cs-field.is-wide{grid-column:auto}.cs-truthline{align-items:flex-start;flex-direction:column;gap:5px}.cs-truthline span{padding:0;border:0}.cs-service-name b{white-space:normal}.cs-provider-cell,.cs-term-cell{white-space:normal}}"
    ].join("");
    document.head.appendChild(style);
  }

  function option(value, label, selected) {
    return '<option value="' + esc(value) + '"' + (selected ? " selected" : "") + '>'
      + esc(label) + '</option>';
  }

  function words(value) {
    return String(value || "").replace(/_/g, " ").replace(/\b\w/g, function (char) {
      return char.toUpperCase();
    });
  }

  function formatMoney(cents, currency) {
    if (!Number.isSafeInteger(cents)) return "Price not established";
    var amount = (cents / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
    return (currency === "USD" ? "$" : (currency ? currency + " " : "")) + amount;
  }

  function priceText(prices) {
    if (!(prices || []).length) return "Price not established";
    return prices.map(function (price) {
      if (price.amount_cents == null) return price.description || "Variable price";
      return formatMoney(price.amount_cents, price.currency_code) + " "
        + words(price.basis || price.price_basis).toLowerCase();
    }).join("; ");
  }

  function authorityMeta(row) {
    var documents = row.documents || [];
    var partial = documents.some(function (document) {
      return document.execution_state === "partially_executed";
    });
    var unsigned = documents.find(function (document) {
      return document.execution_state === "unsigned";
    });
    if (row.execution_standing === "EXECUTED_GOVERNING") {
      return ["Executed / governing", ""];
    }
    if (row.execution_standing === "OFFERED_OR_UNSIGNED") {
      if (partial) return ["Partially signed", "is-attention"];
      if (unsigned && unsigned.document_kind === "proposal") {
        return ["Unsigned proposal", "is-unknown"];
      }
      if (unsigned && unsigned.document_kind === "agreement") {
        return ["Unsigned agreement", "is-unknown"];
      }
      return ["Offered / unsigned", "is-unknown"];
    }
    if (row.execution_standing === "EVIDENCE_ONLY") return ["Evidence only", "is-unknown"];
    return ["Not established", "is-unknown"];
  }

  function documentEvidence(document) {
    return document && (document.evidence || {}).source_artifact_id;
  }

  function evidenceButton(id, label) {
    if (!id) return "";
    return '<button class="cs-btn is-quiet" type="button" title="Open retained evidence"'
      + ' onclick="psContractedServiceOpenEvidence(\'' + esc(id) + '\')">'
      + esc(label || "Open") + '</button>';
  }

  function milestoneText(term) {
    var milestone = term && term.milestone;
    if (!milestone) return "No dated decision established";
    if (milestone.kind === "notice_decision") return "Notice decision by " + milestone.date;
    if (milestone.kind === "renewal_outcome_not_established") {
      return "Renewal outcome needed since " + milestone.date;
    }
    if (milestone.kind === "term_end") return "Term ends " + milestone.date;
    if (milestone.kind === "term_ended") return "Term ended " + milestone.date;
    if (milestone.kind === "term_dates_not_established") return "Term dates need confirmation";
    if (milestone.kind === "service_commencement") return "Starts " + milestone.date;
    return words(milestone.kind) + (milestone.date ? " " + milestone.date : "");
  }

  function nextActionText(row) {
    var term = row.term_standing || {};
    var documents = row.documents || [];
    if (row.execution_standing === "EXECUTED_GOVERNING") {
      if (term.milestone && term.milestone.kind === "term_dates_not_established") {
        return "Next: confirm current term dates";
      }
      if (term.state === "ATTENTION" && term.milestone) {
        if (term.milestone.kind === "notice_decision") {
          return "Next: decide renewal by " + term.milestone.date;
        }
        return "Next: address " + milestoneText(term).toLowerCase();
      }
      if (["OUTCOME_NOT_ESTABLISHED", "ENDED"].includes(term.state)) {
        return "Next: confirm what governs the service now";
      }
      if (term.state === "NOT_ESTABLISHED") return "Next: confirm the current term";
      return "No dated decision due";
    }
    if (row.execution_standing === "OFFERED_OR_UNSIGNED") {
      if (documents.some(function (document) {
        return document.execution_state === "partially_executed";
      })) return "Next: confirm all parties signed";
      if (documents.some(function (document) {
        return document.execution_state === "unsigned" && document.document_kind === "proposal";
      })) return "Next: decide whether to accept the proposal";
      if (documents.some(function (document) {
        return document.execution_state === "unsigned";
      })) return "Next: confirm whether the document was executed";
      return "Next: obtain executed governing terms";
    }
    if (row.execution_standing === "EVIDENCE_ONLY") return "Next: identify governing authority";
    return "Next: add the governing document";
  }

  function termBasisText(term) {
    if (!term) return "";
    if (term.commencement_date || term.initial_end_date) {
      return [term.commencement_date ? "Starts " + term.commencement_date : null,
        term.initial_end_date ? "Initial term ends " + term.initial_end_date : null]
        .filter(Boolean).join(" | ");
    }
    if (term.commencement_trigger || term.initial_term_months) {
      return [term.commencement_trigger || "Commencement trigger not established",
        term.initial_term_months ? term.initial_term_months + "-month initial term" : null]
        .filter(Boolean).join(" | ");
    }
    return "";
  }

  function serviceRow(row) {
    var term = row.term_standing || {};
    var current = term.current;
    var offered = term.offered;
    var authorityTerm = current || offered;
    var authority = authorityMeta(row);
    var nextAction = nextActionText(row);
    var owner = term.accountable_owner || {};
    var price = current ? priceText(current.prices) : offered
      ? "Offer: " + priceText(offered.prices) : "Price not established";
    var documents = row.documents || [];
    var financialObservations = row.financial_observations || [];
    var documentHtml = documents.length ? '<ul class="cs-evidence-list">'
      + documents.map(function (document) {
        return '<li><span>' + esc(words(document.document_kind)) + ' &middot; '
          + esc(words(document.execution_state)) + '</span>'
          + evidenceButton(documentEvidence(document), "Open") + '</li>';
      }).join("") + '</ul>' : '<p class="cs-muted">No retained service document established.</p>';
    var financialHtml = financialObservations.length
      ? '<div class="cs-mini-head">Financial observations</div><ul class="cs-inline-observations">'
        + financialObservations.map(function (observation) {
          var period = observation.period_start || observation.period_end;
          if (observation.period_start && observation.period_end) {
            period = observation.period_start + " to " + observation.period_end;
          }
          return '<li><span><b>' + esc(observation.line_label || "Recorded service amount") + '</b><br>'
            + esc([observation.provider_name, period].filter(Boolean).join(" | ")
              || "Source period not established") + '</span><span>'
            + esc(observationAmount(observation)) + '</span></li>';
        }).join("") + '</ul><p class="cs-muted">Accounting evidence, not contract price or payment.</p>'
      : '<p class="cs-muted">No linked financial observation established.</p>';
    return '<details class="cs-service" data-cs-service="' + esc(row.service_class) + '"><summary>'
      + '<div class="cs-service-name"><b>' + esc(row.label) + '</b><span>'
      + esc(row.engagement_label || "Service engagement") + '</span></div>'
      + '<div class="cs-cell cs-provider-cell">'
      + '<span class="cs-mobile-label">Provider</span>'
      + esc(row.provider ? row.provider.name : "Provider not established") + '</div>'
      + '<div class="cs-cell cs-authority-cell"><span class="cs-state ' + esc(authority[1]) + '">'
      + esc(authority[0]) + '</span><span class="cs-next'
      + (nextAction.indexOf("Next:") === 0 ? '' : ' is-clear') + '">' + esc(nextAction) + '</span></div>'
      + '<div class="cs-cell cs-term-cell"><span class="cs-mobile-label">Price</span>'
      + esc(price) + '</div><span class="cs-disclose">View details</span></summary>'
      + '<div class="cs-body"><div class="cs-block"><h4>Agreement</h4><p>'
      + esc(row.execution_standing === "EXECUTED_GOVERNING"
        ? "Executed governing document established" : row.execution_standing === "OFFERED_OR_UNSIGNED"
          ? "Only offered or unsigned terms are established" : "Governing authority not established") + '</p>'
      + '<p class="cs-muted">' + esc(term.reason || "Current terms are not established.") + '</p>'
      + (termBasisText(authorityTerm) ? '<p class="cs-muted">'
        + esc(termBasisText(authorityTerm)) + '</p>' : "")
      + '<p class="cs-muted">' + esc(milestoneText(term)) + '</p>'
      + '<p class="cs-action-line">' + esc(nextAction) + '</p>'
      + (owner.label ? '<p class="cs-muted">Owner: ' + esc(owner.label) + '</p>' : "") + '</div>'
      + '<div class="cs-block"><h4>Scope and price</h4><p>'
      + esc(row.scope ? row.scope.summary : "Scope not established") + '</p>'
      + '<p class="cs-muted">' + esc(row.scope && row.scope.frequency
        ? row.scope.frequency : "Service frequency not established") + '</p>'
      + '<p class="cs-muted">' + esc(price) + '</p></div>'
      + '<div class="cs-block"><h4>Evidence</h4>' + documentHtml
      + financialHtml
      + '<p class="cs-muted">Payment and completed work are not established here.</p></div></div></details>';
  }

  function requirementGapRows(rows) {
    if (!(rows || []).length) return "";
    return '<section class="cs-section" data-cs-section="requirement-gaps">'
      + '<div class="cs-section-head"><h3>Services needing a provider</h3>'
      + '<span class="cs-section-note">Required service, relationship not established</span></div>'
      + '<div class="cs-observations">' + rows.map(function (row) {
        return '<div class="cs-observation"><b>' + esc(row.label || words(row.service_class))
          + '</b><span>Provider and governing agreement not established</span><span>'
          + '<button class="cs-btn is-quiet" type="button"'
          + ' onclick="psContractedServicesStartService(\'' + esc(row.service_class) + '\')">Resolve</button>'
          + '</span></div>';
      }).join("") + '</div></section>';
  }

  function observationAmount(row) {
    return Number.isSafeInteger(row && row.amount_cents)
      ? formatMoney(row.amount_cents, row.currency_code) : "Amount not established";
  }

  function documentRows(rows) {
    if (!(rows || []).length) return "";
    return '<section class="cs-section" data-cs-section="unmatched-evidence">'
      + '<div class="cs-section-head"><h3>Documents to review</h3>'
      + '<span class="cs-section-note">Not yet governing</span></div>'
      + '<div class="cs-observations">' + rows.map(function (row) {
        return '<div class="cs-observation"><b>' + esc(row.filename || "Retained service document")
          + '</b><span>' + esc(words(row.document_kind) + " | " + words(row.execution_state))
          + '</span><span>' + evidenceButton(documentEvidence(row), "Open") + '</span></div>';
      }).join("") + '</div></section>';
  }

  function financialRows(rows) {
    if (!(rows || []).length) return "";
    return '<section class="cs-section" data-cs-section="financial-observations">'
      + '<div class="cs-section-head"><h3>Accounting items to review</h3>'
      + '<span class="cs-section-note">Not contract or payment truth</span></div>'
      + '<div class="cs-observations">' + rows.map(function (row) {
        return '<div class="cs-observation"><b>' + esc(row.label || row.line_label || "Service amount")
          + '</b><span>' + esc(row.provider_name || "Provider not established") + '</span><span>'
          + esc(observationAmount(row)) + '</span></div>';
      }).join("") + '</div></section>';
  }

  function readDraft(name, fallback) {
    if (state.draft && Object.prototype.hasOwnProperty.call(state.draft, name)) {
      return state.draft[name];
    }
    return fallback == null ? "" : fallback;
  }

  function proposalField(name) {
    return ((state.proposal || {}).fields || {})[name];
  }

  function proposalTerm(name) {
    return ((state.proposal || {}).term || {})[name];
  }

  function proposalPrice(name) {
    var component = ((state.proposal || {}).price_components || [])[0] || {};
    return component[name];
  }

  function field(name, label, type, value, extra) {
    return '<div class="cs-field' + ((extra || {}).wide ? " is-wide" : "") + '"><label for="cs-'
      + esc(name) + '">' + esc(label) + '</label><input id="cs-' + esc(name)
      + '" data-cs-input="' + esc(name) + '" type="' + esc(type || "text") + '" value="'
      + esc(readDraft(name, value)) + '"' + ((extra || {}).placeholder
        ? ' placeholder="' + esc(extra.placeholder) + '"' : "") + '></div>';
  }

  function selectField(name, label, choices, value, wide) {
    var current = String(readDraft(name, value) || "");
    return '<div class="cs-field' + (wide ? " is-wide" : "") + '"><label for="cs-'
      + esc(name) + '">' + esc(label) + '</label><select id="cs-' + esc(name)
      + '" data-cs-input="' + esc(name) + '">' + choices.map(function (choice) {
        return option(choice[0], choice[1], String(choice[0]) === current);
      }).join("") + '</select></div>';
  }

  function proposedService() {
    return proposalField("service_class") || "";
  }

  function evidenceSection() {
    var artifact = state.artifact;
    if (artifact) {
      var warnings = (state.proposal && state.proposal.warnings) || [];
      return '<div class="cs-form-section"><h4>Retained evidence</h4><div class="cs-proposal">'
        + '<b>' + esc(artifact.filename || "Service document") + '</b><br>'
        + esc(state.proposal && state.proposal.available
          ? "Spine proposed the fields below. Check them against the complete document."
          : "The document is retained. Enter only facts you can confirm from it.") + '</div>'
        + (warnings.length ? '<div class="cs-proposal cs-warning">'
          + warnings.map(esc).join("<br>") + '</div>' : "") + '</div>';
    }
    return '<div class="cs-form-section"><h4>Start with a document, when available</h4>'
      + '<p class="cs-help">Add an agreement, proposal, invoice, accounting report, or notice. No document yet? Continue below with only what you can confirm.</p>'
      + '<div class="cs-form-grid">' + selectField("artifact_kind", "Document type", [
        ["contracted_service_agreement", "Agreement"],
        ["contracted_service_proposal", "Proposal / quote"],
        ["contracted_service_statement_of_work", "Statement of work"],
        ["contracted_service_amendment", "Amendment"],
        ["contracted_service_addendum", "Addendum"],
        ["contracted_service_renewal_notice", "Renewal notice"],
        ["contracted_service_termination_notice", "Termination notice"],
        ["contracted_service_invoice", "Invoice"],
        ["contracted_service_accounting_report", "Accounting report"],
      ], "contracted_service_agreement")
      + '<div class="cs-field"><label for="cs-evidence-file">Document</label>'
      + '<input id="cs-evidence-file" data-cs-input="evidence_file" type="file" accept=".pdf"></div></div>'
      + '<div class="cs-sheet-actions"><button class="cs-btn" type="button" onclick="psContractedServiceUploadEvidence()"'
      + (state.busy ? " disabled" : "") + '>Upload and review</button></div></div>';
  }

  function providerChoices() {
    var providers = new Map();
    ((((state.data || {}).detail || {}).engagements || []).forEach(function (row) {
      if (row.provider && row.provider.id) providers.set(row.provider.id, row.provider.name);
    }));
    return [["", "Name a provider below"]].concat(Array.from(providers.entries()));
  }

  function serviceSheet() {
    var documentKind = proposalField("document_kind") || "agreement";
    var executionState = proposalField("execution_state") || "unverified";
    var termAuthority = proposalTerm("term_authority")
      || (["invoice", "accounting_report"].includes(documentKind) ? "observed" : "offered");
    var serviceClass = proposedService();
    var priceCents = proposalPrice("amount_cents");
    var priceDollars = Number.isSafeInteger(priceCents) ? (priceCents / 100).toFixed(2) : "";
    return '<div class="cs-sheet-backdrop" role="presentation"><aside class="cs-sheet" role="dialog" aria-modal="true" aria-label="Add agreement or service">'
      + '<div class="cs-sheet-head"><div><h3>Add agreement or service</h3><p>Start with a document when you have one. Confirm only facts it establishes.</p></div>'
      + '<button class="cs-close" type="button" aria-label="Close" title="Close" onclick="psContractedServicesClose()">&times;</button></div>'
      + (state.error ? '<div class="cs-error">' + esc(state.error) + '</div>' : "")
      + evidenceSection()
      + '<div class="cs-form-section"><h4>Service and provider</h4><div class="cs-form-grid">'
      + selectField("service_class", "Service", [["", "Choose service"]].concat(SERVICE_CHOICES), serviceClass)
      + field("service_label", "Custom label", "text", "", { placeholder: "Only when the list does not fit" })
      + selectField("determination", "Delivery model", [
        ["contracted_service_required", "Third-party service required"],
        ["managed_in_house", "Managed in house"],
        ["not_applicable", "Not applicable"],
      ], "contracted_service_required")
      + field("effective_from", "Effective from", "date",
        proposalTerm("commencement_date") || proposalField("named_effective_date"))
      + selectField("provider_id", "Existing provider", providerChoices(), "")
      + field("provider_name", "New provider", "text", proposalField("provider_name"),
        { placeholder: "Legal or trading name shown" })
      + field("engagement_label", "Engagement label", "text", "", { wide: true,
        placeholder: "Optional, such as Main elevator service" })
      + '</div><p class="cs-help">' + esc(state.artifact
        ? "A retained service document must be tied to the provider named by the evidence."
        : "Provider unknown? Leave both provider fields blank to record the required service as an open coverage gap.")
      + '</p></div>'
      + (state.artifact ? '<div class="cs-form-section"><h4>Document authority</h4><div class="cs-form-grid">'
        + selectField("document_kind", "Document kind", [
          ["proposal", "Proposal"], ["agreement", "Agreement"],
          ["statement_of_work", "Statement of work"], ["amendment", "Amendment"],
          ["addendum", "Addendum"], ["renewal_notice", "Renewal notice"],
          ["termination_notice", "Termination notice"], ["invoice", "Invoice"],
          ["accounting_report", "Accounting report"], ["other", "Other"],
        ], documentKind)
        + selectField("execution_state", "Execution state", [
          ["unverified", "Not verified"], ["unsigned", "Unsigned"],
          ["partially_executed", "Partially executed"], ["executed", "Executed"],
        ], executionState)
        + field("document_date", "Document date", "date", proposalField("document_date"))
        + field("named_effective_date", "Named effective date", "date", proposalField("named_effective_date"))
        + '</div><p class="cs-help">A title, filename, folder, or effective date does not establish execution. Inspect the full signature pages.</p></div>'
        + '<div class="cs-form-section"><h4>Term, decision clock, and price</h4><div class="cs-form-grid">'
        + selectField("term_authority", "Term authority", [
          ["offered", "Offered terms"], ["governing", "Governing terms"],
          ["observed", "Observed terms"], ["asserted", "Operator assertion"],
        ], termAuthority)
        + selectField("term_kind", "Term kind", [
          ["unknown", "Not established"], ["fixed", "Fixed term"],
          ["month_to_month", "Month to month"],
          ["continues_until_terminated", "Continues until terminated"],
          ["one_time", "One time"],
        ], proposalTerm("term_kind") || "unknown")
        + field("commencement_date", "Commencement", "date", proposalTerm("commencement_date"))
        + field("initial_end_date", "Initial end", "date", proposalTerm("initial_end_date"))
        + field("commencement_trigger", "Commencement trigger", "text",
          proposalTerm("commencement_trigger"), { wide: true,
            placeholder: "Such as installation and activation of the service" })
        + field("initial_term_months", "Initial term (months)", "number",
          proposalTerm("initial_term_months"))
        + selectField("automatic_renewal", "Automatic renewal", [
          ["", "Not established"], ["true", "Yes, stated"], ["false", "No, stated"],
        ], proposalTerm("automatic_renewal") === true ? "true"
          : proposalTerm("automatic_renewal") === false ? "false" : "")
        + field("renewal_period_months", "Renewal period (months)", "number",
          proposalTerm("renewal_period_months"))
        + field("notice_days", "Notice days", "number", proposalTerm("notice_days"))
        + selectField("price_basis", "Price basis", [
          ["", "No price established"], ["monthly", "Monthly"], ["annual", "Annual"],
          ["per_visit", "Per visit"], ["hourly", "Hourly"], ["per_unit", "Per unit"],
          ["flat", "Flat"], ["variable", "Variable / range"], ["other", "Other"],
        ], proposalPrice("price_basis") || "")
        + field("price_amount", "Amount", "text", priceDollars, { placeholder: "Dollars and cents" })
        + field("price_description", "Price detail", "text", proposalPrice("description"),
          { wide: true, placeholder: "Required when the amount is variable or unknown" })
        + '</div></div>'
        + '<div class="cs-form-section"><h4>Scope</h4><div class="cs-form-grid">'
        + field("scope_summary", "Covered work", "text", ((state.proposal || {}).scope || {}).scope_summary,
          { wide: true })
        + field("frequency_summary", "Frequency", "text", ((state.proposal || {}).scope || {}).frequency_summary,
          { wide: true, placeholder: "Such as quarterly or Monday through Friday" })
        + '</div></div>' : "")
      + '<div class="cs-form-section"><h4>Confirmation basis</h4><div class="cs-form-grid">'
      + '<div class="cs-field is-wide"><label for="cs-provenance">What did you confirm?</label>'
      + '<textarea id="cs-provenance" data-cs-input="provenance_note" placeholder="Name the source and what you verified">'
      + esc(readDraft("provenance_note", "")) + '</textarea></div></div></div>'
      + '<div class="cs-sheet-actions"><button class="cs-btn" type="button" onclick="psContractedServicesClose()">Cancel</button>'
      + '<button class="cs-btn is-primary" type="button" onclick="psContractedServiceConfirm()"'
      + (state.busy ? " disabled" : "") + '>Save confirmed facts</button></div></aside></div>';
  }

  function coverageSheet() {
    return '<div class="cs-sheet-backdrop" role="presentation"><aside class="cs-sheet" role="dialog" aria-modal="true" aria-label="Review service coverage">'
      + '<div class="cs-sheet-head"><div><h3>Review service coverage</h3><p>Record which property services were reviewed. This does not invent required services.</p></div>'
      + '<button class="cs-close" type="button" aria-label="Close" title="Close" onclick="psContractedServicesClose()">&times;</button></div>'
      + (state.error ? '<div class="cs-error">' + esc(state.error) + '</div>' : "")
      + '<div class="cs-form-section"><div class="cs-form-grid">'
      + field("coverage_date", "Reviewed as of", "date", "")
      + '<div class="cs-field is-wide"><label for="cs-coverage-note">Review basis</label>'
      + '<textarea id="cs-coverage-note" data-cs-input="coverage_note" placeholder="What property records and operator knowledge were reviewed?">'
      + esc(readDraft("coverage_note", "")) + '</textarea></div></div></div>'
      + '<div class="cs-sheet-actions"><button class="cs-btn" type="button" onclick="psContractedServicesClose()">Cancel</button>'
      + '<button class="cs-btn is-primary" type="button" onclick="psContractedServiceConfirmCoverage()"'
      + (state.busy ? " disabled" : "") + '>Record review</button></div></aside></div>';
  }

  function html(data) {
    ensureStyle();
    state.data = data || state.data || {};
    var standing = state.data.standing || {};
    var detail = state.data.detail || {};
    var engagements = detail.engagements || [];
    var requirementGaps = (detail.requirements || []).filter(function (row) {
      return row.determination === "contracted_service_required" && row.engagement_count === 0;
    });
    var unmatchedDocuments = detail.unmatched_documents || [];
    var unmatchedFinancial = detail.unmatched_financial_observations || [];
    var reconciliationCount = unmatchedDocuments.length + unmatchedFinancial.length;
    var coverage = standing.coverage_review || {};
    var coverageText = coverage.reviewed_as_of
      ? "Coverage review: completed " + coverage.reviewed_as_of
      : "Coverage review: not completed";
    var governingCount = engagements.filter(function (row) {
      return row.execution_standing === "EXECUTED_GOVERNING";
    }).length;
    var authorityOpenCount = engagements.length - governingCount;
    var decisionCount = engagements.filter(function (row) {
      return ["ATTENTION", "OUTCOME_NOT_ESTABLISHED", "ENDED"].includes(
        (row.term_standing || {}).state
      );
    }).length;
    var headline = engagements.length
      ? engagements.length + " service" + (engagements.length === 1 ? "" : "s")
        + (requirementGaps.length ? " and " + requirementGaps.length + " coverage gap"
          + (requirementGaps.length === 1 ? "" : "s") : "") + " on record"
      : requirementGaps.length
        ? requirementGaps.length + " required service" + (requirementGaps.length === 1 ? "" : "s")
          + " need" + (requirementGaps.length === 1 ? "s" : "") + " a provider"
      : reconciliationCount
        ? "Documents or accounting records need review before a service is confirmed"
        : "No contracted service records yet";
    var empty = !engagements.length && !requirementGaps.length && !reconciliationCount;
    var content = empty
      ? '<section class="cs-empty" data-cs-section="empty"><div class="cs-empty-intro"><span class="cs-empty-kicker">Start here</span>'
        + '<h3>What do you have?</h3><p>Begin with an agreement, proposal, or provider relationship you can confirm. The register will grow from real property evidence.</p></div>'
        + '<div class="cs-start-list"><div class="cs-start-row"><div><b>I have a document or known service</b>'
        + '<span>Add the provider, scope, price, and term facts the source actually establishes.</span></div>'
        + '<button class="cs-btn is-primary" type="button" onclick="psContractedServicesStartService()">Add agreement or service</button></div>'
        + '<div class="cs-start-row"><div><b>I need to check the property</b>'
        + '<span>Record that service coverage was reviewed without inventing a required list.</span></div>'
        + '<button class="cs-btn" type="button" onclick="psContractedServicesStartCoverage()">Review service coverage</button></div></div></section>'
      : (engagements.length ? '<section class="cs-section" data-cs-section="register">'
          + '<div class="cs-section-head"><h3>Services</h3><span class="cs-section-note">Agreement truth and next action</span></div>'
          + '<div class="cs-list-head"><span>Service</span><span>Provider</span><span>Agreement</span><span>Price</span><span></span></div>'
          + '<div class="cs-list">' + engagements.map(serviceRow).join("") + '</div></section>' : "")
        + requirementGapRows(requirementGaps)
        + documentRows(unmatchedDocuments)
        + financialRows(unmatchedFinancial);
    return '<div class="am-room-view cs-shell" data-am-view="compartment" data-am-compartment-open="contracted_services">'
      + '<button class="am-back" type="button" onclick="amOpenRoom(\'property_expenses\')">&larr; Property Expenses</button>'
      + '<div class="cs-head"><div class="cs-title"><h2>Contracted services</h2><p>' + headline + '</p></div>'
      + (empty ? '' : '<div class="cs-actions"><button class="cs-btn" type="button" onclick="psContractedServicesStartCoverage()">Review service coverage</button>'
        + '<button class="cs-btn is-primary" type="button" onclick="psContractedServicesStartService()">Add agreement or service</button></div>') + '</div>'
      + (state.receipt ? '<div class="cs-receipt">' + esc(state.receipt) + '</div>' : "")
      + (engagements.length ? '<div class="cs-truthline"><span><b>' + esc(governingCount)
        + '</b> governing document' + (governingCount === 1 ? '' : 's') + '</span><span><b>'
        + esc(authorityOpenCount) + '</b> need governing authority</span><span><b>'
        + esc(decisionCount) + '</b> term decision' + (decisionCount === 1 ? '' : 's') + ' open</span>'
        + (requirementGaps.length ? '<span><b>' + esc(requirementGaps.length)
          + '</b> service' + (requirementGaps.length === 1 ? '' : 's') + ' missing a provider</span>' : '')
        + '</div>' : requirementGaps.length ? '<div class="cs-truthline"><span><b>'
          + esc(requirementGaps.length) + '</b> service' + (requirementGaps.length === 1 ? '' : 's')
          + ' missing a provider</span></div>' : '')
      + '<div class="cs-coverage">' + esc(coverageText) + '</div>'
      + content + (state.mode === "service" ? serviceSheet()
        : state.mode === "coverage" ? coverageSheet() : "") + '</div>';
  }

  function rerender() {
    var root = document.querySelector('[data-am-compartment-open="contracted_services"]');
    if (root && root.parentNode && state.data) root.parentNode.innerHTML = html(state.data);
  }

  function captureDraft() {
    var root = document.querySelector('[data-am-compartment-open="contracted_services"]');
    if (!root) return;
    state.draft = {};
    root.querySelectorAll("[data-cs-input]").forEach(function (element) {
      if (element.type !== "file") state.draft[element.dataset.csInput] = element.value;
    });
  }

  function read(name) {
    var root = document.querySelector('[data-am-compartment-open="contracted_services"]');
    var element = root && root.querySelector('[data-cs-input="' + name + '"]');
    return element ? String(element.value || "").trim() : "";
  }

  function cents(value) {
    var text = String(value || "").replace(/[$,\s]/g, "");
    if (!text) return null;
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return NaN;
    return Math.round(Number(text) * 100);
  }

  function nullableInteger(value) {
    if (!String(value || "").trim()) return null;
    var number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : NaN;
  }

  function startService(serviceClass) {
    state.mode = "service"; state.error = null; state.receipt = null;
    state.artifact = null; state.proposal = null;
    state.draft = serviceClass ? {
      service_class: serviceClass, determination: "contracted_service_required",
    } : null;
    rerender();
  }

  function startCoverage() {
    state.mode = "coverage"; state.error = null; state.receipt = null; state.draft = null;
    rerender();
  }

  function close() {
    state.mode = null; state.busy = false; state.error = null;
    state.artifact = null; state.proposal = null; state.draft = null;
    rerender();
  }

  async function uploadEvidence() {
    if (state.busy) return;
    var root = document.querySelector('[data-am-compartment-open="contracted_services"]');
    var input = root && root.querySelector('[data-cs-input="evidence_file"]');
    var file = input && input.files && input.files[0];
    if (!file) { state.error = "Choose the service document."; rerender(); return; }
    var artifactKind = read("artifact_kind");
    state.busy = true; state.error = null; rerender();
    try {
      var response = await window.__psLive.assetManagementContractedServiceEvidence({
        file: file, artifact_kind: artifactKind,
      });
      var result = (response && response.data) || response || {};
      state.artifact = result.artifact || { filename: file.name, artifact_kind: artifactKind };
      state.proposal = result.proposal || null;
      state.busy = false; state.draft = null; rerender();
    } catch (error) {
      state.busy = false;
      state.error = (error && error.body && error.body.receipt) || (error && error.message)
        || "The service document was not retained.";
      rerender();
    }
  }

  async function confirmService() {
    if (state.busy) return;
    captureDraft();
    var serviceClass = readDraft("service_class");
    var determination = readDraft("determination");
    var effectiveFrom = readDraft("effective_from");
    var provenance = readDraft("provenance_note");
    if (!serviceClass || !determination || !effectiveFrom || !provenance) {
      state.error = "Choose the service, delivery model, effective date, and confirmation basis.";
      rerender(); return;
    }
    var providerId = readDraft("provider_id");
    var providerName = readDraft("provider_name");
    var hasProvider = !!(providerId || providerName);
    if (determination === "contracted_service_required" && !hasProvider
        && (state.artifact || readDraft("engagement_label"))) {
      state.error = state.artifact
        ? "Select or name the provider shown by the retained service document."
        : "Name a provider before recording an engagement label.";
      rerender(); return;
    }
    if (determination !== "contracted_service_required"
        && (providerId || providerName || state.artifact)) {
      state.error = "An in-house or not-applicable service cannot carry a contractor or service document.";
      rerender(); return;
    }
    var body = {
      source_artifact_id: state.artifact && state.artifact.id,
      provenance_note: provenance,
      requirement: {
        service_class: serviceClass,
        service_label: readDraft("service_label") || null,
        determination: determination,
        effective_from: effectiveFrom,
        basis: provenance,
      },
    };
    if (determination === "contracted_service_required" && hasProvider) {
      if (providerName) body.provider = { provider_name: providerName };
      else body.provider_id = providerId;
      body.engagement = {
        service_class: serviceClass,
        service_label: readDraft("service_label") || null,
        engagement_label: readDraft("engagement_label") || null,
        effective_from: effectiveFrom,
      };
    }

    if (state.artifact) {
      var documentKind = readDraft("document_kind");
      var executionState = readDraft("execution_state");
      var termAuthority = readDraft("term_authority");
      var termKind = readDraft("term_kind");
      var initialTermMonths = nullableInteger(readDraft("initial_term_months"));
      var renewalMonths = nullableInteger(readDraft("renewal_period_months"));
      var noticeDays = nullableInteger(readDraft("notice_days"));
      var amountCents = cents(readDraft("price_amount"));
      var priceBasis = readDraft("price_basis");
      if (Number.isNaN(initialTermMonths) || Number.isNaN(renewalMonths)
          || Number.isNaN(noticeDays) || Number.isNaN(amountCents)) {
        state.error = "Enter term, renewal, notice, and price values as non-negative numbers.";
        rerender(); return;
      }
      if (initialTermMonths === 0 || renewalMonths === 0) {
        state.error = "Term and renewal durations must be positive month counts.";
        rerender(); return;
      }
      if (termAuthority === "governing"
          && (executionState !== "executed"
            || !["agreement", "statement_of_work", "amendment", "addendum"].includes(documentKind))) {
        state.error = "Governing terms require a complete executed agreement, statement of work, amendment, or addendum.";
        rerender(); return;
      }
      var hasCalendarTerm = !!(readDraft("commencement_date") && readDraft("initial_end_date"));
      if (hasCalendarTerm && !readDraft("commencement_trigger")) initialTermMonths = null;
      var hasEventTerm = !!(readDraft("commencement_trigger") && initialTermMonths);
      if (termKind === "fixed" && !hasCalendarTerm && !hasEventTerm) {
        state.error = "A fixed term needs calendar dates or a commencement trigger and initial duration.";
        rerender(); return;
      }
      if (!!readDraft("commencement_trigger") !== !!initialTermMonths) {
        state.error = "An event-anchored term needs both its commencement trigger and initial duration.";
        rerender(); return;
      }
      if (readDraft("automatic_renewal") === "true" && !renewalMonths) {
        state.error = "Record the stated renewal period for an automatic renewal clause.";
        rerender(); return;
      }
      body.document = {
        source_artifact_id: state.artifact.id,
        document_kind: documentKind,
        execution_state: executionState,
        document_date: readDraft("document_date") || null,
        named_effective_date: readDraft("named_effective_date") || null,
        filename: state.artifact.filename || null,
      };
      var hasTermFact = !!(readDraft("commencement_date") || readDraft("initial_end_date")
        || readDraft("commencement_trigger") || initialTermMonths !== null
        || termKind !== "unknown" || readDraft("automatic_renewal")
        || renewalMonths !== null || noticeDays !== null || priceBasis);
      if (hasTermFact) {
        body.term = {
          term_authority: termAuthority,
          commencement_date: readDraft("commencement_date") || null,
          commencement_trigger: readDraft("commencement_trigger") || null,
          initial_end_date: readDraft("initial_end_date") || null,
          initial_term_months: initialTermMonths,
          term_kind: termKind,
          automatic_renewal: readDraft("automatic_renewal") === ""
            ? null : readDraft("automatic_renewal") === "true",
          renewal_period_months: renewalMonths,
          notice_days: noticeDays,
        };
      }
      if (readDraft("scope_summary")) {
        body.scope = { scope_summary: readDraft("scope_summary"),
          frequency_summary: readDraft("frequency_summary") || null,
          effective_from: effectiveFrom };
      }
      if (priceBasis) {
        if (priceBasis !== "variable" && amountCents == null) {
          state.error = "A stated non-variable price needs its amount."; rerender(); return;
        }
        if (priceBasis === "variable" && !readDraft("price_description")) {
          state.error = "Describe the variable or range pricing shown in the document.";
          rerender(); return;
        }
        body.price_components = [{
          price_basis: priceBasis, amount_cents: amountCents,
          description: readDraft("price_description") || null, currency_code: "USD",
        }];
      }
    }

    state.busy = true; state.error = null; rerender();
    try {
      var response = await window.__psLive.assetManagementContractedServiceConfirm(body);
      var result = (response && response.data) || response || {};
      state.mode = null; state.busy = false; state.artifact = null;
      state.proposal = null; state.draft = null;
      state.receipt = result.receipt || "Contracted service facts recorded.";
      window.amOpenCompartment("contracted_services");
    } catch (error) {
      state.busy = false;
      state.error = (error && error.body && error.body.receipt) || (error && error.message)
        || "The contracted service facts were not recorded.";
      rerender();
    }
  }

  async function confirmCoverage() {
    if (state.busy) return;
    captureDraft();
    if (!readDraft("coverage_date") || !readDraft("coverage_note")) {
      state.error = "Record the review date and what property information was reviewed.";
      rerender(); return;
    }
    state.busy = true; state.error = null; rerender();
    try {
      var response = await window.__psLive.assetManagementContractedServiceCoverageReview({
        reviewed_as_of: readDraft("coverage_date"),
        provenance_note: readDraft("coverage_note"),
      });
      var result = (response && response.data) || response || {};
      state.mode = null; state.busy = false; state.draft = null;
      state.receipt = result.receipt || "Property service coverage review recorded.";
      window.amOpenCompartment("contracted_services");
    } catch (error) {
      state.busy = false;
      state.error = (error && error.body && error.body.receipt) || (error && error.message)
        || "The coverage review was not recorded.";
      rerender();
    }
  }

  function openEvidence(id) {
    if (window.__psLive
        && typeof window.__psLive.assetManagementContractedServiceEvidenceOpen === "function") {
      window.__psLive.assetManagementContractedServiceEvidenceOpen({ artifactId: id })
        .catch(function (error) {
          state.error = (error && error.message) || "The retained evidence could not be opened.";
          rerender();
        });
    }
  }

  window.psContractedServicesStartService = startService;
  window.psContractedServicesStartCoverage = startCoverage;
  window.psContractedServicesClose = close;
  window.psContractedServiceUploadEvidence = uploadEvidence;
  window.psContractedServiceConfirm = confirmService;
  window.psContractedServiceConfirmCoverage = confirmCoverage;
  window.psContractedServiceOpenEvidence = openEvidence;
  window.__psContractedServicesDoor = {
    render: html, startService: startService, startCoverage: startCoverage,
  };
})();
