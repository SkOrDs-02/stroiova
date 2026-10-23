// Згенеровано tools/gen_analytics.mjs з analytics/tracking-plan.yaml. Руками не правити: node tools/gen_analytics.mjs.

export const PLAN_VERSION = 3;

export type PropType = 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array<string>' | 'date';
export interface PropDef {
  type: PropType;
  required: boolean;
  enum?: readonly string[];
}
export type Sampling = 'all' | 'econ_detail';
export interface EventDef {
  sampling: Sampling;
  props: Readonly<Record<string, PropDef>>;
}

export interface GlobalProps {
  economy_config_version: string;
  economy_config_source: "bundled" | "remote" | "cached";
  content_version: string;
  save_schema_version: number;
  analytics_plan_version: number;
  game_session_id: string;
  session_number: number;
  playtime_sec: number;
  days_since_install: number;
  level_id: "batalion" | "bryhada" | "komanduvannia" | "henshtab" | "bez_paperu";
  dub_number: number;
  is_finale_done: boolean;
  awards_owned: number;
  digitization_count: number;
  has_no_ads: boolean;
  is_payer: boolean;
  is_econ_detail_sampled: boolean;
  build_channel: "development" | "preview" | "production";
  is_test_user: boolean;
}

export const GLOBAL_PROPS: Readonly<Record<keyof GlobalProps, PropDef>> = {
  economy_config_version: { type: "string", required: true },
  economy_config_source: { type: "string", required: true, enum: ["bundled", "remote", "cached"] },
  content_version: { type: "string", required: true },
  save_schema_version: { type: "integer", required: true },
  analytics_plan_version: { type: "integer", required: true },
  game_session_id: { type: "string", required: true },
  session_number: { type: "integer", required: true },
  playtime_sec: { type: "integer", required: true },
  days_since_install: { type: "integer", required: true },
  level_id: { type: "string", required: true, enum: ["batalion", "bryhada", "komanduvannia", "henshtab", "bez_paperu"] },
  dub_number: { type: "integer", required: true },
  is_finale_done: { type: "boolean", required: true },
  awards_owned: { type: "integer", required: true },
  digitization_count: { type: "integer", required: true },
  has_no_ads: { type: "boolean", required: true },
  is_payer: { type: "boolean", required: true },
  is_econ_detail_sampled: { type: "boolean", required: true },
  build_channel: { type: "string", required: true, enum: ["development", "preview", "production"] },
  is_test_user: { type: "boolean", required: true },
};

export interface UserProps {
  install_date?: string;
  install_week?: string;
  install_app_version?: string;
  install_economy_config_version?: string;
  install_build_channel?: "development" | "preview" | "production";
  first_device_region?: string;
  callsign_type?: "excel" | "skrepka" | "drukar" | "custom";
  protagonist_gender?: "m" | "f";
  is_onboarding_complete?: boolean;
  onboarding_last_step_index?: number;
  current_level_id?: "batalion" | "bryhada" | "komanduvannia" | "henshtab" | "bez_paperu";
  digitization_count?: number;
  digital_points_total?: number;
  prestige_multiplier?: number;
  reputation_tier?: "low" | "normal" | "high";
  museum_journals_count?: number;
  has_no_ads?: boolean;
  has_extended_storage?: boolean;
  has_starter_pack?: boolean;
  is_payer?: boolean;
  purchases_count?: number;
  first_purchase_date?: string;
  first_purchase_product_id?: "no_ads" | "starter_pack" | "storage_24h";
  ads_completed_total?: number;
  push_permission?: "granted" | "denied" | "provisional" | "not_asked";
  ads_consent_status?: "obtained" | "required" | "not_required" | "unknown";
  is_ads_regulated_region?: boolean;
  economy_config_version?: string;
  is_econ_detail_sampled?: boolean;
  is_test_user?: boolean;
}

/** Які властивості користувача ставляться один раз (`set_once`) */
export const USER_PROPS_ONCE: readonly (keyof UserProps)[] = ["install_date", "install_week", "install_app_version", "install_economy_config_version", "install_build_channel", "first_device_region", "first_purchase_date", "first_purchase_product_id"];

