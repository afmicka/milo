/**
 * Tax label mapping for mas-ff-defaults feature flag
 * Based on: https://github.com/adobecom/mas/wiki/MAS-Feature-Flags
 * 
 * Structure: [INDIVIDUAL_COM, TEAM_COM, INDIVIDUAL_EDU, TEAM_EDU]
 * Values: tax label string, null (no label), or '-' (no label)
 */
export default {
  // Europe
  'AT_de': ['inkl. MwSt.', 'inkl. MwSt.', 'inkl. MwSt.', 'zzgl. MwSt.'],
  'BE_en': ['incl. VAT', 'excl. VAT', 'incl. VAT', 'excl. VAT'],
  'BE_fr': ['TTC', 'HT', 'TTC', 'HT'],
  'BE_nl': ['incl. btw', 'excl. btw', 'incl. btw', 'excl. btw'],
  'BG_bg': ['вкл. ДДС', 'без ДДС', 'вкл. ДДС', 'без ДДС'],
  'CH_de': ['inkl. MwSt.', 'zzgl. MwSt.', 'inkl. MwSt.', 'zzgl. MwSt.'],
  'CH_fr': ['TTC', 'HT', 'TTC', 'HT'],
  'CH_it': ['incl. IVA', 'escl. IVA.', 'incl. IVA', 'escl. IVA.'],
  'CZ_cs': ['včetně DPH', 'bez DPH', 'včetně DPH', 'bez DPH'],
  'DE_de': ['inkl. MwSt.', 'zzgl. MwSt.', 'inkl. MwSt.', 'zzgl. MwSt.'],
  'DK_da': ['inkl. moms', 'ekskl. moms', 'inkl. moms', 'ekskl. moms'],
  'EE_et': ['käibemaksuga', 'käibemaksuta', 'käibemaksuga', 'käibemaksuta'],
  'ES_es': ['IVA incluido', 'sin IVA', 'IVA incluido', 'sin IVA'],
  'FI_fi': ['sis. ALV:n', 'ilman ALV:tä', 'sis. ALV:n', 'ilman ALV:tä'],
  'FR_fr': ['TTC', 'HT', 'TTC', 'HT'],
  'GB_en': ['incl. VAT', 'excl. VAT', 'incl. VAT', 'excl. VAT'],
  // GB has urlPrefix 'uk' which creates 'UK_en' key
  'UK_en': ['incl. VAT', 'excl. VAT', 'incl. VAT', 'excl. VAT'],
  'GR_el': ['συμπερ. ΦΠΑ', 'εξαιρ. ΦΠΑ', 'συμπερ. ΦΠΑ', 'εξαιρ. ΦΠΑ'],
  'GR_en': ['incl. VAT', 'excl. VAT', 'incl. VAT', 'excl. VAT'],
  'HU_hu': ['áfával', 'áfa nélkül', 'áfával', 'áfa nélkül'],
  'IE_en': ['incl. VAT', 'excl. VAT', 'incl. VAT', 'excl. VAT'],
  'IT_it': ['incl. IVA', 'escl. IVA.', 'incl. IVA', 'escl. IVA.'],
  'LT_lt': ['su PVM', 'be PVM', 'su PVM', null],
  'LU_de': ['inkl. MwSt.', 'zzgl. MwSt.', 'inkl. MwSt.', 'zzgl. MwSt.'],
  'LU_en': ['incl. VAT', 'excl. VAT', 'incl. VAT', 'excl. VAT'],
  'LU_fr': ['TTC', 'HT', 'TTC', 'HT'],
  'LV_lv': ['ar PVN', 'bez PVN', 'ar PVN', null],
  'NL_nl': ['incl. btw', 'excl. btw', 'incl. btw', 'excl. btw'],
  'NO_nb': ['inkl. mva', 'ekskl. mva', 'inkl. mva', 'ekskl. mva'],
  'PL_pl': ['w tym VAT', 'bez VAT', 'w tym VAT', 'bez VAT'],
  'PT_pt': ['IVA incluso', 'IVA não incluso', 'IVA incluso', 'IVA não incluso'],
  'RO_ro': ['cu TVA', 'fără TVA', 'cu TVA', 'fără TVA'],
  'SE_sv': ['inkl. moms', 'exkl. moms', 'inkl. moms', 'exkl. moms'],
  'SI_sl': ['z DDV-jem', 'brez DDV-ja', 'z DDV-jem', 'brez DDV-ja'],
  'SK_sk': ['vrátane DPH', 'bez DPH', 'vrátane DPH', 'bez DPH'],
  'TR_tr': ['KDV dahil', 'KDV hariç', 'KDV dahil', 'KDV hariç'],
  'UA_uk': ['з ПДВ', 'без урахування ПДВ', 'з ПДВ', 'без урахування ПДВ'],

  // Asia Pacific
  'AU_en': ['incl. GST', 'incl. GST', 'incl. GST', 'incl. GST'],
  'ID_en': ['incl. VAT', 'excl. VAT', 'incl. VAT', 'excl. VAT'],
  'ID_id': ['termasuk PPN', 'sebelum PPN', 'termasuk PPN', 'sebelum PPN'],
  'IN_en': ['incl. GST', 'excl. GST', 'incl. GST', 'excl. GST'],
  'IN_hi': ['GST सहित', 'GST अतिरिक्त', 'GST सहित', 'GST अतिरिक्त'],
  'JP_ja': ['税込', '税込', '税込', '税込'],
  'KR_ko': ['부가세 포함', '부가세 별도', null, '부가세 별도'],
  'MY_en': ['incl. SST', 'excl. SST', 'incl. SST', 'excl. SST'],
  'MY_ms': ['termasuk SST', 'SST dikecualikan', 'termasuk SST', 'SST dikecualikan'],
  'NZ_en': ['incl. GST', 'incl. GST', 'incl. GST', 'incl. GST'],
  'SG_en': ['incl. GST', null, 'incl. GST', 'excl. GST'],
  'TH_en': ['incl. VAT', 'incl. VAT', 'incl. VAT', 'incl. VAT'],
  'TH_th': ['รวม VAT', 'รวม VAT', 'รวม VAT', 'รวม VAT'],

  // Middle East & Africa
  'EG_ar': ['بالضريبة', 'باستثناء ضريبة', 'بالضريبة', 'باستثناء ضريبة'],
  'EG_en': ['incl. VAT', 'excl. VAT', 'incl. VAT', 'excl. VAT'],
  'MU_en': ['excl. VAT', 'excl. VAT', 'excl. VAT', 'excl. VAT'],
  'NG_en': ['incl. VAT', 'incl. VAT', null, null],
  'SA_ar': ['بالضريبة', null, 'بالضريبة', null],
  'SA_en': ['incl. VAT', null, 'incl. VAT', null],
  'ZA_en': ['incl. VAT', 'incl. VAT', null, null],

  // Latin America
  'CO_es': [null, 'IVA no incluido', null, null],
  'CR_es': [null, null, null, null],
  'DO_es': [null, null, null, null],
  'EC_es': [null, null, null, null],
  'GT_es': [null, null, null, null],
  'MX_es': [null, null, null, null],
  'PE_es': [null, null, null, null],
  // DO has urlPrefix 'la' which creates 'LA_en' key when parsed
  'LA_en': [null, null, null, null],

  // North America and others - no tax labels by default
  'CA_en': [null, null, null, null],
  'CA_fr': [null, null, null, null],
  'US_en': [null, null, null, null],
  // US has urlPrefix 'pr' which creates 'PR_en' key
  'PR_en': [null, null, null, null],
  'HK_en': [null, null, null, null],
  'HK_zh': [null, null, null, null],
  'TW_zh': [null, null, null, null],

  // Middle East & Africa - no tax labels
  'CY_en': [null, null, null, null],
  'DZ_en': [null, null, null, null],
  'DZ_ar': [null, null, null, null],
  'KW_en': [null, null, null, null],
  'KW_ar': [null, null, null, null],
  'QA_en': [null, null, null, null],
  'QA_ar': [null, null, null, null],

  // Other regions - no tax labels
  'IL_iw': [null, null, null, null],
  'IL_en': [null, null, null, null],
  'IL_he': [null, null, null, null],
  'MT_en': [null, null, null, null],
  'PH_en': [null, null, null, null],
  'PH_fil': [null, null, null, null],
  'RU_ru': [null, null, null, null],
  'TM_en': [null, null, null, null],
  'TM_ru': [null, null, null, null],
  // TM has urlPrefix 'cis_en' and 'cis_ru' which create 'CIS_en' and 'CIS_ru' keys
  'CIS_en': [null, null, null, null],
  'CIS_ru': [null, null, null, null],
  'VN_en': [null, null, null, null],
  'VN_vi': [null, null, null, null],
};
