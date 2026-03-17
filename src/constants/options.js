import membershipTypes from '../data/membership_types.json';

export const DEFAULT_MEMBERSHIP_KEY = 'koberko_default_membership';
export const SAVED_RESULTS_KEY = 'koberko_saved';
export const INTAKE_CONTEXT_KEY = 'koberko_intake_context';
export const CHAT_HISTORY_KEY = 'koberko_chat_history';
export const RECENT_SEARCHES_KEY = 'koberko_recent';

export const MEMBERSHIP_OPTIONS = membershipTypes.map((option) => ({
  ...option,
  code: option.id,
}));

export const HOSPITAL_LEVELS = [
  { code: 'level1', labelKey: 'hospital_level1_label', descriptionKey: 'hospital_level1_desc' },
  { code: 'level2', labelKey: 'hospital_level2_label', descriptionKey: 'hospital_level2_desc' },
  { code: 'level3', labelKey: 'hospital_level3_label', descriptionKey: 'hospital_level3_desc' },
  { code: 'level4', labelKey: 'hospital_level4_label', descriptionKey: 'hospital_level4_desc' },
];

export const PACKAGE_TYPE_KEYS = {
  case_rate: 'package_type_case_rate',
  maternity: 'package_type_maternity',
  dialysis: 'package_type_dialysis',
  hemodialysis: 'package_type_dialysis',
  surgical: 'package_type_surgical',
  newborn: 'package_type_newborn',
  z_benefit: 'package_type_z_benefit',
  tb_dots: 'package_type_tb_dots',
};

export const HOSPITAL_TYPE_OPTIONS = [
  { code: 'DOH', labelKey: 'hospital_type_doh', descriptionKey: 'hospital_type_doh_desc' },
  { code: 'LGU', labelKey: 'hospital_type_lgu', descriptionKey: 'hospital_type_lgu_desc' },
  { code: 'PRIVATE_ACCREDITED', labelKey: 'hospital_type_private', descriptionKey: 'hospital_type_private_desc' },
  { code: 'UNKNOWN', labelKey: 'hospital_type_unknown', descriptionKey: 'hospital_type_unknown_desc' },
];

export const ROOM_TYPE_OPTIONS = [
  { code: 'WARD', labelKey: 'room_type_ward', descriptionKey: 'room_type_ward_desc' },
  { code: 'SEMI_PRIVATE', labelKey: 'room_type_semi_private', descriptionKey: 'room_type_semi_private_desc' },
  { code: 'PRIVATE', labelKey: 'room_type_private', descriptionKey: 'room_type_private_desc' },
  { code: 'UNKNOWN', labelKey: 'room_type_unknown', descriptionKey: 'room_type_unknown_desc' },
];

export function getHospitalLevelNumber(level) {
  return level?.replace('level', '') ?? '';
}

export function getMembershipOptionById(memberType) {
  return MEMBERSHIP_OPTIONS.find((option) => option.id === memberType) ?? null;
}

export function getMembershipLabel(memberType, lang = 'fil') {
  const option = getMembershipOptionById(memberType);
  if (!option) {
    return memberType ?? '';
  }

  return lang === 'en' ? option.label_en : option.label_fil;
}