export interface EventProps {
  app_first_open: {
    device_region: string;
    device_locale: string;
    is_reinstall?: boolean;
  };
  session_start: {
    is_cold_start: boolean;
    sec_since_last_session?: number;
    local_hour: number;
    entry_point: "icon" | "push" | "other";
    is_clock_skew_detected: boolean;
  };
  session_end: {
    duration_sec: number;
    segment_count: number;
    taps_count: number;
    cat_taps_count: number;
    tap_signatures_share_pct: number;
    signatures_earned_log10: number;
    signatures_balance_log10: number;
    income_per_min_log10: number;
    idle_income_per_min_log10: number;
    purchases_count: number;
    levels_bought: number;
    clerks_hired_count: number;
    bottleneck_id: "streams" | "kombat" | "stroy" | "fin" | "kazna" | "narada" | "dopovid";
    next_purchase_eta_sec: number;
    digital_points_available: number;
    levels: Record<string, unknown>;
    paper_empty_sec: number;
    fuel_bonus_sec: number;
    zpz_share_pct?: number;
    stack_cm?: number;
  };
  force_update_show: {
    reason: "min_version" | "newer_save";
    installed_version: string;
    required_version: string;
    is_from_cache: boolean;
  };
  onboarding_step_complete: {
    step_id: "title_arrive" | "intro_finish" | "callsign_choose" | "first_act_sign" | "first_stamp" | "conveyor_first_upgrade" | "first_clerk_hire" | "first_telegram_answer" | "archaeologist_call" | "first_ad_offer" | "push_prompt";
    step_index: number;
    sec_since_first_open: number;
    step_duration_sec: number;
    is_skipped: boolean;
    protagonist_gender?: "m" | "f";
    bonus_signatures_log10?: number;
  };
  stream_unlock: {
    stream_id: "raporty" | "akty" | "dovidky" | "nakladni" | "nakazy" | "zvedennia" | "zpz";
    unlock_index: number;
    cost_log10: number;
    sec_since_cycle_start: number;
    is_all_streams_open: boolean;
  };
  upgrade_purchase: {
    target_type: "stream" | "stage";
    target_id: "raporty" | "akty" | "dovidky" | "nakladni" | "nakazy" | "zvedennia" | "zpz" | "kombat" | "stroy" | "fin" | "kazna" | "narada" | "dopovid";
    level_from: number;
    level_to: number;
    levels_bought: number;
    buy_mode: "x1" | "x10" | "to_milestone";
    cost_log10: number;
    was_bottleneck: boolean;
    income_before_log10: number;
    income_after_log10: number;
  };
  clerk_hire: {
    target_type: "stream" | "stage";
    target_id: "raporty" | "akty" | "dovidky" | "nakladni" | "nakazy" | "zvedennia" | "zpz" | "kombat" | "stroy" | "fin" | "kazna" | "narada" | "dopovid";
    cost_log10: number;
    is_first_clerk: boolean;
    clerks_count_after: number;
    sec_since_cycle_start: number;
  };
  milestone_reach: {
    target_type: "stream" | "stage";
    target_id: "raporty" | "akty" | "dovidky" | "nakladni" | "nakazy" | "zvedennia" | "zpz" | "kombat" | "stroy" | "fin" | "kazna" | "narada" | "dopovid";
    level: number;
    rate_multiplier: number;
    sec_since_cycle_start: number;
  };
  offline_income_claim: {
    away_sec: number;
    storage_cap_sec: number;
    capped_sec: number;
    earned_log10: number;
    is_doubled: boolean;
    double_source: "ad" | "no_ads_pass" | "none";
    claimed_log10: number;
    offline_doubles_today: number;
    clerks_count: number;
    gifts_written_off: number;
    fuel_bonus_sec: number;
  };
  generator_refuel: {
    tank_pct_before: number;
    tank_capacity_sec: number;
    bonus_off_sec: number;
  };
  telegram_receive: {
    telegram_id: string;
    is_first_telegram: boolean;
    delivery: "live" | "while_away";
    is_scripted: boolean;
    is_repeat: boolean;
    inbox_unread_after: number;
  };
  telegram_open: {
    telegram_id: string;
    sec_since_received: number;
    source: "inbox" | "banner" | "push";
  };
  telegram_choice_submit: {
    telegram_id: string;
    choice_id: string;
    choice_kind: "diligent" | "formal_reply" | "drawer" | "special";
    slowdown_target_id?: "raporty" | "akty" | "dovidky" | "nakladni" | "nakazy" | "zvedennia" | "zpz" | "kombat" | "stroy" | "fin" | "kazna" | "narada" | "dopovid";
    slowdown_mult: number;
    slowdown_sec: number;
    reputation_delta: number;
    reputation_after: number;
    inspection_chance_pct: number;
    paper_spent: number;
    sec_since_open: number;
    pack_id?: string;
    is_pack_summary?: boolean;
  };
  telegram_flag: {
    telegram_id: string;
    is_after_choice: boolean;
    reason: "hurts_people" | "untrue" | "offensive" | "not_funny" | "none";
    has_comment: boolean;
  };
  curio_entry_share: {
    entry_type: "telegram" | "gift_written_off" | "journal" | "pack" | "stack_meter" | "finale_card" | "personal_record" | "ptashka" | "award";
    entry_id: string;
    gift_type?: "drone" | "shovel" | "generator";
    share_result: "shared" | "dismissed";
    activity_type?: string;
  };
  inspection_start: {
    inspection_id: string;
    inspection_number: number;
    boss_id: "brigade_commission" | "command_commission" | "capital_commission" | "total_audit" | "digital_commission";
    trigger: "scheduled" | "unscheduled";
    warning_sec: number;
    reputation: number;
    items_total: number;
    inspection_kind: "regular" | "final";
    attempt_number?: number;
  };
  inspection_item_complete: {
    inspection_id: string;
    item_id: "paint_borders" | "lockers_cleanup" | "stove_open" | "font_check" | "journals_stitch" | "sergeants_count" | "dust_glove" | "corridor_tape" | "sign_rehang" | "orders_stitch" | "where_journal" | "kazna_kopiyka" | "nakazy_open" | "minutes_stitch" | "door_plates" | "carafe_full" | "kettles_hide" | "summary_check" | "summary_beats" | "slides_number" | "stack_meter" | "report_prep" | "brief_onepage" | "audit_acts" | "zpz_level" | "print_ejournal" | "laptop_glove" | "dashboard_font" | "act_kep";
    method: "signatures" | "ad" | "no_ads_pass" | "condition";
    cost_log10?: number;
    sec_to_deadline: number;
  };
  inspection_finish: {
    inspection_id: string;
    result: "passed" | "failed";
    items_done: number;
    items_total: number;
    is_completed_via_ad: boolean;
    is_resolved_offline: boolean;
    sec_from_start: number;
    inspection_kind: "regular" | "final";
    is_mechanic_item_done?: boolean;
    is_level_exit_unlocked?: boolean;
    zpz_share_pct?: number;
    is_without_remarks: boolean;
    level_id: "batalion" | "bryhada" | "komanduvannia" | "henshtab" | "bez_paperu";
  };
  race_start: {
    race_id: string;
    gift_type: "drone" | "shovel" | "generator";
    doc_sec_required: number;
    resource_sec_left: number;
    is_winnable_without_speedup: boolean;
  };
  race_speedup_apply: {
    race_id: string;
    method: "digital_bonus" | "ad" | "no_ads_pass";
    sec_saved: number;
    speedups_count_after: number;
  };
  race_finish: {
    race_id: string;
    result: "success" | "fail";
    margin_sec: number;
    speedups_count: number;
    is_ad_used: boolean;
    is_resolved_offline: boolean;
    gift_type: "drone" | "shovel" | "generator";
    level_id: "batalion" | "bryhada" | "komanduvannia" | "henshtab" | "bez_paperu";
  };
  random_event_resolve: {
    event_type: "kombat_missing" | "order_cancels_order" | "meeting_overrun" | "brief_onepage" | "sedo_failure";
    choice: "wait" | "send_runner" | "redo_documents" | "cite_digital" | "expired" | "send_note" | "rewrite" | "formal_reply" | "print";
    sec_to_resolve: number;
    slowdown_sec: number;
  };
  reputation_tier_change: {
    from_tier: "low" | "normal" | "high";
    to_tier: "low" | "normal" | "high";
    reputation: number;
    source: "telegram" | "random_event";
  };
  digitization_hint_show: {
    next_purchase_eta_sec: number;
    points_available: number;
    points_total: number;
    is_first_digitization: boolean;
    sec_since_cycle_start: number;
  };
  digitization_screen_open: {
    source: "hint" | "tab";
    points_available: number;
    is_eligible: boolean;
    multiplier_after: number;
  };
  digitization_complete: {
    digitization_number: number;
    points_gained: number;
    points_total: number;
    prestige_multiplier: number;
    lifetime_signatures_log10: number;
    sec_since_cycle_start: number;
    sec_since_install: number;
    journals_cancelled: number;
    is_from_hint: boolean;
    digital_stages_count?: number;
    cycle_sec_previous?: number;
  };
  level_advance: {
    from_level_id: "batalion" | "bryhada" | "komanduvannia" | "henshtab";
    to_level_id: "bryhada" | "komanduvannia" | "henshtab" | "bez_paperu";
    digitization_count: number;
    points_total: number;
    sec_since_install: number;
    final_attempts?: number;
  };
  museum_journal_unlock: {
    journal_id: string;
    rarity: "common" | "rare" | "legendary";
    source: "digitization" | "telegram" | "inspection" | "random_event" | "final_inspection" | "conversion" | "story" | "finale";
    journals_owned_after: number;
    is_series_complete: boolean;
    series_id: "battalion_property" | "personnel" | "transport_storage" | "household" | "land";
    series_owned_after: number;
    series_complete_count: number;
  };
  museum_open: {
    source: "tab" | "unlock_toast" | "award_toast" | "profile";
    journals_owned: number;
    journals_unseen: number;
    segment: "journals" | "curios" | "awards";
  };
  boost_activate: {
    boost_type: "income_x2" | "inspection_x3" | "drone_x2" | "shovels_x1_5" | "generator_fuel_hold";
    source: "ad" | "no_ads_pass" | "inspection" | "race" | "onboarding";
    multiplier: number;
    duration_sec: number;
    stacked_remaining_sec: number;
    is_capped: boolean;
  };
  ad_offer_show: {
    placement: "income_boost" | "offline_double" | "race_speedup" | "inspection_checklist";
    ad_flow_id: string;
    is_no_ads_claim: boolean;
    is_ad_ready: boolean;
    entry_point?: "boosts_sheet" | "shop" | "ad_offer_first";
    uses_today: number;
    daily_limit: number;
  };
  ad_start: {
    placement: "income_boost" | "offline_double" | "race_speedup" | "inspection_checklist";
    ad_flow_id: string;
    load_wait_ms: number;
  };
  ad_complete: {
    placement: "income_boost" | "offline_double" | "race_speedup" | "inspection_checklist";
    ad_flow_id: string;
    watch_ms: number;
    ad_value_micros?: number;
    ad_value_currency?: string;
    ad_value_precision?: "estimated" | "publisher_provided" | "precise" | "unknown";
  };
  ad_fail: {
    placement: "income_boost" | "offline_double" | "race_speedup" | "inspection_checklist";
    ad_flow_id: string;
    stage: "not_ready" | "load" | "show" | "closed_early" | "consent_blocked";
    error_code?: string;
    error_domain?: string;
  };
  ad_reward_grant: {
    placement: "income_boost" | "offline_double" | "race_speedup" | "inspection_checklist";
    ad_flow_id: string;
    is_no_ads_claim: boolean;
    reward_unit: "boost_sec" | "signatures_log10" | "race_sec" | "checklist_items";
    reward_amount: number;
  };
  ads_consent_update: {
    trigger: "first_ad_watch" | "app_launch" | "privacy_settings";
    consent_status: "obtained" | "required" | "not_required" | "unknown";
    is_form_shown: boolean;
    is_ads_request_allowed: boolean;
    is_privacy_options_required: boolean;
  };
  shop_view: {
    source: "tab" | "offline_storage_link" | "starter_pack_card" | "starter_offer" | "ad_limit_reached" | "boost_card";
    is_starter_pack_available: boolean;
  };
  purchase_start: {
    product_id: "no_ads" | "starter_pack" | "storage_24h";
    price: number;
    currency: string;
    source: "tab" | "offline_storage_link" | "starter_pack_card" | "starter_offer" | "ad_limit_reached" | "boost_card";
  };
  purchase_complete: {
    product_id: "no_ads" | "starter_pack" | "storage_24h";
    price: number;
    currency: string;
    source: "tab" | "offline_storage_link" | "starter_pack_card" | "starter_offer" | "ad_limit_reached" | "boost_card";
    is_first_purchase: boolean;
    purchase_number: number;
    sec_since_install: number;
    store: "app_store" | "play_store";
  };
  purchase_fail: {
    product_id: "no_ads" | "starter_pack" | "storage_24h";
    price: number;
    currency: string;
    reason: "user_cancelled" | "payment_pending" | "store_problem" | "network" | "product_unavailable" | "already_owned" | "not_allowed" | "unknown";
    error_code?: string;
  };
  purchase_restore: {
    trigger: "shop_button" | "settings_button" | "auto_check";
    is_success: boolean;
    restored_product_ids: string[];
    error_code?: string;
  };
  push_permission_request: {
    trigger: "onboarding_session_end" | "settings" | "storage_full_hint";
    pre_prompt_result: "accepted" | "declined";
    os_result: "granted" | "denied" | "provisional" | "not_shown";
  };
  push_open: {
    push_type: "storage_full" | "telegram_new" | "inspection" | "inspection_passed" | "race_reminder" | "race_won" | "boost_end" | "fuel_bonus_end" | "kombat_found" | "gift_arrived";
    delay_sec: number;
  };
  setting_change: {
    setting_name: "sound" | "haptics" | "notif_storage" | "notif_telegrams" | "notif_inspections" | "notif_gifts" | "notif_boosts" | "analytics" | "ads_privacy_options" | "progress_reset" | "platform_awards";
    new_value: string;
  };
  app_error_log: {
    source: "save_load" | "save_write" | "save_migration" | "economy_config" | "admob" | "ump" | "revenuecat" | "notifications" | "expo_updates" | "share_render" | "platform_awards";
    error_code: string;
    is_recovered: boolean;
    recovery: "backup_slot" | "defaults" | "retry" | "none";
    message_short?: string;
    save_schema_from?: number;
    save_schema_to?: number;
  };
  telegram_pack_receive: {
    pack_id: string;
    pack_number: number;
    is_repeat: boolean;
    delivery: "live" | "while_away";
  };
  telegram_pack_resolve: {
    pack_id: string;
    mode: "summary" | "separate" | "mixed";
    choice_kind?: "diligent" | "formal_reply" | "drawer";
    paper_spent: number;
    reputation_delta: number;
    inspection_chance_pct: number;
    is_beats: boolean;
    sec_since_received: number;
  };
  stack_meter_reach: {
    zpz_share_pct: number;
    zpz_level: number;
    sec_since_session_start: number;
    offline_share_pct: number;
  };
  move_finish: {
    boxes_stacked: number;
    boxes_total: number;
    paper_lost: number;
    is_skipped: boolean;
  };
  stage_convert: {
    stage_id: "kombat" | "stroy" | "fin" | "kazna" | "narada" | "dopovid";
    convert_index: number;
    cost_log10: number;
    digitizations_on_level: number;
    sec_since_level_start: number;
    sec_since_available: number;
  };
  finale_step_complete: {
    step_id: "order" | "script" | "last_book" | "call" | "credits" | "quiet" | "endless_offer";
    step_index: number;
    sec_since_finale_start: number;
    is_resumed: boolean;
    declined_count?: number;
  };
  dub_start: {
    dub_number: number;
    modifier_id: "two_copies" | "wet_seal" | "no_did";
    points_total: number;
    sec_since_finale: number;
    sec_since_offer: number;
  };
  personal_record_update: {
    record_type: "dub" | "lifetime_signatures";
    value: number;
    previous_value: number;
  };
  story_beat_deliver: {
    beat_id: string;
    arc: "who_writes" | "archaeologist" | "ptashka" | "kombat_leave" | "cat" | "tumbochkin" | "transition" | "finale";
    carrier: "telegram" | "note" | "call" | "event_toast" | "curio" | "scene" | "archive_sheet" | "share_card" | "insp_act_line" | "credits_line" | "character_state";
    beat_order: number;
    delay_sec: number;
    is_catch_up: boolean;
    is_while_away: boolean;
  };
  archive_sheet_unlock: {
    sheet_id: string;
    sheet_number: number;
    source: "gift" | "move" | "boss" | "conversion" | "catch_up";
    sheets_owned_after: number;
  };
  archive_open: {
    source: "museum" | "call" | "toast";
    sheets_owned: number;
  };
  diary_open: {
    lines_owned: number;
    lines_unseen: number;
  };
  award_unlock: {
    award_id: string;
    award_category: "progress" | "telegrams" | "inspections" | "race" | "museum" | "curios" | "cat" | "clerks" | "hidden";
    award_type: "gramota" | "podyaka" | "nakaz";
    is_hidden: boolean;
    awards_owned_after: number;
    is_retroactive: boolean;
    is_resolved_offline: boolean;
    is_mirrored: boolean;
    sec_since_install: number;
  };
  awards_wall_open: {
    source: "segment" | "award_toast" | "profile";
    awards_owned: number;
    awards_unseen: number;
  };
  award_platform_sync: {
    platform: "game_center" | "play_games";
    result: "synced" | "not_signed_in" | "sign_in_cancelled" | "disabled" | "error";
    reported_count: number;
    pending_count: number;
    is_first_sign_in: boolean;
  };
}

