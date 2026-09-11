# Conversation ownership presentation

App baseline b00cf4993e4f699cd174a7ef5c8a27ca4b5507c4. The current signed-in Person Rail and legacy supervision strip derived "You are handling" from human_takeover mode. Render first red reproduced the same personal ownership claim for two different staff viewers without any owner record.

The app now reads human_owner from the canonical conversation detail. Active open/in_progress obligation identity and user identity are required. Only a match against the bound staff session's user_id displays You. Other viewers see the recorded staff name (or Assigned staff member if unnamed). Missing or completed ownership remains Owner not recorded. Mode continues to select staff/AI controls; it never grants identity. Queue/group copy stays Staff handling where the queue supplies no canonical owner.

This is compatible with the existing API: absent human_owner produces honest unknown. The companion API lane supplies {obligation_id,user_id,name,status} from the existing obligation owner. The browser creates no ownership and never derives it from the last sender or the editable User ID field.

Validation: conversation_owner_wording.test.js executes the actual extracted render functions for two viewers, named ownership, completed work, missing bound viewer, AI and closed states. First red observed before correction. conversations_board_app.test.js passed17/17; inline script parse checked. Actual two-session HTTP/browser proof is owned by QB and the API lane, not claimed by this receipt.

Earlier reply flag review: sendTourMessage/personCommsSend set a local sent flag after a successful response, even sent:false. API recordOutboundText saves comm_event before provider gating and returns not-delivered receipt/status. Those composers warn, clear and reload the recorded event; the flag alone is not evidence of false delivery. Signed-in Person Rail uses pcSendLiveReply, with explicit not-delivered notice. Legacy tour send errors still collapse to generic endpoint-pending wording; that separate limitation was reported, not expanded into this owner fix.