export type EventName = keyof EventProps;

export const EVENTS: Readonly<Record<EventName, EventDef>> = {
  app_first_open: {
    sampling: "all",
    props: {
      device_region: { type: "string", required: true },
      device_locale: { type: "string", required: true },
      is_reinstall: { type: "boolean", required: false },
    },
  },
  session_start: {
    sampling: "all",
    props: {
      is_cold_start: { type: "boolean", required: true },
      sec_since_last_session: { type: "integer", required: false },
      local_hour: { type: "integer", required: true },
      entry_point: { type: "string", required: true, enum: ["icon", "push", "other"] },
      is_clock_skew_detected: { type: "boolean", required: true },
    },
  },
  session_end: {
    sampling: "all",
    props: {
      duration_sec: { type: "integer", required: true },
      segment_count: { type: "integer", required: true },
      taps_count: { type: "integer", required: true },
      cat_taps_count: { type: "integer", required: true },
      tap_signatures_share_pct: { type: "number", required: true },
      signatures_earned_log10: { type: "number", required: true },
      signatures_balance_log10: { type: "number", required: true },
      income_per_min_log10: { type: "number", required: true },
      idle_income_per_min_log10: { type: "number", required: true },
      purchases_count: { type: "integer", required: true },
      levels_bought: { type: "integer", required: true },
      clerks_hired_count: { type: "integer", required: true },
      bottleneck_id: { type: "string", required: true, enum: ["streams", "kombat", "stroy", "fin", "kazna", "narada", "dopovid"] },
      next_purchase_eta_sec: { type: "integer", required: true },
      digital_points_available: { type: "integer", required: true },
      levels: { type: "object", required: true },
      paper_empty_sec: { type: "integer", required: true },
      fuel_bonus_sec: { type: "integer", required: true },
      zpz_share_pct: { type: "number", required: false },
      stack_cm: { type: "integer", required: false },
    },
  },
  force_update_show: {
    sampling: "all",
    props: {
      reason: { type: "string", required: true, enum: ["min_version", "newer_save"] },
      installed_version: { type: "string", required: true },
      required_version: { type: "string", required: true },
      is_from_cache: { type: "boolean", required: true },
    },
  },
  onboarding_step_complete: {
    sampling: "all",
    props: {
      step_id: { type: "string", required: true, enum: ["title_arrive", "intro_finish", "callsign_choose", "first_act_sign", "first_stamp", "conveyor_first_upgrade", "first_clerk_hire", "first_telegram_answer", "archaeologist_call", "first_ad_offer", "push_prompt"] },
      step_index: { type: "integer", required: true },
      sec_since_first_open: { type: "integer", required: true },
      step_duration_sec: { type: "integer", required: true },
      is_skipped: { type: "boolean", required: true },
      protagonist_gender: { type: "string", required: false, enum: ["m", "f"] },
      bonus_signatures_log10: { type: "number", required: false },
    },
  },
  stream_unlock: {
    sampling: "all",
    props: {
      stream_id: { type: "string", required: true, enum: ["raporty", "akty", "dovidky", "nakladni", "nakazy", "zvedennia", "zpz"] },
      unlock_index: { type: "integer", required: true },
      cost_log10: { type: "number", required: true },
      sec_since_cycle_start: { type: "integer", required: true },
      is_all_streams_open: { type: "boolean", required: true },
    },
  },
  upgrade_purchase: {
    sampling: "econ_detail",
    props: {
      target_type: { type: "string", required: true, enum: ["stream", "stage"] },
      target_id: { type: "string", required: true, enum: ["raporty", "akty", "dovidky", "nakladni", "nakazy", "zvedennia", "zpz", "kombat", "stroy", "fin", "kazna", "narada", "dopovid"] },
      level_from: { type: "integer", required: true },
      level_to: { type: "integer", required: true },
      levels_bought: { type: "integer", required: true },
      buy_mode: { type: "string", required: true, enum: ["x1", "x10", "to_milestone"] },
      cost_log10: { type: "number", required: true },
      was_bottleneck: { type: "boolean", required: true },
      income_before_log10: { type: "number", required: true },
      income_after_log10: { type: "number", required: true },
    },
  },
  clerk_hire: {
    sampling: "all",
    props: {
      target_type: { type: "string", required: true, enum: ["stream", "stage"] },
      target_id: { type: "string", required: true, enum: ["raporty", "akty", "dovidky", "nakladni", "nakazy", "zvedennia", "zpz", "kombat", "stroy", "fin", "kazna", "narada", "dopovid"] },
      cost_log10: { type: "number", required: true },
      is_first_clerk: { type: "boolean", required: true },
      clerks_count_after: { type: "integer", required: true },
      sec_since_cycle_start: { type: "integer", required: true },
    },
  },
  milestone_reach: {
    sampling: "all",
    props: {
      target_type: { type: "string", required: true, enum: ["stream", "stage"] },
      target_id: { type: "string", required: true, enum: ["raporty", "akty", "dovidky", "nakladni", "nakazy", "zvedennia", "zpz", "kombat", "stroy", "fin", "kazna", "narada", "dopovid"] },
      level: { type: "integer", required: true },
      rate_multiplier: { type: "integer", required: true },
      sec_since_cycle_start: { type: "integer", required: true },
    },
  },
  offline_income_claim: {
    sampling: "all",
    props: {
      away_sec: { type: "integer", required: true },
      storage_cap_sec: { type: "integer", required: true },
      capped_sec: { type: "integer", required: true },
      earned_log10: { type: "number", required: true },
      is_doubled: { type: "boolean", required: true },
      double_source: { type: "string", required: true, enum: ["ad", "no_ads_pass", "none"] },
      claimed_log10: { type: "number", required: true },
      offline_doubles_today: { type: "integer", required: true },
      clerks_count: { type: "integer", required: true },
      gifts_written_off: { type: "integer", required: true },
      fuel_bonus_sec: { type: "integer", required: true },
    },
  },
  generator_refuel: {
    sampling: "all",
    props: {
      tank_pct_before: { type: "integer", required: true },
      tank_capacity_sec: { type: "integer", required: true },
      bonus_off_sec: { type: "integer", required: true },
    },
  },
  telegram_receive: {
    sampling: "all",
    props: {
      telegram_id: { type: "string", required: true },
      is_first_telegram: { type: "boolean", required: true },
      delivery: { type: "string", required: true, enum: ["live", "while_away"] },
      is_scripted: { type: "boolean", required: true },
      is_repeat: { type: "boolean", required: true },
      inbox_unread_after: { type: "integer", required: true },
    },
  },
  telegram_open: {
    sampling: "all",
    props: {
      telegram_id: { type: "string", required: true },
      sec_since_received: { type: "integer", required: true },
      source: { type: "string", required: true, enum: ["inbox", "banner", "push"] },
    },
  },
  telegram_choice_submit: {
    sampling: "all",
    props: {
      telegram_id: { type: "string", required: true },
      choice_id: { type: "string", required: true },
      choice_kind: { type: "string", required: true, enum: ["diligent", "formal_reply", "drawer", "special"] },
      slowdown_target_id: { type: "string", required: false, enum: ["raporty", "akty", "dovidky", "nakladni", "nakazy", "zvedennia", "zpz", "kombat", "stroy", "fin", "kazna", "narada", "dopovid"] },
      slowdown_mult: { type: "number", required: true },
      slowdown_sec: { type: "integer", required: true },
      reputation_delta: { type: "integer", required: true },
      reputation_after: { type: "integer", required: true },
      inspection_chance_pct: { type: "number", required: true },
      paper_spent: { type: "integer", required: true },
      sec_since_open: { type: "integer", required: true },
      pack_id: { type: "string", required: false },
      is_pack_summary: { type: "boolean", required: false },
    },
  },
  telegram_flag: {
    sampling: "all",
    props: {
      telegram_id: { type: "string", required: true },
      is_after_choice: { type: "boolean", required: true },
      reason: { type: "string", required: true, enum: ["hurts_people", "untrue", "offensive", "not_funny", "none"] },
      has_comment: { type: "boolean", required: true },
    },
  },
  curio_entry_share: {
    sampling: "all",
    props: {
      entry_type: { type: "string", required: true, enum: ["telegram", "gift_written_off", "journal", "pack", "stack_meter", "finale_card", "personal_record", "ptashka", "award"] },
      entry_id: { type: "string", required: true },
      gift_type: { type: "string", required: false, enum: ["drone", "shovel", "generator"] },
      share_result: { type: "string", required: true, enum: ["shared", "dismissed"] },
      activity_type: { type: "string", required: false },
    },
  },
  inspection_start: {
    sampling: "all",
    props: {
      inspection_id: { type: "string", required: true },
      inspection_number: { type: "integer", required: true },
      boss_id: { type: "string", required: true, enum: ["brigade_commission", "command_commission", "capital_commission", "total_audit", "digital_commission"] },
      trigger: { type: "string", required: true, enum: ["scheduled", "unscheduled"] },
      warning_sec: { type: "integer", required: true },
      reputation: { type: "integer", required: true },
      items_total: { type: "integer", required: true },
      inspection_kind: { type: "string", required: true, enum: ["regular", "final"] },
      attempt_number: { type: "integer", required: false },
    },
  },
  inspection_item_complete: {
    sampling: "all",
    props: {
      inspection_id: { type: "string", required: true },
      item_id: { type: "string", required: true, enum: ["paint_borders", "lockers_cleanup", "stove_open", "font_check", "journals_stitch", "sergeants_count", "dust_glove", "corridor_tape", "sign_rehang", "orders_stitch", "where_journal", "kazna_kopiyka", "nakazy_open", "minutes_stitch", "door_plates", "carafe_full", "kettles_hide", "summary_check", "summary_beats", "slides_number", "stack_meter", "report_prep", "brief_onepage", "audit_acts", "zpz_level", "print_ejournal", "laptop_glove", "dashboard_font", "act_kep"] },
      method: { type: "string", required: true, enum: ["signatures", "ad", "no_ads_pass", "condition"] },
      cost_log10: { type: "number", required: false },
      sec_to_deadline: { type: "integer", required: true },
    },
  },
  inspection_finish: {
    sampling: "all",
    props: {
      inspection_id: { type: "string", required: true },
      result: { type: "string", required: true, enum: ["passed", "failed"] },
      items_done: { type: "integer", required: true },
      items_total: { type: "integer", required: true },
      is_completed_via_ad: { type: "boolean", required: true },
      is_resolved_offline: { type: "boolean", required: true },
      sec_from_start: { type: "integer", required: true },
      inspection_kind: { type: "string", required: true, enum: ["regular", "final"] },
      is_mechanic_item_done: { type: "boolean", required: false },
      is_level_exit_unlocked: { type: "boolean", required: false },
      zpz_share_pct: { type: "number", required: false },
      is_without_remarks: { type: "boolean", required: true },
      level_id: { type: "string", required: true, enum: ["batalion", "bryhada", "komanduvannia", "henshtab", "bez_paperu"] },
    },
  },
  race_start: {
    sampling: "all",
    props: {
      race_id: { type: "string", required: true },
      gift_type: { type: "string", required: true, enum: ["drone", "shovel", "generator"] },
      doc_sec_required: { type: "integer", required: true },
      resource_sec_left: { type: "integer", required: true },
      is_winnable_without_speedup: { type: "boolean", required: true },
    },
  },
  race_speedup_apply: {
    sampling: "all",
    props: {
      race_id: { type: "string", required: true },
      method: { type: "string", required: true, enum: ["digital_bonus", "ad", "no_ads_pass"] },
      sec_saved: { type: "integer", required: true },
      speedups_count_after: { type: "integer", required: true },
    },
  },
  race_finish: {
    sampling: "all",
    props: {
      race_id: { type: "string", required: true },
      result: { type: "string", required: true, enum: ["success", "fail"] },
      margin_sec: { type: "integer", required: true },
      speedups_count: { type: "integer", required: true },
      is_ad_used: { type: "boolean", required: true },
      is_resolved_offline: { type: "boolean", required: true },
      gift_type: { type: "string", required: true, enum: ["drone", "shovel", "generator"] },
      level_id: { type: "string", required: true, enum: ["batalion", "bryhada", "komanduvannia", "henshtab", "bez_paperu"] },
    },
  },
  random_event_resolve: {
    sampling: "all",
    props: {
      event_type: { type: "string", required: true, enum: ["kombat_missing", "order_cancels_order", "meeting_overrun", "brief_onepage", "sedo_failure"] },
      choice: { type: "string", required: true, enum: ["wait", "send_runner", "redo_documents", "cite_digital", "expired", "send_note", "rewrite", "formal_reply", "print"] },
      sec_to_resolve: { type: "integer", required: true },
      slowdown_sec: { type: "integer", required: true },
    },
  },
  reputation_tier_change: {
    sampling: "all",
    props: {
      from_tier: { type: "string", required: true, enum: ["low", "normal", "high"] },
      to_tier: { type: "string", required: true, enum: ["low", "normal", "high"] },
      reputation: { type: "integer", required: true },
      source: { type: "string", required: true, enum: ["telegram", "random_event"] },
    },
  },
  digitization_hint_show: {
    sampling: "all",
    props: {
      next_purchase_eta_sec: { type: "integer", required: true },
      points_available: { type: "integer", required: true },
      points_total: { type: "integer", required: true },
      is_first_digitization: { type: "boolean", required: true },
      sec_since_cycle_start: { type: "integer", required: true },
    },
  },
  digitization_screen_open: {
    sampling: "all",
    props: {
      source: { type: "string", required: true, enum: ["hint", "tab"] },
      points_available: { type: "integer", required: true },
      is_eligible: { type: "boolean", required: true },
      multiplier_after: { type: "number", required: true },
    },
  },
  digitization_complete: {
    sampling: "all",
    props: {
      digitization_number: { type: "integer", required: true },
      points_gained: { type: "integer", required: true },
      points_total: { type: "integer", required: true },
      prestige_multiplier: { type: "number", required: true },
      lifetime_signatures_log10: { type: "number", required: true },
      sec_since_cycle_start: { type: "integer", required: true },
      sec_since_install: { type: "integer", required: true },
      journals_cancelled: { type: "integer", required: true },
      is_from_hint: { type: "boolean", required: true },
      digital_stages_count: { type: "integer", required: false },
      cycle_sec_previous: { type: "integer", required: false },
    },
  },
  level_advance: {
    sampling: "all",
    props: {
      from_level_id: { type: "string", required: true, enum: ["batalion", "bryhada", "komanduvannia", "henshtab"] },
      to_level_id: { type: "string", required: true, enum: ["bryhada", "komanduvannia", "henshtab", "bez_paperu"] },
      digitization_count: { type: "integer", required: true },
      points_total: { type: "integer", required: true },
      sec_since_install: { type: "integer", required: true },
      final_attempts: { type: "integer", required: false },
    },
  },
  museum_journal_unlock: {
    sampling: "all",
    props: {
      journal_id: { type: "string", required: true },
      rarity: { type: "string", required: true, enum: ["common", "rare", "legendary"] },
      source: { type: "string", required: true, enum: ["digitization", "telegram", "inspection", "random_event", "final_inspection", "conversion", "story", "finale"] },
      journals_owned_after: { type: "integer", required: true },
      is_series_complete: { type: "boolean", required: true },
      series_id: { type: "string", required: true, enum: ["battalion_property", "personnel", "transport_storage", "household", "land"] },
      series_owned_after: { type: "integer", required: true },
      series_complete_count: { type: "integer", required: true },
    },
  },
  museum_open: {
    sampling: "all",
    props: {
      source: { type: "string", required: true, enum: ["tab", "unlock_toast", "award_toast", "profile"] },
      journals_owned: { type: "integer", required: true },
      journals_unseen: { type: "integer", required: true },
      segment: { type: "string", required: true, enum: ["journals", "curios", "awards"] },
    },
  },
  boost_activate: {
    sampling: "all",
    props: {
      boost_type: { type: "string", required: true, enum: ["income_x2", "inspection_x3", "drone_x2", "shovels_x1_5", "generator_fuel_hold"] },
      source: { type: "string", required: true, enum: ["ad", "no_ads_pass", "inspection", "race", "onboarding"] },
      multiplier: { type: "number", required: true },
      duration_sec: { type: "integer", required: true },
      stacked_remaining_sec: { type: "integer", required: true },
      is_capped: { type: "boolean", required: true },
    },
  },
  ad_offer_show: {
    sampling: "all",
    props: {
      placement: { type: "string", required: true, enum: ["income_boost", "offline_double", "race_speedup", "inspection_checklist"] },
      ad_flow_id: { type: "string", required: true },
      is_no_ads_claim: { type: "boolean", required: true },
      is_ad_ready: { type: "boolean", required: true },
      entry_point: { type: "string", required: false, enum: ["boosts_sheet", "shop", "ad_offer_first"] },
      uses_today: { type: "integer", required: true },
      daily_limit: { type: "integer", required: true },
    },
  },
  ad_start: {
    sampling: "all",
    props: {
      placement: { type: "string", required: true, enum: ["income_boost", "offline_double", "race_speedup", "inspection_checklist"] },
      ad_flow_id: { type: "string", required: true },
      load_wait_ms: { type: "integer", required: true },
    },
  },
  ad_complete: {
    sampling: "all",
    props: {
      placement: { type: "string", required: true, enum: ["income_boost", "offline_double", "race_speedup", "inspection_checklist"] },
      ad_flow_id: { type: "string", required: true },
      watch_ms: { type: "integer", required: true },
      ad_value_micros: { type: "integer", required: false },
      ad_value_currency: { type: "string", required: false },
      ad_value_precision: { type: "string", required: false, enum: ["estimated", "publisher_provided", "precise", "unknown"] },
    },
  },
  ad_fail: {
    sampling: "all",
    props: {
      placement: { type: "string", required: true, enum: ["income_boost", "offline_double", "race_speedup", "inspection_checklist"] },
      ad_flow_id: { type: "string", required: true },
      stage: { type: "string", required: true, enum: ["not_ready", "load", "show", "closed_early", "consent_blocked"] },
      error_code: { type: "string", required: false },
      error_domain: { type: "string", required: false },
    },
  },
  ad_reward_grant: {
    sampling: "all",
    props: {
      placement: { type: "string", required: true, enum: ["income_boost", "offline_double", "race_speedup", "inspection_checklist"] },
      ad_flow_id: { type: "string", required: true },
      is_no_ads_claim: { type: "boolean", required: true },
      reward_unit: { type: "string", required: true, enum: ["boost_sec", "signatures_log10", "race_sec", "checklist_items"] },
      reward_amount: { type: "number", required: true },
    },
  },
  ads_consent_update: {
    sampling: "all",
    props: {
      trigger: { type: "string", required: true, enum: ["first_ad_watch", "app_launch", "privacy_settings"] },
      consent_status: { type: "string", required: true, enum: ["obtained", "required", "not_required", "unknown"] },
      is_form_shown: { type: "boolean", required: true },
      is_ads_request_allowed: { type: "boolean", required: true },
      is_privacy_options_required: { type: "boolean", required: true },
    },
  },
  shop_view: {
    sampling: "all",
    props: {
      source: { type: "string", required: true, enum: ["tab", "offline_storage_link", "starter_pack_card", "starter_offer", "ad_limit_reached", "boost_card"] },
      is_starter_pack_available: { type: "boolean", required: true },
    },
  },
  purchase_start: {
    sampling: "all",
    props: {
      product_id: { type: "string", required: true, enum: ["no_ads", "starter_pack", "storage_24h"] },
      price: { type: "number", required: true },
      currency: { type: "string", required: true },
      source: { type: "string", required: true, enum: ["tab", "offline_storage_link", "starter_pack_card", "starter_offer", "ad_limit_reached", "boost_card"] },
    },
  },
  purchase_complete: {
    sampling: "all",
    props: {
      product_id: { type: "string", required: true, enum: ["no_ads", "starter_pack", "storage_24h"] },
      price: { type: "number", required: true },
      currency: { type: "string", required: true },
      source: { type: "string", required: true, enum: ["tab", "offline_storage_link", "starter_pack_card", "starter_offer", "ad_limit_reached", "boost_card"] },
      is_first_purchase: { type: "boolean", required: true },
      purchase_number: { type: "integer", required: true },
      sec_since_install: { type: "integer", required: true },
      store: { type: "string", required: true, enum: ["app_store", "play_store"] },
    },
  },
  purchase_fail: {
    sampling: "all",
    props: {
      product_id: { type: "string", required: true, enum: ["no_ads", "starter_pack", "storage_24h"] },
      price: { type: "number", required: true },
      currency: { type: "string", required: true },
      reason: { type: "string", required: true, enum: ["user_cancelled", "payment_pending", "store_problem", "network", "product_unavailable", "already_owned", "not_allowed", "unknown"] },
      error_code: { type: "string", required: false },
    },
  },
  purchase_restore: {
    sampling: "all",
    props: {
      trigger: { type: "string", required: true, enum: ["shop_button", "settings_button", "auto_check"] },
      is_success: { type: "boolean", required: true },
      restored_product_ids: { type: "array<string>", required: true },
      error_code: { type: "string", required: false },
    },
  },
  push_permission_request: {
    sampling: "all",
    props: {
      trigger: { type: "string", required: true, enum: ["onboarding_session_end", "settings", "storage_full_hint"] },
      pre_prompt_result: { type: "string", required: true, enum: ["accepted", "declined"] },
      os_result: { type: "string", required: true, enum: ["granted", "denied", "provisional", "not_shown"] },
    },
  },
  push_open: {
    sampling: "all",
    props: {
      push_type: { type: "string", required: true, enum: ["storage_full", "telegram_new", "inspection", "inspection_passed", "race_reminder", "race_won", "boost_end", "fuel_bonus_end", "kombat_found", "gift_arrived"] },
      delay_sec: { type: "integer", required: true },
    },
  },
  setting_change: {
    sampling: "all",
    props: {
      setting_name: { type: "string", required: true, enum: ["sound", "haptics", "notif_storage", "notif_telegrams", "notif_inspections", "notif_gifts", "notif_boosts", "analytics", "ads_privacy_options", "progress_reset", "platform_awards"] },
      new_value: { type: "string", required: true },
    },
  },
  app_error_log: {
    sampling: "all",
    props: {
      source: { type: "string", required: true, enum: ["save_load", "save_write", "save_migration", "economy_config", "admob", "ump", "revenuecat", "notifications", "expo_updates", "share_render", "platform_awards"] },
      error_code: { type: "string", required: true },
      is_recovered: { type: "boolean", required: true },
      recovery: { type: "string", required: true, enum: ["backup_slot", "defaults", "retry", "none"] },
      message_short: { type: "string", required: false },
      save_schema_from: { type: "integer", required: false },
      save_schema_to: { type: "integer", required: false },
    },
  },
  telegram_pack_receive: {
    sampling: "all",
    props: {
      pack_id: { type: "string", required: true },
      pack_number: { type: "integer", required: true },
      is_repeat: { type: "boolean", required: true },
      delivery: { type: "string", required: true, enum: ["live", "while_away"] },
    },
  },
  telegram_pack_resolve: {
    sampling: "all",
    props: {
      pack_id: { type: "string", required: true },
      mode: { type: "string", required: true, enum: ["summary", "separate", "mixed"] },
      choice_kind: { type: "string", required: false, enum: ["diligent", "formal_reply", "drawer"] },
      paper_spent: { type: "integer", required: true },
      reputation_delta: { type: "integer", required: true },
      inspection_chance_pct: { type: "number", required: true },
      is_beats: { type: "boolean", required: true },
      sec_since_received: { type: "integer", required: true },
    },
  },
  stack_meter_reach: {
    sampling: "all",
    props: {
      zpz_share_pct: { type: "number", required: true },
      zpz_level: { type: "integer", required: true },
      sec_since_session_start: { type: "integer", required: true },
      offline_share_pct: { type: "number", required: true },
    },
  },
  move_finish: {
    sampling: "all",
    props: {
      boxes_stacked: { type: "integer", required: true },
      boxes_total: { type: "integer", required: true },
      paper_lost: { type: "integer", required: true },
      is_skipped: { type: "boolean", required: true },
    },
  },
  stage_convert: {
    sampling: "all",
    props: {
      stage_id: { type: "string", required: true, enum: ["kombat", "stroy", "fin", "kazna", "narada", "dopovid"] },
      convert_index: { type: "integer", required: true },
      cost_log10: { type: "number", required: true },
      digitizations_on_level: { type: "integer", required: true },
      sec_since_level_start: { type: "integer", required: true },
      sec_since_available: { type: "integer", required: true },
    },
  },
  finale_step_complete: {
    sampling: "all",
    props: {
      step_id: { type: "string", required: true, enum: ["order", "script", "last_book", "call", "credits", "quiet", "endless_offer"] },
      step_index: { type: "integer", required: true },
      sec_since_finale_start: { type: "integer", required: true },
      is_resumed: { type: "boolean", required: true },
      declined_count: { type: "integer", required: false },
    },
  },
  dub_start: {
    sampling: "all",
    props: {
      dub_number: { type: "integer", required: true },
      modifier_id: { type: "string", required: true, enum: ["two_copies", "wet_seal", "no_did"] },
      points_total: { type: "integer", required: true },
      sec_since_finale: { type: "integer", required: true },
      sec_since_offer: { type: "integer", required: true },
    },
  },
  personal_record_update: {
    sampling: "all",
    props: {
      record_type: { type: "string", required: true, enum: ["dub", "lifetime_signatures"] },
      value: { type: "number", required: true },
      previous_value: { type: "number", required: true },
    },
  },
  story_beat_deliver: {
    sampling: "all",
    props: {
      beat_id: { type: "string", required: true },
      arc: { type: "string", required: true, enum: ["who_writes", "archaeologist", "ptashka", "kombat_leave", "cat", "tumbochkin", "transition", "finale"] },
      carrier: { type: "string", required: true, enum: ["telegram", "note", "call", "event_toast", "curio", "scene", "archive_sheet", "share_card", "insp_act_line", "credits_line", "character_state"] },
      beat_order: { type: "integer", required: true },
      delay_sec: { type: "integer", required: true },
      is_catch_up: { type: "boolean", required: true },
      is_while_away: { type: "boolean", required: true },
    },
  },
  archive_sheet_unlock: {
    sampling: "all",
    props: {
      sheet_id: { type: "string", required: true },
      sheet_number: { type: "integer", required: true },
      source: { type: "string", required: true, enum: ["gift", "move", "boss", "conversion", "catch_up"] },
      sheets_owned_after: { type: "integer", required: true },
    },
  },
  archive_open: {
    sampling: "all",
    props: {
      source: { type: "string", required: true, enum: ["museum", "call", "toast"] },
      sheets_owned: { type: "integer", required: true },
    },
  },
  diary_open: {
    sampling: "all",
    props: {
      lines_owned: { type: "integer", required: true },
      lines_unseen: { type: "integer", required: true },
    },
  },
  award_unlock: {
    sampling: "all",
    props: {
      award_id: { type: "string", required: true },
      award_category: { type: "string", required: true, enum: ["progress", "telegrams", "inspections", "race", "museum", "curios", "cat", "clerks", "hidden"] },
      award_type: { type: "string", required: true, enum: ["gramota", "podyaka", "nakaz"] },
      is_hidden: { type: "boolean", required: true },
      awards_owned_after: { type: "integer", required: true },
      is_retroactive: { type: "boolean", required: true },
      is_resolved_offline: { type: "boolean", required: true },
      is_mirrored: { type: "boolean", required: true },
      sec_since_install: { type: "integer", required: true },
    },
  },
  awards_wall_open: {
    sampling: "all",
    props: {
      source: { type: "string", required: true, enum: ["segment", "award_toast", "profile"] },
      awards_owned: { type: "integer", required: true },
      awards_unseen: { type: "integer", required: true },
    },
  },
  award_platform_sync: {
    sampling: "all",
    props: {
      platform: { type: "string", required: true, enum: ["game_center", "play_games"] },
      result: { type: "string", required: true, enum: ["synced", "not_signed_in", "sign_in_cancelled", "disabled", "error"] },
      reported_count: { type: "integer", required: true },
      pending_count: { type: "integer", required: true },
      is_first_sign_in: { type: "boolean", required: true },
    },
  },
};
